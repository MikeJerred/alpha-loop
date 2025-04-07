<script lang="ts">
  let { value, digits = 2 }: { value: number, digits?: number } = $props();

  const formattedNumber = $derived((value * 100).toFixed(digits));
</script>

<style>
  span {
    font-variant-numeric: tabular-nums;
  }
</style>

<span>{formattedNumber}%</span>
