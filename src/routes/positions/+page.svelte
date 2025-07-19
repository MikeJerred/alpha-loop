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
  import { onMount } from 'svelte';
  import { createPublicClient, createWalletClient, custom, getContract, http } from 'viem';
  import { arbitrum, mainnet, zksync } from 'viem/chains';
  import { IUiPoolDataProvider_ABI } from '$lib/abi/AaveUiPoolDataProvider';
  import { chains } from '$lib/core';

  let view: 'error' | 'loading' | 'normal' = 'loading';
  let displayData: any;

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

    const chains = [zksync];

    const stuff = await Promise.all(chains.map(async chain => {
      const client = createPublicClient({ chain, transport: http() });

      const pool = getContract({
        abi: IUiPoolDataProvider_ABI,
        address: AaveV3ZkSync.UI_POOL_DATA_PROVIDER,
        client,
      });

      const [data] = await pool.read.getUserReservesData([AaveV3ZkSync.POOL_ADDRESSES_PROVIDER, userAddress]);
      return [chain.id, data] as const;
    }));


    displayData = stuff.flat();



    view = 'normal';
  });


  // display positions held by the currently connected wallet.
</script>

{JSON.stringify(displayData, (key, value) => typeof value === 'bigint' ? value.toString() : value)}
