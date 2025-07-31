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
  const expiry = toNumber(url.searchParams.get('expiry')) ?? 0;
  const exposures = getValidSearchParams(url.searchParams, 'exposure', ['btc', 'eth', 'usd']);
  const minLiquidity = toNumber(url.searchParams.get('liquidity')) ?? 100_000;
  const protocols = getValidSearchParams(
    url.searchParams,
    'protocol',
    ['aave', 'compound', 'morpho'],
  );
  const sortOrder = url.searchParams.get('sort') ?? 'yield';
  // const page = Number(url.searchParams.get('page') ?? '1');
  const yieldSpan = url.searchParams.get('span') ?? 'week';

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
    .filter(loop => {
      const minExpiry = new Date();
      minExpiry.setDate(minExpiry.getDate() + expiry);

      for (const regex of [/^PT-[^-]+-(.*)$/, /^LP-[^-]+-(.*)$/]) {
        for (const symbol of [loop.borrow_asset_symbol, loop.supply_asset_symbol]) {
          const matches = regex.exec(symbol);
          if (matches) {
            const date = new Date(matches[1]);
            if (date < minExpiry) {
              return false;
            }
          }
        }
      }

      return true;
    })
    .map(async loop => {
      let supplyApr: number;
      let supplyYield: number;
      let borrowApr: number;
      let borrowYield: number;

      switch (yieldSpan) {
        case 'day':
          supplyApr = loop.supply_apr_daily;
          borrowApr = loop.borrow_apr_daily;
          supplyYield = loop.supply_yield_daily ?? loop.supply_yield_weekly ?? loop.supply_yield_monthly ?? loop.supply_yield_yearly ?? 0;
          borrowYield = loop.borrow_yield_daily ?? loop.borrow_yield_weekly ?? loop.borrow_yield_monthly ?? loop.borrow_yield_yearly ?? 0;
          break;
        default:
        case 'week':
          supplyApr = loop.supply_apr_weekly;
          borrowApr = loop.borrow_apr_weekly;
          supplyYield = loop.supply_yield_weekly ?? loop.supply_yield_monthly ?? loop.supply_yield_yearly ?? loop.supply_yield_daily ?? 0;
          borrowYield = loop.borrow_yield_weekly ?? loop.borrow_yield_monthly ?? loop.borrow_yield_yearly ?? loop.borrow_yield_daily ?? 0;
          break;
        case 'month':
          supplyApr = loop.supply_apr_monthly;
          borrowApr = loop.borrow_apr_monthly;
          supplyYield = loop.supply_yield_monthly ?? loop.supply_yield_yearly ?? loop.supply_yield_weekly ?? loop.supply_yield_daily ?? 0;
          borrowYield = loop.borrow_yield_monthly ?? loop.borrow_yield_yearly ?? loop.borrow_yield_weekly ?? loop.borrow_yield_daily ?? 0;
          break;
        case 'year':
          supplyApr = loop.supply_apr_yearly;
          borrowApr = loop.borrow_apr_yearly;
          supplyYield = loop.supply_yield_yearly ?? loop.supply_yield_monthly ?? loop.supply_yield_weekly ?? loop.supply_yield_daily ?? 0;
          borrowYield = loop.borrow_yield_yearly ?? loop.borrow_yield_monthly ?? loop.borrow_yield_weekly ?? loop.borrow_yield_daily ?? 0;
          break;
      }

      supplyApr = (1 + supplyApr) * (1 + supplyYield) - 1;
      borrowApr = (1 + borrowApr) * (1 + borrowYield) - 1;
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
