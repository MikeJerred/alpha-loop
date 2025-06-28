import { chains, toFilteredChainIds, type ChainId, type ChainName } from '$lib/core/chains';
import { fetchCached } from '$lib/server/cache';
import { apyToApr } from '$lib/core/utils';
import { type YieldLoop } from '../utils';

type Results = {
  data: {
    markets: {
      items: {
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
      }[],
      pageInfo: {
        countTotal: number,
        count:number,
        limit: number,
        skip: number,
      },
    },
  },
};

export async function searchMorpho(chainsInput: readonly ChainName[], depeg: number): Promise<YieldLoop[]> {
  const query = `query ($where: MarketFilters) {
    markets(first: 5000, where: $where) {
      items {
        loanAsset {
          address
          symbol
        }
        collateralAsset {
          address
          symbol
        }
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
        uniqueKey
      }
      pageInfo {
        countTotal
        count
        limit
        skip
      }
    }
  }`;

  const variables = {
    where: {
      chainId_in: [chains.mainnet.id, chains.base.id],
    },
  };

  const results = await fetchCached<Results>(
    `https://blue-api.morpho.org/graphql`,
    'https://blue-api.morpho.org/graphql',
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    },
  );

  const chainIds: number[] = toFilteredChainIds(chainsInput, ['mainnet', 'base']);

  return results.data.markets.items
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
