import { type KVNamespace } from '@cloudflare/workers-types';
import { type Abi, type ContractFunctionArgs, type ContractFunctionName, type ContractFunctionReturnType } from 'viem';
import { getViemClient, type ChainName } from '$lib/core';

let force = false;
let kv: KVNamespace | undefined = undefined;
export const setupCache = (_force: boolean, _kv: KVNamespace | undefined) => {
  force = _force;
  kv = _kv;
};

// cache in cloudflare kv, but also in memory. Retrieving / updating the kv store is asynchronous, so by
// having an additional memory cache we can return results faster (by not awaiting on the kv update), and
// also ensure that the same request is not made twice when serving a single request (multiple calls to
// the same request could happen whilst the kv store is being updated since we do not await).
const fetchCache = new Map<string, { timestamp: number, data: unknown }>();
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

    const kvCached = parseJson<{ timestamp: number, data: T }>(await kv?.get(`fetch:${cacheKey}`));
    if (kvCached) {
      const delta = Date.now() - kvCached.timestamp;
      if (delta < CacheExpiry) {
        // update the in memory cache if we found a value in the kv store
        fetchCache.set(cacheKey, kvCached);
        return kvCached.data;
      }
    }
  }

  const response = await fetch(url ?? cacheKey, init);
  const data = await response.json() as T;
  const toCache = { timestamp: Date.now(), data };

  fetchCache.set(cacheKey, toCache);
  // don't await this to return results faster
  kv?.put(`fetch:${cacheKey}`, stringifyJson(toCache), { expirationTtl: CacheExpiry / 1000 });

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

    const kvCached = parseJson<{ timestamp: number, data: ContractReturn<abi, functionName> }>(
      await kv?.get(`contract:${cacheKey}`)
    );
    if (kvCached) {
      const delta = Date.now() - kvCached.timestamp;
      if (delta < CacheExpiry) {
        // update the in memory cache if we found a value in the kv store
        contractCache.set(cacheKey, kvCached);
        return kvCached.data;
      }
    }
  }

  const client = getViemClient(chain);
  const data = await client.readContract({ address, abi, functionName, args });
  const toCache = { timestamp: Date.now(), data };

  contractCache.set(cacheKey, toCache);
  // don't await this to return results faster
  kv?.put(`contract:${cacheKey}`, stringifyJson(toCache), { expirationTtl: CacheExpiry / 1000 });

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
