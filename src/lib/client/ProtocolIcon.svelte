<script lang="ts">
  import { type Protocol, protocols } from '$lib/core/protocols';
  import aaveIcon from '$lib/images/protocols/aave-dark.svg';
  import compoundIcon from '$lib/images/protocols/compound.svg';
  import morphoIcon from '$lib/images/protocols/morpho-light.svg';

  let { id, size = 16, title = true }: { id: Protocol, size?: number, title?: boolean } = $props();

  const image = $derived(
    id === 'aave' ? aaveIcon
    : id === 'compound' ? compoundIcon
    : id === 'morpho' ? morphoIcon
    : null
  );
  const titleText = $derived(protocols[id].name);
</script>

<style>
  img {
    vertical-align: middle;
  }
</style>

<img
  src={image}
  title={title ? titleText : null}
  alt={titleText}
  style:width={`${size}px`}
  style:height={`${size}px`}
  width={`${size}px`}
  height={`${size}px`}
/>
