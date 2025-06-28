import { getStore } from '@netlify/blobs';
import { request as graphQlRequest } from 'graphql-request';
import { type Abi, type ContractFunctionArgs, type ContractFunctionName, type ContractFunctionReturnType } from 'viem';
import { env } from '$env/dynamic/private';
import { getViemClient, type ChainName } from '$lib/core';

let force = false;
const store = getStore({
  // edgeURL: NETLIFY_EDGE_URL,
  name: 'alpha-loop',
  token: env.NETLIFY_TOKEN,
  siteID: env.NETLIFY_SITE_ID,
});
export const setupCache = (_force: boolean) => {
  force = _force;
};

// cache in a blob store, but also in memory. Retrieving / updating the store is asynchronous, so by
// having an additional memory cache we can return results faster (by not awaiting on the update), and
// also ensure that the same request is not made twice when serving a single request (multiple calls to
// the same request could happen whilst the store is being updated since we do not await).
const fetchCache = new Map<string, { timestamp: number, data: unknown }>();
const graphQlCache = new Map<string, { timestamp: number, data: unknown }>();
const contractCache = new Map<string, { timestamp: number, data: unknown }>();

const OneHour = 60 * 60 * 1000;
const CacheExpiry = 24 * OneHour;

export const fetchCached = async <T>(
  cacheKey: string,
  url?: string | URL,
  init?: RequestInit,
) => {
  if (!force) {
    const cached = fetchCache.get(cacheKey);
    if (cached) {
      const delta = Date.now() - cached.timestamp;
      if (delta < CacheExpiry) {
        return cached.data as T;
      }
    }

    const blobCached = parseJson<{ timestamp: number, data: T }>(await store.get(`fetch:${cacheKey}`));
    if (blobCached) {
      const delta = Date.now() - blobCached.timestamp;
      if (delta < CacheExpiry) {
        // update the in memory cache if we found a value in the blob store
        fetchCache.set(cacheKey, blobCached);
        return blobCached.data;
      }
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
  store.set(`fetch:${cacheKey}`, stringifyJson(toCache));

  return data;
};

export const graphQlCached = async <T>(cacheKey: string, url: string, query: string, variables?: object) => {
  if (!force) {
    const cached = graphQlCache.get(cacheKey);
    if (cached) {
      const delta = Date.now() - cached.timestamp;
      if (delta < CacheExpiry) {
        return cached.data as T;
      }
    }

    const blobCached = parseJson<{ timestamp: number, data: T }>(await store.get(`graphql:${cacheKey}`));
    if (blobCached) {
      const delta = Date.now() - blobCached.timestamp;
      if (delta < CacheExpiry) {
        // update the in memory cache if we found a value in the blob store
        graphQlCache.set(cacheKey, blobCached);
        return blobCached.data;
      }
    }
  }

  const data = await graphQlRequest<T>(url, query, variables);
  const toCache = { timestamp: Date.now(), data };

  graphQlCache.set(cacheKey, toCache);
  // don't await this to return results faster
  store.set(`graphql:${cacheKey}`, stringifyJson(toCache));

  return data;
};

type ContractReturn<
  abi extends Abi,
  functionName extends ContractFunctionName<abi, 'pure' | 'view'>,
> = Awaited<ContractFunctionReturnType<
  abi,
  'pure' | 'view',
  functionName,
  ContractFunctionArgs<abi, 'pure' | 'view', functionName>
>>

export const readContractCached = async <
  const abi extends Abi,
  functionName extends ContractFunctionName<abi, 'pure' | 'view'>,
>(
  chain: ChainName,
  address: `0x${string}`,
  abi: abi,
  functionName: functionName,
  args?: ContractFunctionArgs<abi, 'pure' | 'view', functionName>,
  cacheKey = `${chain}:${address}:${functionName}:${JSON.stringify(args)}`,
): Promise<ContractReturn<abi, functionName>> => {
  if (!force) {
    const cached = contractCache.get(cacheKey);
    if (cached) {
      const delta = Date.now() - cached.timestamp;
      if (delta < CacheExpiry) {
        return cached.data as ContractReturn<abi, functionName>;
      }
    }

    const blobCached = parseJson<{ timestamp: number, data: ContractReturn<abi, functionName> }>(
      await store.get(`contract:${cacheKey}`)
    );
    if (blobCached) {
      const delta = Date.now() - blobCached.timestamp;
      if (delta < CacheExpiry) {
        // update the in memory cache if we found a value in the blob store
        contractCache.set(cacheKey, blobCached);
        return blobCached.data;
      }
    }
  }

  const client = getViemClient(chain);
  const data = await client.readContract({ address, abi, functionName, args });
  const toCache = { timestamp: Date.now(), data };

  contractCache.set(cacheKey, toCache);
  // don't await this to return results faster
  store.set(`contract:${cacheKey}`, stringifyJson(toCache));

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
