import { getStore } from '@netlify/blobs';
import { env } from '$env/dynamic/private';

const store = getStore({
  name: 'alpha-loop',
  token: env.NETLIFY_TOKEN,
  siteID: env.NETLIFY_SITE_ID,
});

// cache in a blob store, but also in memory. Retrieving / updating the store is asynchronous, so by
// having an additional memory cache we can return results faster (by not awaiting on the update), and
// also ensure that the same request is not made twice when serving a single request (multiple calls to
// the same request could happen whilst the store is being updated since we do not await).
const fetchCache = new Map<string, { timestamp: number, data: unknown }>();

const OneHour = 60 * 60 * 1000;
const CacheExpiry = 24 * OneHour;

export const fetchCached = async <T>(
  cacheKey: string,
  url?: string | URL,
  init?: RequestInit,
) => {
  const cached = fetchCache.get(cacheKey);
  if (cached) {
    const delta = Date.now() - cached.timestamp;
    if (delta < CacheExpiry) {
      return cached.data as T;
    }
  }

  const blobCached = parseJson<{ timestamp: number, data: T }>(await store.get(cacheKey));
  if (blobCached) {
    const delta = Date.now() - blobCached.timestamp;
    if (delta < CacheExpiry) {
      // update the in memory cache if we found a value in the blob store
      fetchCache.set(cacheKey, blobCached);
      return blobCached.data;
    }
  }

  const response = await fetch(url ?? cacheKey, init);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url ?? cacheKey}`);
  }

  const data = await response.json() as T;
  const toCache = { timestamp: Date.now(), data };

  fetchCache.set(cacheKey, toCache);
  // don't await this to return results faster
  store.set(cacheKey, stringifyJson(toCache));

  return data;
};

function parseJson<T>(data: string | null | undefined): T | null {
  if (!data) return null;

  return JSON.parse(data, (key, value) => {
    if (typeof value !== 'string' || !/^-?\d+n+$/.test(value)) {
      // if this does not look like an escaped sequence, do nothing
      return value;
    }

    if (/^-?\d+n$/.test(value)) {
      // if we have a single 'n' at the end, then this is an escaped bigint
      return BigInt(value.slice(0, -1));
    }

    // otherwise it was originally a string which we escaped with an extra 'n'
    return value.slice(0, -1);
  });
}

function stringifyJson(data: unknown) {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === 'bigint') return `${value.toString()}n`;

    if (typeof value === 'string' && /^-?\d+n+$/.test(value)) {
      // escape strings that happen to match the escaped bigint format with an extra 'n'
      return `${value}n`;
    }

    return value;
  });
}
