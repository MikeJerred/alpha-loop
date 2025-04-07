<script lang="ts">
  let { value, symbol = '$' }: { value: number, symbol?: string } = $props();

  const formattedNumber = $derived(value.toLocaleString('en', {
    notation: 'compact',
    compactDisplay: 'short',
    minimumSignificantDigits: 3,
    maximumSignificantDigits: 3,
  }));
</script>

<style>
  span {
    font-variant-numeric: tabular-nums;
  }
</style>

<span>{symbol}{formattedNumber}</span>
