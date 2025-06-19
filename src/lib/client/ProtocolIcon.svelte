<script lang="ts">
  import type { Protocol } from '$lib/core/protocols';
  import aaveIcon from '$lib/images/protocols/aave-dark.svg';
  import compoundIcon from '$lib/images/protocols/compound.svg';
  import morphoIcon from '$lib/images/protocols/morpho-light.svg';

  let { id, size = 16 }: { id: Protocol, size?: number } = $props();

  const image = $derived(
    id === 'aave' ? aaveIcon
    : id === 'compound' ? compoundIcon
    : id === 'morpho' ? morphoIcon
    : null
  );
  const title = $derived(
    id === 'aave' ? 'Aave'
    : id === 'compound' ? 'Compound'
    : id === 'morpho' ? 'Morpho'
    : null
  );
</script>

<style>
  img {
    width: 16px;
    height: 16px;
    vertical-align: middle;
  }
</style>

<img src={image} title={title} alt={title} width={`${size}px`} height={`${size}px`} />
