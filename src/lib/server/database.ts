import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from '$env/static/public';
import type { Database } from './database.types';
import { chains as allChains, type Chain, type Protocol } from '$lib/core';

const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY);

export const getLoops = async (
  chains: Chain[] | null,
  minLiquidity: number | null,
  protocols: Protocol[] | null,
) => {
  let query = supabase.from('loops').select('*');

  if (chains) {
    const chainIds = chains.map(chain => allChains[chain].id);
    query = query.in('chain_id', chainIds);
  }

  if (minLiquidity)
    query = query.gte('liquidity_usd', minLiquidity);

  if (protocols)
    query = query.in('protocol', protocols);

  const response = await query;
  return response.data;
};
