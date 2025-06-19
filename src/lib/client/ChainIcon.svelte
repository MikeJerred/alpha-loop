<script lang="ts">
  import { type ChainId, chains, getChainName } from '$lib/core';
  import arbitrumIcon from '$lib/images/chains/arbitrum.svg';
  import baseIcon from '$lib/images/chains/base.svg';
  import berachainIcon from '$lib/images/chains/berachain.svg';
  import ethereumIcon from '$lib/images/chains/ethereum.svg';
  import gnosisIcon from '$lib/images/chains/gnosis.svg';
  import lineaIcon from '$lib/images/chains/linea.svg';
  import mantleIcon from '$lib/images/chains/mantle.svg';
  import optimismIcon from '$lib/images/chains/optimism.svg';
  import polygonIcon from '$lib/images/chains/polygon.svg';
  import scrollIcon from '$lib/images/chains/scroll.svg';
  import zksyncIcon from '$lib/images/chains/zksync.svg';

  let { id, size = 16 }: { id: ChainId, size?: number } = $props();

  const image = $derived(
    id === chains.arbitrum.id ? arbitrumIcon
    : id === chains.base.id ? baseIcon
    : id === chains.berachain.id ? berachainIcon
    : id === chains.gnosis.id ? gnosisIcon
    : id === chains.linea.id ? lineaIcon
    : id === chains.mainnet.id ? ethereumIcon
    : id === chains.mantle.id ? mantleIcon
    : id === chains.optimism.id ? optimismIcon
    : id === chains.polygon.id ? polygonIcon
    : id === chains.scroll.id ? scrollIcon
    : id === chains.zksync.id ? zksyncIcon
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

<img src={image} alt={getChainName(id)} width={`${size}px`} height={`${size}px`} />
