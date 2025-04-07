<script lang="ts">
  import Currency from '$lib/client/Currency.svelte';
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
      <span>{loop.chainId}</span>
      <span>{loop.protocol}</span>
      <span>{loop.collateralAsset.symbol}</span>
      <span>{loop.loanAsset.symbol}</span>
      <span><Currency value={loop.liquidity} symbol="" /></span>
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
