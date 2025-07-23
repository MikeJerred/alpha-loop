<script lang="ts">
  import {
    AaveV3Arbitrum,
    AaveV3Base,
    AaveV3Ethereum,
    AaveV3EthereumEtherFi,
    AaveV3EthereumLido,
    AaveV3Scroll,
    AaveV3ZkSync,
  } from '@bgd-labs/aave-address-book';
  import { IAaveOracle_ABI } from '@bgd-labs/aave-address-book/abis';
  import { onMount } from 'svelte';
  import { createPublicClient, createWalletClient, custom, erc20Abi, fallback, getContract, http } from 'viem';
  import { arbitrum, base, mainnet, scroll, zksync } from 'viem/chains';
  import { IUiPoolDataProvider_ABI } from '$lib/abi/AaveUiPoolDataProvider';
  import ChainIcon from '$lib/client/ChainIcon.svelte';
  import Currency from '$lib/client/Currency.svelte';
  import { chains, isDefined } from '$lib/core';

  let view: 'error' | 'loading' | 'normal' = 'loading';

  type TokenDetails = {
    address: `0x${string}`;
    symbol: string;
    amount: number;
    usdValue: number;
  };

  let displayData: {
    chainId: number;
    provider: string;
    supplied: TokenDetails[];
    borrowed: TokenDetails[];
  }[] = [];

  const providers = {
    mainnet: [AaveV3Ethereum, chains.mainnet],
    etherfi: [AaveV3EthereumEtherFi, chains.mainnet],
    lido: [AaveV3EthereumLido, chains.mainnet],
    arbitrum: [AaveV3Arbitrum, chains.arbitrum],
    base: [AaveV3Base, chains.base],
    scroll: [AaveV3Scroll, chains.scroll],
    zksync: [AaveV3ZkSync, chains.zksync],
  } as const;

  onMount(async () => {
    if (!window.ethereum) {
      view = 'error';
      return;
    }

    const walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum),
    });

    const [userAddress] = await walletClient.requestAddresses();

    const results = await Promise.all(Object.entries(providers).map(async ([name, [provider, [chain, rpcUrls]]]) => {
      const client = createPublicClient({
        chain,
        transport: fallback(rpcUrls.map(url => http(url))),
      });

      const pool = getContract({
        abi: IUiPoolDataProvider_ABI,
        address: provider.UI_POOL_DATA_PROVIDER,
        client,
      });

      const [reserves] = await pool.read.getUserReservesData([provider.POOL_ADDRESSES_PROVIDER, userAddress]);

      const data = await Promise.all(reserves
        .filter(reserve => reserve.scaledATokenBalance > 0 || reserve.scaledVariableDebt > 0)
        .map(async reserve => {
          const assetData = Object.entries(provider.ASSETS).find(([, asset]) =>
            asset.UNDERLYING?.toLowerCase() === reserve.underlyingAsset.toLowerCase()
          );
          if (!assetData) return null;

          const [symbol, asset] = assetData;

          // const symbol = await client.readContract({
          //   abi: erc20Abi,
          //   address: reserve.underlyingAsset,
          //   functionName: 'symbol'
          // });

          const price = await client.readContract({
            abi: IAaveOracle_ABI,
            address: provider.ORACLE,
            functionName: 'getAssetPrice',
            args: [asset.UNDERLYING],
          });
          
          return { ...reserve, symbol, price };
        })
      );

      return [name, chain.id, data] as const;
    }));

    displayData = results
      .filter(([, , data]) => data.length > 0)
      .map(([provider, chainId, data]) => ({
        chainId,
        provider,
        supplied: data
          .filter(isDefined)
          .filter(x => x.scaledATokenBalance > 0n)
          .sort()
          .map(x => ({
            address: x.underlyingAsset,
            symbol: x.symbol,
            amount: Number(x.scaledATokenBalance / 10n**10n) / 10**8,
            usdValue: Number(x.price * x.scaledATokenBalance / 10n**18n) / 10**8,
          })),
        borrowed: data
          .filter(isDefined)
          .filter(x => x.scaledVariableDebt > 0n)
          .sort()
          .map(x => ({
            address: x.underlyingAsset,
            symbol: x.symbol,
            amount: Number(x.scaledVariableDebt / 10n**10n) / 10**8,
            usdValue: Number(x.price * x.scaledVariableDebt / 10n**18n) / 10**8,
          })),
      }));

    view = 'normal';
  });
</script>

{view}

<ul>
  {#each displayData as { chainId, provider, supplied, borrowed }}
    <li>
      <ChainIcon id={chainId} />
      <span class="capitalize">{provider}</span>

      <div class="grid grid-cols-3">
        <div>Supplied</div>
        <div>Balance</div>
        <div>USD Value</div>

        {#each supplied as { address, symbol, amount, usdValue }}
          <div title={address}>{symbol}</div>
          <div>{amount}</div>
          <div><Currency value={usdValue} /></div>
        {/each}
      </div>

      {#if borrowed.length > 0}
        <div class="grid grid-cols-3">
          <div>Borrowed</div>
          <div>Balance</div>
          <div>USD Value</div>

          {#each borrowed as { address, symbol, amount, usdValue }}
            <div title={address}>{symbol}</div>
            <div>{amount}</div>
            <div><Currency value={usdValue} /></div>
          {/each}
        </div>
      {/if}
    </li>
  {/each}
</ul>

