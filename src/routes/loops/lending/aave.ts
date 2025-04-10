import {
  AaveV3Arbitrum,
  AaveV3Base,
  AaveV3Ethereum,
  AaveV3EthereumEtherFi,
  AaveV3EthereumLido,
  AaveV3Scroll,
  AaveV3ZkSync,
} from '@bgd-labs/aave-address-book';
import { createPublicClient, getContract, http } from 'viem';
import { arbitrum, base, mainnet, scroll, zksync } from 'viem/chains';
import { IUiPoolDataProvider_ABI } from '$lib/abi/IUiPoolDataProvider';
import { isCorrelated, toChainId, type Chain, type YieldLoop } from '../utils';

const providersMap = {
  ethereum: [AaveV3Ethereum, AaveV3EthereumEtherFi, AaveV3EthereumLido],
  arbitrum: [AaveV3Arbitrum],
  base: [AaveV3Base],
  scroll: [AaveV3Scroll],
  zksync: [AaveV3ZkSync],
} as const;

export async function searchAave(chainsInput: readonly Chain[]): Promise<YieldLoop[]> {
  const validChains = Object.keys(providersMap) as (keyof typeof providersMap)[];
  const chains = validChains.filter(chain => chainsInput.includes(chain));

  const results: YieldLoop[] = [];

  for (const chain of chains) {
    const client = createPublicClient({
      chain: getViemChain(chain),
      transport: http()
    });

    for (const provider of providersMap[chain]) {
      const uiPoolDataProvider = getContract({
        address: provider.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        client,
      });

      const [reserves, referenceCurrency] = await uiPoolDataProvider.read.getReservesData([provider.POOL_ADDRESSES_PROVIDER]);
      const eModes = await uiPoolDataProvider.read.getEModes([provider.POOL_ADDRESSES_PROVIDER]);

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

          // allow for 3% price drop
          let ltv = Math.min(
            Number(supplyAsset.baseLTVasCollateral) / 10000,
            0.97 * Number(supplyAsset.reserveLiquidationThreshold) / 10000,
          );

          const validEModes = eModes.filter(eMode =>
            getBit(eMode.eMode.collateralBitmap, supplyIndex) &&
            getBit(eMode.eMode.borrowableBitmap, borrowIndex)
          );
          if (validEModes.length > 0) {
            ltv = Math.max(ltv, ...validEModes.map(eMode => Math.min(eMode.eMode.ltv, 0.97 * eMode.eMode.liquidationThreshold) / 10000))
          }

          const chainId = toChainId(chain);
          const supplyAPRs = (await getYieldApr(supplyAsset.underlyingAsset, provider.POOL_ADDRESSES_PROVIDER, chainId))?.supply;
          const borrowAPRs = (await getYieldApr(borrowAsset.underlyingAsset, provider.POOL_ADDRESSES_PROVIDER, chainId))?.borrow;

          if (!borrowAPRs) continue;

          results.push({
            protocol: 'aave',
            chainId,
            loanAsset: {
              address: borrowAsset.underlyingAsset,
              symbol: borrowAsset.symbol,
            },
            collateralAsset: {
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
            link: `https://app.aave.com/`,
          });
        }
      }
    }
  }

  return results;
}

function getViemChain(chain: Chain) {
  switch (chain) {
    case 'arbitrum': return arbitrum;
    case 'base': return base;
    case 'ethereum': return mainnet;
    case 'scroll': return scroll;
    case 'zksync': return zksync;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
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
  const res = await fetch(`https://aave-api-v2.aave.com/data/rates-history?reserveId=${id}&from=${timestamp}&resolutionInHours=24`);
  const data = await res.json() as { liquidityRate_avg: number, variableBorrowRate_avg: number }[];
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
