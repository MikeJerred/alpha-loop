<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Chain from '$lib/client/Chain.svelte';
  import Currency from '$lib/client/Currency.svelte';
  import Protocol from '$lib/client/Protocol.svelte';
  import Percent from '$lib/client/Percent.svelte';
  import { throttle } from '$lib/core/utils';
  import type { PageProps } from './$types';

  const { data }: PageProps = $props();

  const setLiquidity = throttle((value: string) => {
    goto(`?liquidity=${value}`, { noScroll: true });
  });
</script>

<svelte:head>
  <title>Loops</title>
  <meta name="description" content="Find yield loop strategies" />
</svelte:head>

<form>
  <div class="form-control">
    <input type="range"
      value={isNaN(parseInt(page.params.liquidity)) ? 10_000 : +page.params.liquidity}
      oninput={event => setLiquidity(event.currentTarget.value)}
    >
  </div>
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
      <div class="item"><Chain id={loop.chainId} /></div>
      <div class="item"><Protocol name={loop.protocol} /></div>
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

<style>
  form {
    margin-bottom: 40px;
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
