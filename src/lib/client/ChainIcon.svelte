<script lang="ts">
  import { chains } from '$lib/core';
  import arbitrumIcon from '$lib/images/chains/arbitrum.svg';
  import baseIcon from '$lib/images/chains/base.svg';
  // import berachainIcon from '$lib/images/chains/berachain.svg';
  // import bscIcon from '$lib/images/chains/bsc.svg';
  import ethereumIcon from '$lib/images/chains/ethereum.svg';
  // import gnosisIcon from '$lib/images/chains/gnosis.svg';
  import lineaIcon from '$lib/images/chains/linea.svg';
  import mantleIcon from '$lib/images/chains/mantle.svg';
  import optimismIcon from '$lib/images/chains/optimism.svg';
  import polygonIcon from '$lib/images/chains/polygon.svg';
  import scrollIcon from '$lib/images/chains/scroll.svg';
  import unichainIcon from '$lib/images/chains/unichain.svg';
  import zksyncIcon from '$lib/images/chains/zksync.svg';

  let { id, size = 16, title = true }: { id: number, size?: number, title?: boolean } = $props();

  const image = $derived(
    id === chains.arbitrum[0].id ? arbitrumIcon
    : id === chains.base[0].id ? baseIcon
    // : id === chains.bsc[0].id ? bscIcon
    : id === chains.linea[0].id ? lineaIcon
    : id === chains.mainnet[0].id ? ethereumIcon
    : id === chains.mantle[0].id ? mantleIcon
    : id === chains.optimism[0].id ? optimismIcon
    : id === chains.polygon[0].id ? polygonIcon
    : id === chains.scroll[0].id ? scrollIcon
    : id === chains.unichain[0].id ? unichainIcon
    : id === chains.zksync[0].id ? zksyncIcon
    : null
  );

  const titleText = $derived(Object.values(chains).map(([chain]) => chain).find(chain => chain.id === id)?.name);
</script>

<style>
  img {
    width: 16px;
    height: 16px;
    vertical-align: middle;
  }
</style>

<img src={image} title={title ? titleText : null} alt={titleText} width={`${size}px`} height={`${size}px`} />
