import { gql } from 'graphql-request';
import { chains, toFilteredChainIds, type ChainId, type ChainName } from '$lib/core/chains';
import { graphQlCached } from '$lib/server/cache';
import { apyToApr } from '$lib/core/utils';
import { type YieldLoop } from '../utils';

type Item = {
  loanAsset: {
    address: string,
    symbol: string,
  },
  collateralAsset: {
    address: string,
    symbol: string,
  },
  lltv: string,
  state: {
    liquidityAssetsUsd: string,
    dailyBorrowApy: number,
    weeklyBorrowApy: number,
    monthlyBorrowApy: number,
    quarterlyBorrowApy: number,
    yearlyBorrowApy: number,
  },
  morphoBlue: {
    chain: { id: number },
  },
  uniqueKey: string,
};

type Results = {
  markets: {
    items: Item[],
    pageInfo: {
      countTotal: number,
      count:number,
      limit: number,
      skip: number,
    },
  },
};

export async function searchMorpho(chainsInput: readonly ChainName[], depeg: number): Promise<YieldLoop[]> {
  const query = gql`query Markets($skip: Int) {
    markets(first: 1000, skip: $skip) {
      pageInfo {
        countTotal
        count
        limit
        skip
      }
      items {
        loanAsset {
          address
          symbol
        }
        collateralAsset {
          address
          symbol
        }
        uniqueKey
        lltv
        state {
          liquidityAssetsUsd
          dailyBorrowApy
          weeklyBorrowApy
          monthlyBorrowApy
          quarterlyBorrowApy
          yearlyBorrowApy
        }
        morphoBlue {
          chain {
            id
          }
        }
      }
    }
  }`;

  const results: Item[] = [];

  let page = 0;
  while (true) {
    const batch = await graphQlCached<Results>(
      `https://blue-api.morpho.org/graphql : skip=${page * 1000}`,
      'https://blue-api.morpho.org/graphql',
      query,
      { skip: page * 1000 },
    );

    results.push(...batch.markets.items);
    page++;

    if (batch.markets.pageInfo.count < 1000) break;
  };

  const chainIds: number[] = toFilteredChainIds(chainsInput, ['mainnet', 'base']);

  return results
    .filter(item => item.collateralAsset && item.loanAsset && item.lltv && item.morphoBlue?.chain && item.state)
    .filter(item => chainIds.includes(item.morphoBlue.chain.id))
    .map(item => ({
      protocol: 'morpho',
      chainId: item.morphoBlue.chain.id as ChainId,
      borrowAsset: {
        address: item.loanAsset.address,
        symbol: item.loanAsset.symbol,
      },
      supplyAsset: {
        address: item.collateralAsset.address,
        symbol: item.collateralAsset.symbol,
      },
      supplyApr: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0,
      },
      borrowApr: {
        daily: apyToApr(item.state.dailyBorrowApy),
        weekly: apyToApr(item.state.weeklyBorrowApy),
        monthly: apyToApr(item.state.monthlyBorrowApy),
        yearly: apyToApr(item.state.yearlyBorrowApy),
      },
      liquidityUSD: typeof item.state.liquidityAssetsUsd === 'string'
        ? Number(BigInt(item.state.liquidityAssetsUsd) / 10n**18n)
        : item.state.liquidityAssetsUsd,
      ltv: depeg * Number(BigInt(item.lltv) / 10n**10n) / 10**8,
      link: `https://app.morpho.org/${getChainForUrl(item.morphoBlue.chain.id)}/market/${item.uniqueKey}`,
    }));
}

const getChainForUrl = (id: number) => id === chains.mainnet.id ? 'ethereum'
  : id === chains.base.id ? 'base'
  : null;
