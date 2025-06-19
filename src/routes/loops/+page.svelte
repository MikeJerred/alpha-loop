<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import ChainIcon from '$lib/client/ChainIcon.svelte';
  import Currency from '$lib/client/Currency.svelte';
  import ExposureIcon from '$lib/client/ExposureIcon.svelte';
  import ProtocolIcon from '$lib/client/ProtocolIcon.svelte';
  import Percent from '$lib/client/Percent.svelte';
  import type { ChainName, Exposure, Protocol } from '$lib/core';
  import { chains, exposures, protocols, throttle } from '$lib/core';
  import type { PageProps } from './$types';
  import Toggle from './Toggle.svelte';

  const { data }: PageProps = $props();

  const liquidity = $derived.by(() => {
    const value = page.url.searchParams.get('liquidity');
    return value !== null && !isNaN(parseInt(value)) ? parseInt(value) : 10_000;
  });

  const setLiquidity = throttle((value: string) => {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('liquidity', value);

    goto(`?${params.toString()}`, { noScroll: true });
  });

  const chainItems = Object.entries(chains).map(([urlName, { id, name }]) => ({ id, name, urlName: urlName as ChainName }));
  const exposureItems = Object.entries(exposures).map(([urlName, { name }]) => ({ name, urlName: urlName as Exposure }));
  const protocolItems = Object.entries(protocols).map(([urlName, { name }]) => ({ name, urlName: urlName as Protocol }));
</script>

<style>
  form {
    margin-bottom: 40px;

    label {
      width: fit-content;
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(13, auto);
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 32px;
  }

  .header {
    display: contents;

    .item {
      font-weight: 700;
      border-bottom: 1px solid var(--color-text);
    }
  }

  .row {
    display: contents;
    color: var(--color-text);

    &:nth-child(even) {
      .item {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  }

  .yield {
    font-weight: 700;
  }
</style>

<svelte:head>
  <title>Loops</title>
  <meta name="description" content="Find yield loop strategies" />
</svelte:head>

<form class="flex flex-wrap items-center justify-between gap-6">
  <label class="label flex-auto">
    <span class="label-text">Min. Liquidity</span>
    <div class="input-group grid-cols-[auto_1fr_auto]">
      <div class="ig-cell preset-tonal">
        $
      </div>
      <input type="number"
        class="ig-input"
        placeholder="Amount"
        value={liquidity}
        oninput={event => setLiquidity(event.currentTarget.value)}
      />
    </div>
  </label>

  <label class="label flex-auto">
    <span class="label-text">Chains</span>
    <div class="flex gap-2 items-center">
      {#each chainItems as chain}
        <Toggle urlKey="chain" urlName={chain.urlName} allItems={chainItems}>
          <ChainIcon id={chain.id} />
        </Toggle>
      {/each}
    </div>
  </label>

  <label class="label flex-auto">
    <span class="label-text">Protocol</span>
    <div class="flex gap-2 items-center">
      {#each protocolItems as protocol}
        <Toggle urlKey="protocol" urlName={protocol.urlName} allItems={protocolItems}>
          <ProtocolIcon id={protocol.urlName} />
        </Toggle>
      {/each}
    </div>
  </label>

  <label class="label flex-auto">
    <span class="label-text">Exposure</span>
    <div class="flex gap-2 items-center">
      {#each exposureItems as exposure}
        <Toggle urlKey="exposure" urlName={exposure.urlName} allItems={exposureItems}>
          <ExposureIcon id={exposure.urlName} />
        </Toggle>
      {/each}
    </div>
  </label>
</form>

<div class="grid">
  <div class="header">
    <div class="item"><!--Chain--></div>
    <div class="item"><!--Protocol--></div>
    <div class="item">Strategy</div>
    <div class="item">Liquidity</div>
    <div class="item">Yield</div>
    <div class="item"> = </div>
    <div class="item">Leverage</div>
    <div class="item"> * </div>
    <div class="item">(Supply</div>
    <div class="item"> - </div>
    <div class="item">Borrow</div>
    <div class="item"> * </div>
    <div class="item">LTV)</div>
  </div>
  {#each data.loops as loop}
    <a class="row" href={loop.link} target="_blank">
      <div class="item"><ChainIcon id={loop.chainId} /></div>
      <div class="item"><ProtocolIcon id={loop.protocol} /></div>
      <div class="item">{loop.supplyAsset.symbol} / {loop.borrowAsset.symbol}</div>
      <div class="item"><Currency value={loop.liquidityUSD} symbol="$" /></div>
      <div class="item yield"><Percent value={loop.yieldApr} digits={1} /></div>
      <div class="item"></div>
      <div class="item">{loop.leverage.toFixed(1)}</div>
      <div class="item"></div>
      <div class="item"><Percent value={loop.collateralApr} /></div>
      <div class="item"></div>
      <div class="item"><Percent value={loop.borrowApr} /></div>
      <div class="item"></div>
      <div class="item"><Percent value={loop.ltv} /></div>
    </a>
  {/each}
</div>
