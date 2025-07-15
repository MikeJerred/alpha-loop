import type { ChainId, Protocol } from '$lib/core';
import { getLoops } from '$lib/data/database';
import type { PageLoad } from './$types';
import { isCorrelated } from './utils';

export const prerender = false;

export const load: PageLoad = async ({ url }) => {
  // const bribes = url.searchParams.getAll('bribe'); // count bribe emissions in the apy
  const chains = getValidSearchParams(
    url.searchParams,
    'chain',
    ['mainnet', 'arbitrum', 'base', 'linea', 'mantle', 'optimism', 'scroll', 'unichain', 'zksync'],
  );
  const depeg = toNumber(url.searchParams.get('depeg')) ?? 0.97;
  const exposures = getValidSearchParams(url.searchParams, 'exposure', ['btc', 'eth', 'usd']);
  const minLiquidity = toNumber(url.searchParams.get('liquidity')) ?? null;
  const protocols = getValidSearchParams(
    url.searchParams,
    'protocol',
    ['aave', 'compound', 'morpho'],
  );
  const sortOrder = url.searchParams.get('sort') ?? 'yield';
  // const page = Number(url.searchParams.get('page') ?? '1');

  const loops = await getLoops(chains, minLiquidity, protocols);
  if (!loops) return { loops: [] };

  const results = await Promise.all(loops
    .filter(loop => exposures.some(exposure =>
      isCorrelated(loop.supply_asset_symbol.toLowerCase(), exposure) &&
      isCorrelated(loop.borrow_asset_symbol.toLowerCase(), exposure)
    ))
    .filter(loop => !minLiquidity || (
      loop.liquidity_usd !== null &&
      !isNaN(loop.liquidity_usd) &&
      loop.liquidity_usd >= minLiquidity
    ))
    .map(async loop => {
      const supplyYield = loop.supply_yield_monthly ?? loop.supply_yield_weekly ?? loop.supply_yield_daily ?? 0;
      const borrowYield = loop.borrow_yield_monthly ?? loop.borrow_yield_weekly ?? loop.borrow_yield_daily ?? 0;
      const supplyApr = (1 + loop.supply_apr_weekly) * (1 + supplyYield) - 1;
      const borrowApr = (1 + loop.borrow_apr_weekly) * (1 + borrowYield) - 1;
      const ltv = Math.min(loop.max_ltv, loop.lltv * depeg)
      const leverage = 1 / (1 - ltv);

      return {
        protocol: loop.protocol as Protocol,
        chainId: loop.chain_id as ChainId,
        borrowAsset: {
          address: loop.borrow_asset_address,
          symbol: loop.borrow_asset_symbol,
        },
        supplyAsset: {
          address: loop.supply_asset_address,
          symbol: loop.supply_asset_symbol,
        },
        liquidityUSD: loop.liquidity_usd,
        ltv: ltv,
        link: loop.link,

        supplyApr,
        borrowApr,
        yieldApr: calculateYield(supplyApr, borrowApr, ltv),
        leverage,
      };
    }));

  switch (sortOrder) {
    case 'yield':
    default:
      results.sort((a, b) => b.yieldApr - a.yieldApr);
      break;

    case 'ltv':
      results.sort((a, b) => b.ltv - a.ltv);
      break;
  }

  return {
    loops: results
  };
};

function getValidSearchParams<T extends string>(searchParams: URLSearchParams, key: string, validValues: T[]) {
  const params = searchParams.getAll(key);
  return params.length > 0
    ? validValues.filter(value => params.includes(value))
    : validValues;
}

function toNumber(value: string | null) {
  if (value === null) return null;

  const result = Number(value);
  return isNaN(result)? null : result;
}

function calculateYield(supplyApr: number, borrowApr: number, ltv: number) {
  const leverage = 1 + ltv / (1 - ltv);
  return leverage * (supplyApr - ltv * borrowApr);
}
