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

    const kvCached = JSON.parse(await kv?.get(`fetch:${cacheKey}`) ?? 'null') as { timestamp: number, data: T } | null;
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
  kv?.put(`fetch:${cacheKey}`, JSON.stringify(toCache)); // don't await this to return results faster

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

    const kvCached = JSON.parse(await kv?.get(`contract:${cacheKey}`) ?? 'null') as {
      timestamp: number,
      data: ContractReturn<abi, functionName>,
    } | null;
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
  kv?.put(`contract:${cacheKey}`, JSON.stringify(toCache)); // don't await this to return results faster

  return data;
};
