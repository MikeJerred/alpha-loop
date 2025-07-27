<script lang="ts">
  import { ProgressRing } from '@skeletonlabs/skeleton-svelte';
  import { onMount } from 'svelte';
  import ProtocolIcon from '$lib/client/ProtocolIcon.svelte';
  import ChainIcon from '$lib/client/ChainIcon.svelte';
  import Currency from '$lib/client/Currency.svelte';
  import type { Protocol } from '$lib/core';
  import { getAavePositions } from './aave';
  import { getCompoundPositions } from './compound';
  import { getMorphoPositions } from './morho';

  let view: 'error' | 'loading' | 'normal' = 'loading';

  type TokenDetails = {
    address: string;
    symbol: string;
    amount: number;
    usdValue: number;
  };

  let displayData: {
    chainId: number;
    provider: Protocol;
    supplied: TokenDetails[];
    borrowed: TokenDetails[];
    total: number;
  }[] = [];

  onMount(async () => {
    if (!window.ethereum) {
      view = 'error';
      return;
    }

    displayData = [
      ...await getAavePositions(window.ethereum),
      ...await getCompoundPositions(window.ethereum),
      ...await getMorphoPositions(window.ethereum),
    ];

    view = 'normal';
  });
</script>

<style>
  .grid {
    .item {
      line-height: 38px;
    }

    .header {
      .item {
        border-bottom: 1px solid var(--color-stone-500);
      }
    }

    .row {
      &:nth-child(even) {
        div {
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }
  }
</style>

{#if view === 'loading'}
  <div class="mx-auto">
    <ProgressRing value={null} />
  </div>
{:else if view === 'error'}
  Error
{:else}
  <div class="flex flex-col gap-8">
    {#each displayData as { chainId, provider, supplied, borrowed, total }}
      <div>
        <div class="flex gap-4 text-xl items-center">
          <div class="relative inline-block">
            <div class="p-2">
              <ProtocolIcon id={provider} size={32} />
            </div>
            <div class="absolute top-0 right-0">
              <ChainIcon id={chainId} />
            </div>
          </div>
          <span class="capitalize">{provider}</span>
          <span>(<Currency value={total} />)</span>
        </div>

        {#if supplied.length > 0}
          <div class="grid grid-cols-3">
            <div class="header contents font-bold">
              <div class="item flex">Supplied</div>
              <div class="item flex">Balance</div>
              <div class="item flex">USD Value</div>
            </div>

            {#each supplied as { address, symbol, amount, usdValue }}
              <div class="row contents">
                <div title={address}>{symbol}</div>
                <div>{amount}</div>
                <div><Currency value={usdValue} /></div>
              </div>
            {/each}
          </div>
        {/if}

        {#if borrowed.length > 0}
          <div class="grid grid-cols-3 mt-2">
            <div class="header contents font-bold">
              <div class="item flex">Borrowed</div>
              <div class="item flex">Balance</div>
              <div class="item flex">USD Value</div>
            </div>

            {#each borrowed as { address, symbol, amount, usdValue }}
              <div class="row contents">
                <div title={address}>{symbol}</div>
                <div>{amount}</div>
                <div><Currency value={usdValue} /></div>
              </div>
            {/each}
          </div>
        {/if}
        </div>
    {/each}
  </div>
{/if}
