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
  <span>Chain</span>
  <span>Protocol</span>
  <span>Supply</span>
  <span>Borrow</span>
  <span>Liquidity (USD)</span>
  <span>LTV</span>
  <span>Leverage</span>
  <span>Total Yield</span>
  {#each data.loops as loop}
    <a class="row" href={loop.link} target="_blank">
      <span><Chain id={loop.chainId} /></span>
      <span><Protocol name={loop.protocol} /></span>
      <span>{loop.supplyAsset.symbol}</span>
      <span>{loop.borrowAsset.symbol}</span>
      <span><Currency value={loop.liquidityUSD} symbol="" /></span>
      <span><Percent value={loop.ltv} /></span>
      <span>{loop.leverage.toFixed(1)}x</span>
      <!-- <span><Percent value={loop.collateralApr} /></span>
      <span><Percent value={loop.borrowApr} /></span> -->
      <span><Percent value={loop.yieldApr} /> = <Percent value={loop.collateralApr} /> / <Percent value={loop.borrowApr} /></span>
    </a>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(8, auto);
    justify-items: center;
  }

  .row {
    display: contents;
    color: black;
  }
</style>
