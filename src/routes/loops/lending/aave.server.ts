import {
  AaveV3Arbitrum,
  AaveV3Base,
  AaveV3Ethereum,
  AaveV3EthereumEtherFi,
  AaveV3EthereumLido,
  AaveV3Scroll,
  AaveV3ZkSync,
} from '@bgd-labs/aave-address-book';
import { IUiPoolDataProvider_ABI } from '$lib/abi/AaveUiPoolDataProvider';
import { getChainId, type ChainName } from '$lib/core/chains';
import { fetchCached, readContractCached } from '$lib/server/cache';
import { isCorrelated, type YieldLoop } from '../utils';

const providersMap = {
  mainnet: [
    ['mainnet', AaveV3Ethereum],
    ['etherfi', AaveV3EthereumEtherFi],
    ['lido', AaveV3EthereumLido],
  ],
  arbitrum: [['arbitrum', AaveV3Arbitrum]],
  base: [['base', AaveV3Base]],
  scroll: [['scroll', AaveV3Scroll]],
  zksync: [['zksync', AaveV3ZkSync]],
} as const;

export async function searchAave(chainsInput: readonly ChainName[], depeg: number): Promise<YieldLoop[]> {
  const validChains = Object.keys(providersMap) as (keyof typeof providersMap)[];
  const chains = validChains.filter(name => chainsInput.includes(name));

  const results: YieldLoop[] = [];

  for (const chain of chains) {
    for (const [providerKey, provider] of providersMap[chain]) {
      const [reserves, referenceCurrency] = await readContractCached(
        chain,
        provider.UI_POOL_DATA_PROVIDER,
        IUiPoolDataProvider_ABI,
        'getReservesData',
        [provider.POOL_ADDRESSES_PROVIDER],
      );

      const eModes = await readContractCached(
        chain,
        provider.UI_POOL_DATA_PROVIDER,
        IUiPoolDataProvider_ABI,
        'getEModes',
        [provider.POOL_ADDRESSES_PROVIDER],
      );

      for (const [supplyIndex, supplyAsset] of reserves.entries()) {
        if (!supplyAsset.symbol || !supplyAsset.isActive || supplyAsset.isFrozen || supplyAsset.isPaused) continue;

        for (const [borrowIndex, borrowAsset] of reserves.entries()) {
          if (!borrowAsset.symbol || !borrowAsset.isActive || borrowAsset.isFrozen || borrowAsset.isPaused) continue;
          if (supplyAsset === borrowAsset || !borrowAsset.borrowingEnabled) continue;

          if (
            (!isCorrelated(supplyAsset.symbol, 'btc') || !isCorrelated(borrowAsset.symbol, 'btc')) &&
            (!isCorrelated(supplyAsset.symbol, 'eth') || !isCorrelated(borrowAsset.symbol, 'eth')) &&
            (!isCorrelated(supplyAsset.symbol, 'usd') || !isCorrelated(borrowAsset.symbol, 'usd'))
          ) {
            continue;
          }

          let ltv = Math.min(
            Number(supplyAsset.baseLTVasCollateral) / 10000,
            depeg * Number(supplyAsset.reserveLiquidationThreshold) / 10000,
          );

          const validEModes = eModes.filter(eMode =>
            getBit(eMode.eMode.collateralBitmap, supplyIndex) &&
            getBit(eMode.eMode.borrowableBitmap, borrowIndex)
          );
          if (validEModes.length > 0) {
            ltv = Math.max(ltv, ...validEModes.map(eMode => Math.min(eMode.eMode.ltv, depeg * eMode.eMode.liquidationThreshold) / 10000))
          }

          const chainId = getChainId(chain);
          const supplyAPRs = (await getYieldApr(supplyAsset.underlyingAsset, provider.POOL_ADDRESSES_PROVIDER, chainId))?.supply;
          const borrowAPRs = (await getYieldApr(borrowAsset.underlyingAsset, provider.POOL_ADDRESSES_PROVIDER, chainId))?.borrow;

          if (!borrowAPRs) continue;

          results.push({
            protocol: 'aave',
            chainId,
            borrowAsset: {
              address: borrowAsset.underlyingAsset,
              symbol: borrowAsset.symbol,
            },
            supplyAsset: {
              address: supplyAsset.underlyingAsset,
              symbol: supplyAsset.symbol,
            },
            supplyApr: {
              daily: supplyAPRs?.daily ?? 0,
              weekly: supplyAPRs?.weekly ?? 0,
              monthly: supplyAPRs?.monthly ?? 0,
              yearly: 12 * (supplyAPRs?.monthly ?? 0),
            },
            borrowApr: {
              daily: borrowAPRs?.daily ?? 0,
              weekly: borrowAPRs?.weekly ?? 0,
              monthly: borrowAPRs?.monthly ?? 0,
              yearly: 12 * (borrowAPRs?.monthly ?? 0),
            },
            liquidityUSD: Number(
              (borrowAsset.priceInMarketReferenceCurrency / referenceCurrency.marketReferenceCurrencyPriceInUsd) *
              borrowAsset.availableLiquidity / (10n ** borrowAsset.decimals)
            ),
            ltv,
            link: `https://app.aave.com/reserve-overview/?underlyingAsset=${borrowAsset.underlyingAsset.toLowerCase()}&marketName=proto_${providerKey}_v3`,
          });
        }
      }
    }
  }

  return results;
}

type YieldCacheItem = {
  timestamp: number,
  supply?: {
    daily: number,
    weekly: number,
    monthly: number,
  },
  borrow?: {
    daily: number,
    weekly: number,
    monthly: number,
  },
};

const yieldCacheExpiry = 6*60*60*1000; // 6 hours
const yieldCache = new Map<string, YieldCacheItem>();

const average = (array: number[]) => array.reduce((value, total) => total + value) / array.length;

async function getYieldApr(tokenAddress: `0x${string}`, poolAddressesProvider: `0x${string}`, chainId: number) {
  const id = `${tokenAddress}${poolAddressesProvider}${chainId}`;

  const cached = yieldCache.get(id);
  if (cached) {
    if (Date.now() < cached.timestamp + yieldCacheExpiry) {
      return cached.supply ? cached : null;
    }
  }

  const timestamp = Math.floor(Date.now() / 1000) - 30*24*60*60;
  const data = await fetchCached<{ liquidityRate_avg: number, variableBorrowRate_avg: number }[]>(
    `https://aave-api-v2.aave.com/data/rates-history?reserveId=${id}`,
    `https://aave-api-v2.aave.com/data/rates-history?reserveId=${id}&from=${timestamp}&resolutionInHours=24`,
  );
  if (!data || data.length === 0) {
    yieldCache.set(id, { timestamp: Date.now() });
    return null;
  }

  const result = {
    timestamp: Date.now(),
    supply: {
      daily: average(data.map(x => x.liquidityRate_avg).slice(-1)),
      weekly: average(data.map(x => x.liquidityRate_avg).slice(-7)),
      monthly: average(data.map(x => x.liquidityRate_avg).slice(-30)),
    },
    borrow: {
      daily: average(data.map(x => x.variableBorrowRate_avg).slice(-1)),
      weekly: average(data.map(x => x.variableBorrowRate_avg).slice(-7)),
      monthly: average(data.map(x => x.variableBorrowRate_avg).slice(-30)),
    },
  };

  yieldCache.set(id, result);

  return result;
}

function getBit(bitmap: bigint, bit: number) {
  const mask = 0b1n << BigInt(bit);
  return Boolean(bitmap & mask);
}
