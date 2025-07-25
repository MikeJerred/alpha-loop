import { gql, request as gqlRequest } from 'graphql-request';
import { createWalletClient, custom, type EIP1193Provider } from 'viem';
import { chains, isDefined } from '$lib/core';

const validChains = [
  chains.base,
  chains.mainnet,
];

const query = gql`query Positions($address: String!, $chainId: Int) {
  userByAddress(address: $address, chainId: $chainId) {
    marketPositions {
      state  {
        borrowAssets
        borrowAssetsUsd
        collateralUsd
        collateral
      }
      market {
        collateralAsset {
          address
          name
          symbol
        }
        loanAsset {
          address
          name
          symbol
        }
      }
    }
  }
}`;

type Results = {
  userByAddress: {
    marketPositions: {
      state: {
        borrowAssets: number,
        borrowAssetsUsd: number,
        collateral: number,
        collateralUsd: number,
      },
      market: {
        collateralAsset: {
          address: string,
          name: string,
          symbol: string,
        },
        loanAsset : {
          address: string,
          name: string,
          symbol: string,
        },
      },
    }[],
  },
};

export const getMorphoPositions = async (ethereum: EIP1193Provider) => {
  const results = await Promise.all(validChains.map(async ([chain]) => {
    const walletClient = createWalletClient({
      chain,
      transport: custom(ethereum),
    });
    const [address] = await walletClient.requestAddresses();

    const data = await gqlRequest<Results>('https://blue-api.morpho.org/graphql', query, { address, chainId: chain.id })
        .catch(() => null);

    if (!data) return null;

    return [
      chain.id,
      data.userByAddress.marketPositions,
    ] as const;
  }));

  return results.filter(isDefined).map(([chainId, marketPositions]) => ({
      chainId,
      provider: 'morpho' as const,
      supplied: marketPositions
        .filter(position => position.state.collateral > 0)
        .map(position => ({
          address: position.market.collateralAsset.address,
          symbol: position.market.collateralAsset.symbol,
          amount: position.state.collateral / 10**18,
          usdValue: position.state.collateralUsd,
        })),
      borrowed: marketPositions
        .filter(position => position.state.borrowAssets > 0)
        .map(position => ({
          address: position.market.loanAsset.address,
          symbol: position.market.loanAsset.symbol,
          amount: position.state.borrowAssets / 10**18,
          usdValue: position.state.borrowAssetsUsd,
        })),
      total: marketPositions.reduce((total, position) => total + position.state.collateralUsd - position.state.borrowAssetsUsd, 0),
  }));
};
