<script lang="ts">
  import type { Exposure } from '$lib/core/exposures';
  import btcIcon from '$lib/images/exposures/btc.svg';
  import ethIcon from '$lib/images/exposures/eth.svg';
  import usdIcon from '$lib/images/exposures/usdc.svg';

  let { id, size = 16, title = true }: { id: Exposure, size?: number, title?: boolean } = $props();

  const image = $derived(
    id === 'btc' ? btcIcon
    : id === 'eth' ? ethIcon
    : id === 'usd' ? usdIcon
    : null
  );
  const titleText = $derived(
    id === 'btc' ? 'BTC'
    : id === 'eth' ? 'ETH'
    : id === 'usd' ? 'USD'
    : null
  );
</script>

<style>
  img {
    vertical-align: middle;
  }
</style>

<img src={image} title={title ? titleText : null} alt={titleText} style:width={`${size}px`} style:height={`${size}px`} />
