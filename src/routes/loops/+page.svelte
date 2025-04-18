<script lang="ts">
  import Chain from '$lib/client/Chain.svelte';
  import Currency from '$lib/client/Currency.svelte';
  import Protocol from '$lib/client/Protocol.svelte';
  import Percent from '$lib/client/Percent.svelte';
  import type { PageProps } from './$types';

  const { data }: PageProps = $props();

</script>

<svelte:head>
  <title>Loops</title>
  <meta name="description" content="Find yield loop alpha" />
</svelte:head>

<div class="grid">
  <div><!--Chain--></div>
  <div><!--Protocol--></div>
  <div>Strategy</div>
  <div>Liquidity</div>
  <div>Yield</div>
  <div> = </div>
  <div>Leverage</div>
  <div> * </div>
  <div>(Supply</div>
  <div> - </div>
  <div>Borrow</div>
  <div> * </div>
  <div>LTV)</div>
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
  .grid {
    display: grid;
    grid-template-columns: repeat(13, auto);
  }

  .row {
    display: contents;
    color: black;

    &:nth-child(even) {
      .item {
        background: rgba(0, 0, 0, 0.05);
      }
    }
  }

  .yield {
    font-weight: bold;
  }
</style>
