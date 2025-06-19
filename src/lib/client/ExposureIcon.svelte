<script lang="ts">
  import type { Exposure } from '$lib/core/exposures';
  import btcIcon from '$lib/images/exposures/btc.svg';
  import ethIcon from '$lib/images/exposures/eth.svg';
  import usdIcon from '$lib/images/exposures/usdc.svg';

  let { id, size = 16 }: { id: Exposure, size?: number } = $props();

  const image = $derived(
    id === 'btc' ? btcIcon
    : id === 'eth' ? ethIcon
    : id === 'usd' ? usdIcon
    : null
  );
  const title = $derived(
    id === 'btc' ? 'BTC'
    : id === 'eth' ? 'ETH'
    : id === 'usd' ? 'USD'
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
