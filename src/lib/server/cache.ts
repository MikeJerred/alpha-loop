import { type Abi, type ContractFunctionArgs, type ContractFunctionName, type ContractFunctionReturnType } from 'viem';
import { getViemClient, type ChainName } from '$lib/core';

const fetchCache = new Map<string, { timestamp: number, data: unknown }>();
const contractCache = new Map<string, { timestamp: number, data: unknown }>();

const OneHour = 60 * 60 * 1000;
const CacheExpiry = 24 * OneHour;

export const fetchCached = async <T>(
  force: boolean,
  cacheKey: string,
  url?: string | URL,
  init?: RequestInit,
) => {
  const cached = fetchCache.get(cacheKey);
  if (cached && !force) {
    const delta = Date.now() - cached.timestamp;
    if (delta < CacheExpiry) {
      return cached.data as T;
    }
  }

  const response = await fetch(url ?? cacheKey, init);
  const data = await response.json() as T;

  fetchCache.set(cacheKey, { timestamp: Date.now(), data });

  return data;
};

export const readContractCached = async <
  const abi extends Abi,
  functionName extends ContractFunctionName<abi, 'pure' | 'view'>,
>(
  force: boolean,
  chain: ChainName,
  address: `0x${string}`,
  abi: abi,
  functionName: functionName,
  args?: ContractFunctionArgs<abi, 'pure' | 'view', functionName>,
  cacheKey = `${chain}:${address}:${functionName}:${JSON.stringify(args)}`,
): Promise<Awaited<ContractFunctionReturnType<
  abi,
  'pure' | 'view',
  functionName,
  ContractFunctionArgs<abi, 'pure' | 'view', functionName>
>>> => {
  const cached = contractCache.get(cacheKey);
  if (cached && !force) {
    const delta = Date.now() - cached.timestamp;
    if (delta < CacheExpiry) {
      return cached.data as Awaited<ContractFunctionReturnType<
        abi,
        'pure' | 'view',
        functionName,
        ContractFunctionArgs<abi, 'pure' | 'view', functionName>
      >>;
    }
  }

  const client = getViemClient(chain);
  const data = await client.readContract({ address, abi, functionName, args });

  contractCache.set(cacheKey, { timestamp: Date.now(), data });

  return data;
};
