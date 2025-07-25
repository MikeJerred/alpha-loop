import {
  AaveV3Arbitrum,
  AaveV3Base,
  AaveV3Ethereum,
  AaveV3EthereumEtherFi,
  AaveV3EthereumLido,
  AaveV3Scroll,
  AaveV3ZkSync,
} from '@bgd-labs/aave-address-book';
import { createPublicClient, createWalletClient, custom, fallback, getContract, http, type EIP1193Provider } from 'viem';
import { IUiPoolDataProvider_ABI } from '$lib/abi/AaveUiPoolDataProvider';
import { chains, isDefined } from '$lib/core';

const providers = {
  mainnet: [AaveV3Ethereum, chains.mainnet],
  etherfi: [AaveV3EthereumEtherFi, chains.mainnet],
  lido: [AaveV3EthereumLido, chains.mainnet],
  arbitrum: [AaveV3Arbitrum, chains.arbitrum],
  base: [AaveV3Base, chains.base],
  scroll: [AaveV3Scroll, chains.scroll],
  zksync: [AaveV3ZkSync, chains.zksync],
} as const;

export const getAavePositions = async (ethereum: EIP1193Provider) => {
  const results = await Promise.all(Object.entries(providers).map(async ([name, [provider, [chain, rpcUrls]]]) => {
    const walletClient = createWalletClient({
      chain,
      transport: custom(ethereum),
    });
    const [userAddress] = await walletClient.requestAddresses();

    const client = createPublicClient({
      chain,
      transport: fallback(rpcUrls.map(url => http(url))),
    });

    const pool = getContract({
      abi: IUiPoolDataProvider_ABI,
      address: provider.UI_POOL_DATA_PROVIDER,
      client,
    });

    const [reservesData, baseCurrency] = await pool.read.getReservesData([provider.POOL_ADDRESSES_PROVIDER]);
    const assetsData = Object.fromEntries(reservesData.map(x => [x.underlyingAsset.toLowerCase(), x]));

    const [reserves] = await pool.read.getUserReservesData([provider.POOL_ADDRESSES_PROVIDER, userAddress]);

    const data = await Promise.all(reserves
      .filter(reserve => reserve.scaledATokenBalance > 0 || reserve.scaledVariableDebt > 0)
      .map(async reserve => {
        const assetData = assetsData[reserve.underlyingAsset.toLowerCase()];
        if (!assetData) return null;
        
        return {
          ...reserve,
          symbol: assetData.symbol,
          price: assetData.priceInMarketReferenceCurrency * baseCurrency.marketReferenceCurrencyPriceInUsd,
          liquidityIndex: assetData.liquidityIndex,
          borrowIndex: assetData.variableBorrowIndex,
        };
      })
    );

    return [name, chain.id, data] as const;
  }));

  return results
    .filter(([, , data]) => data.length > 0)
    .map(([provider, chainId, data]) => {
      const supplied = data
        .filter(isDefined)
        .filter(x => x.scaledATokenBalance > 0n)
        .sort()
        .map(x => ({
          address: x.underlyingAsset,
          symbol: x.symbol,
          amount: Number((x.scaledATokenBalance * x.liquidityIndex / 10n**27n)
            / 10n**10n
          ) / 10**8,
          usdValue: Number((x.scaledATokenBalance * x.liquidityIndex / 10n**27n)
            * x.price / 10n**18n
            / 10n**8n
          ) / 10**8,
        }));
      const borrowed = data
        .filter(isDefined)
        .filter(x => x.scaledVariableDebt > 0n)
        .sort()
        .map(x => ({
          address: x.underlyingAsset,
          symbol: x.symbol,
          amount: Number((x.scaledVariableDebt * x.borrowIndex / 10n**27n)
            / 10n**10n
          ) / 10**8,
          usdValue: Number((x.scaledVariableDebt * x.borrowIndex / 10n**27n)
            * x.price / 10n**18n
            / 10n**8n
          ) / 10**8,
        }));

      return {
        chainId,
        provider: 'aave' as const,
        supplied,
        borrowed,
        total: supplied.reduce((total, { usdValue }) => total + usdValue, 0)
          - borrowed.reduce((total, { usdValue }) => total + usdValue, 0),
      };
    });
};
