<script lang="ts">
  import { Tooltip } from '@skeletonlabs/skeleton-svelte';
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { throttle } from '$lib/core';

  let { children, urlKey, urlName, allItems }: {
    children: Snippet,
    urlKey: string,
    urlName: string,
    allItems: {
      name: string,
      urlName: string,
    }[],
  } = $props();

  const selectedUrlNames = $derived(page.url.searchParams.getAll(urlKey));
  const name = $derived(allItems.find(item => item.urlName === urlName)?.name);
  const selected = $derived(selectedUrlNames.includes(urlName));

  const updateUrl = throttle((ids: string[]) => {
    const params = new URLSearchParams(page.url.searchParams);
    params.delete(urlKey);
    for (const id of ids)
      params.append(urlKey, id);

    goto(`?${params.toString()}`, { noScroll: true });
  });

  const toggleItem = (urlName: string) => updateUrl(selectedUrlNames.includes(urlName)
    ? selectedUrlNames.filter(name => name !== urlName)
    : [...selectedUrlNames, urlName]
  );
</script>

<Tooltip
  contentBase="card preset-filled px-3 py-1"
  arrow
  openDelay={200}
  onclick={() => toggleItem(urlName)}
>
  {#snippet trigger()}
    <span
      class="
        btn px-3 py-2
        preset-outlined
        hover:preset-outlined-primary-500
        {selected ? 'preset-outlined-primary-500' : 'preset-outlined-surface-500'}
      "
    >
      {@render children()}
    </span>
  {/snippet}
  {#snippet content()}{name}{/snippet}
</Tooltip>
