<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import ChainIcon from '$lib/client/ChainIcon.svelte';
  import Currency from '$lib/client/Currency.svelte';
  import ExposureIcon from '$lib/client/ExposureIcon.svelte';
  import ProtocolIcon from '$lib/client/ProtocolIcon.svelte';
  import Percent from '$lib/client/Percent.svelte';
  import { chains as allChains, exposures as alllExposures, protocols as allProtocols, throttle } from '$lib/core';
  import type { Chain, Exposure, Protocol } from '$lib/core';
  import type { PageProps } from './$types';
  import Toggle from './Toggle.svelte';

  const { data }: PageProps = $props();

  const liquidity = $derived.by(() => {
    const value = page.url.searchParams.get('liquidity');
    return value !== null && !isNaN(parseInt(value)) ? parseInt(value) : 100_000;
  });

  const setLiquidity = throttle((value: string) => {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('liquidity', value);

    goto(`?${params.toString()}`, { noScroll: true });
  });

  const yieldSpan = $derived.by(() => {
    const value = page.url.searchParams.get('span');
    return value && ['day', 'week', 'month', 'year'].includes(value) ? value : 'week';
  });

  const setYieldSpan = throttle((value: string) => {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('span', value);

    goto(`?${params.toString()}`, { noScroll: true });
  });

  const chainItems = Object.entries(allChains)
    .map(([urlName, { id, name }]) => ({ id, name, urlName: urlName as Chain }))
    .sort((a, b) => a.id - b.id);
  const exposureItems = Object.entries(alllExposures).map(([urlName, { name }]) => ({ name, urlName: urlName as Exposure }));
  const protocolItems = Object.entries(allProtocols).map(([urlName, { name }]) => ({ name, urlName: urlName as Protocol }));
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
        .item {
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }
  }
</style>

<svelte:head>
  <title>Loops</title>
  <meta name="description" content="Find yield loop strategies" />
</svelte:head>

<form class="mb-6 flex flex-wrap gap-4 items-center justify-between">
  <label class="label flex-auto w-fit">
    <span class="label-text">Protocol</span>
    <div class="flex gap-2 items-center">
      {#each protocolItems as protocol}
        <Toggle urlKey="protocol" urlName={protocol.urlName} allItems={protocolItems}>
          <ProtocolIcon id={protocol.urlName} title={false} />
        </Toggle>
      {/each}
    </div>
  </label>

  <label class="label flex-auto w-fit">
    <span class="label-text">Chains</span>
    <div class="flex flex-wrap gap-2 items-center">
      {#each chainItems as chain}
        <Toggle urlKey="chain" urlName={chain.urlName} allItems={chainItems}>
          <ChainIcon id={chain.id} title={false} />
        </Toggle>
      {/each}
    </div>
  </label>

  <label class="label flex-auto w-fit">
    <span class="label-text">Exposure</span>
    <div class="flex gap-2 items-center">
      {#each exposureItems as exposure}
        <Toggle urlKey="exposure" urlName={exposure.urlName} allItems={exposureItems}>
          <ExposureIcon id={exposure.urlName} title={false} />
        </Toggle>
      {/each}
    </div>
  </label>

  <label class="label flex-auto w-fit">
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

  <label class="label flex-auto w-fit">
    <span class="label-text">Yield span</span>
    <select class="select"
      value={yieldSpan}
      oninput={event => setYieldSpan(event.currentTarget.value)}
    >
      <option value="day">Daily</option>
      <option value="week">Weekly</option>
      <option value="month">Monthly</option>
      <option value="year">Yearly</option>
    </select>
  </label>
</form>

<div class="
    grid
    grid-cols-[max-content_max-content_minmax(0,max-content)_auto_auto]
    md:grid-cols-[max-content_max-content_minmax(0,max-content)_auto_auto_max-content_auto_max-content_auto_max-content_auto_max-content_auto]
  "
>
  <div class="header contents font-bold">
    <div class="item flex items-center justify-center"><!-- Chain --></div>
    <div class="item flex items-center justify-center"><!-- Protocol --></div>
    <div class="item flex pr-4">Strategy</div>
    <div class="item flex pr-4">Liquidity</div>
    <div class="item flex">Yield</div>
    <div class="item hidden md:flex px-2"> = </div>
    <div class="item hidden md:flex justify-center">Leverage</div>
    <div class="item hidden md:flex px-2"> * </div>
    <div class="item hidden md:flex justify-center">(Supply</div>
    <div class="item hidden md:flex px-2"> - </div>
    <div class="item hidden md:flex justify-center">Borrow</div>
    <div class="item hidden md:flex px-2"> * </div>
    <div class="item hidden md:flex justify-center">LTV)</div>
  </div>
  {#each data.loops as loop}
    <a class="row contents" href={loop.link} target="_blank">
      <div class="item flex pl-4 pr-2 items-center justify-center"><ChainIcon id={loop.chainId} /></div>
      <div class="item flex pl-2 pr-4 items-center justify-center"><ProtocolIcon id={loop.protocol} /></div>
      <div class="item flex pr-4">
        <span class="truncate">
          {loop.supplyAsset.symbol} / {loop.borrowAsset.symbol}
        </span>
      </div>
      <div class="item flex pr-4"><Currency value={loop.liquidityUSD} symbol="$" /></div>
      <div class="item flex yield font-bold"><Percent value={loop.yieldApr} digits={1} /></div>
      <div class="item hidden md:flex"></div>
      <div class="item hidden md:flex justify-center">{loop.leverage.toFixed(1)}</div>
      <div class="item hidden md:flex"></div>
      <div class="item hidden md:flex justify-center"><Percent value={loop.supplyApr} /></div>
      <div class="item hidden md:flex"></div>
      <div class="item hidden md:flex justify-center"><Percent value={loop.borrowApr} /></div>
      <div class="item hidden md:flex"></div>
      <div class="item hidden md:flex justify-center"><Percent value={loop.ltv} /></div>
    </a>
  {/each}
</div>
