import { erc20Abi } from 'viem';
import { CompoundCometABI } from '$lib/abi/CompoundComet';
import { chains, getChainName, toFilteredChainIds, type ChainId, type ChainName } from '$lib/core/chains';
import { fetchCached, readContractCached } from '$lib/server/cache';
import { type YieldLoop } from '../utils';

type Data = {
  chain_id: number,
  comet: {
    address: `0x${string}`
  },
  borrow_apr: string,
  supply_apr: string,
  total_borrow_value: string,
  total_supply_value: string,
  total_collateral_value: string,
  utilization: string,
  base_usd_price: string,
  collateral_asset_symbols: string[],
  timestamp: number,
  date: string,
};

const erc20Symbols = new Map<`0x${string}`, string>();
// from: https://docs.compound.finance/helper-functions/#get-asset-info-by-address
const compoundCollateralFactorScale = 1000000000000000000n;

export async function searchCompound(chainNames: readonly ChainName[], depeg: number): Promise<YieldLoop[]> {
  const chainIds = toFilteredChainIds(chainNames, ['mainnet', 'arbitrum', 'base', 'linea', 'mantle', 'optimism', 'polygon', 'scroll']);

  const url = 'https://v3-api.compound.finance/market/all-networks/all-contracts/historical/summary';
  const data = await fetchCached<Data[]>(url);
  const filteredData = data.filter(({ chain_id }) => (chainIds as number[]).includes(chain_id));

  const results = await Promise.all(Map.groupBy(filteredData, ({ comet }) => comet.address)
    .entries()
    .map(async ([cometAddress, items]) => {
      const chainId = items[0].chain_id as ChainId;
      const chainName = getChainName(chainId);

      items.sort((a, b) => a.timestamp - b.timestamp);
      const dailyApr = Number(items[0].borrow_apr);
      const weeklyApr = items.length >= 7
        ? items.slice(0, 7).reduce((total, item) => total + Number(item.borrow_apr), 0) / 7
        : items.reduce((total, item) => total + Number(item.borrow_apr), 0) / items.length;
      const monthlyApr = items.length >= 30
        ? items.slice(0, 30).reduce((total, item) => total + Number(item.borrow_apr), 0) / 30
        : items.reduce((total, item) => total + Number(item.borrow_apr), 0) / items.length;
      const yearlyApr = items.length >= 365
        ? items.slice(0, 365).reduce((total, item) => total + Number(item.borrow_apr), 0) / 365
        : items.reduce((total, item) => total + Number(item.borrow_apr), 0) / items.length;
      const liquidityUSD = (Number(items[0].total_supply_value) - Number(items[0].total_borrow_value)) * Number(items[0].base_usd_price);

      const borrowTokenAddress = await readContractCached(chainName, cometAddress, CompoundCometABI, 'baseToken');
      let borrowTokenSymbol = erc20Symbols.get(borrowTokenAddress);
      if (!borrowTokenSymbol) {
        borrowTokenSymbol = await readContractCached(chainName, borrowTokenAddress, erc20Abi, 'symbol');
        erc20Symbols.set(borrowTokenAddress, borrowTokenSymbol);
      }

      const assetCount = await readContractCached(chainName, cometAddress, CompoundCometABI, 'numAssets');
      const supplyAssets = await Promise.all(new Array(assetCount).keys().map(async i => {
        const assetInfo = await readContractCached(chainName, cometAddress, CompoundCometABI, 'getAssetInfo', [i]);

        const supplyTokenAddress = assetInfo.asset;
        let supplyTokenSymbol = erc20Symbols.get(supplyTokenAddress);
        if (!supplyTokenSymbol) {
          supplyTokenSymbol = await readContractCached(chainName, supplyTokenAddress, erc20Abi, 'symbol');
          erc20Symbols.set(supplyTokenAddress, supplyTokenSymbol);
        }

        return {
          address: assetInfo.asset,
          symbol: supplyTokenSymbol,
          ltv: Number(1000n * assetInfo.borrowCollateralFactor / compoundCollateralFactorScale) / 1000,
          lltv: Number(1000n * assetInfo.liquidationFactor / compoundCollateralFactorScale) / 1000,
        };
      }));

      return supplyAssets.map(supplyAsset => ({
        protocol: 'compound',
        chainId: chainId,
        borrowAsset: {
          address: borrowTokenAddress,
          symbol: borrowTokenSymbol,
        },
        supplyAsset,
        borrowApr: {
          daily: dailyApr,
          weekly: weeklyApr,
          monthly: monthlyApr,
          yearly: yearlyApr,
        },
        supplyApr: {
          daily: 0,
          weekly: 0,
          monthly: 0,
          yearly: 0,
        },
        liquidityUSD,
        ltv: Math.min(supplyAsset.ltv, supplyAsset.lltv * depeg),
        link: `https://app.compound.finance/markets/${borrowTokenSymbol}-${getChainForUrl(chainId)}`
      } as YieldLoop));
    }));

  return results.flat();
}

function getChainForUrl(id: number) {
  switch (id) {
    case chains.mainnet.id: return 'mainnet';
    case chains.optimism.id: return 'op';
    case chains.polygon.id: return 'polygon';
    case chains.mantle.id: return 'mantle';
    case chains.base.id: return 'basemainnet';
    case chains.arbitrum.id: return 'arb';
    case chains.linea.id: return 'linea';
    case chains.scroll.id: return 'scroll';
    default: return null;
  }
}
