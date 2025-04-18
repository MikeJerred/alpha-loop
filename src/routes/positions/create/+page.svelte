<script lang="ts">
  import { onMount } from 'svelte';
  import { createWalletClient, custom, encodeFunctionData } from 'viem';
  import { chains, getChainId, getViemClient } from '$lib/core/chains';

  onMount(async () => {
    if (!window.ethereum) {
      return;
    }

    const chain = chains.base;

    const client = createWalletClient({
      chain: chain,
      transport: custom(window.ethereum),
    });

    await client.switchChain({ id: chain.id });

    const authorization = await client.signAuthorization({ contractAddress:  });

    await client.sendTransaction({
      account: ,
      authorizationList: [authorization],
      data: encodeFunctionData({
        abi:,
        functionName: 'execute',
        args: [],
      }),
      to: client.account.address,
    });

    // 1. flashloan collateral token from morpho
    // 2. add collateral to morpho
    // 3. borrow debt token from morpho
    // 4. swap the debt token into the collateral token using odos or lifi
    // 5. collect fee
    // 6. repay flashloan

  });



</script>


