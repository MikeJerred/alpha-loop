<script lang="ts">
  import type { Protocol } from '$lib/core/protocols';
  import aaveIcon from '$lib/images/protocols/aave-light.svg';
  import compoundIcon from '$lib/images/protocols/compound.svg';
  import morphoIcon from '$lib/images/protocols/morpho-light.svg';

  let { name, size = 16 }: { name: Protocol, size?: number } = $props();

  const image = $derived(
    name === 'aave' ? aaveIcon
    : name === 'compound' ? compoundIcon
    : name === 'morpho' ? morphoIcon
    : null
  );
  const title = $derived(
    name === 'aave' ? 'Aave'
    : name === 'compound' ? 'Compound'
    : name === 'morpho' ? 'Morpho'
    : null
  );
</script>

<style>
  img {
    vertical-align: middle;
  }
</style>

<img src={image} title={title} alt={title} width={`${size}px`} height={`${size}px`} />
