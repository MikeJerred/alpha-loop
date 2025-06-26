import { FORCE_PASSWORD } from '$env/static/private';
import { getTokenApr } from '$lib/server/yields';
import type { PageServerLoad } from './$types';
import { searchAave, searchCompound, searchMorpho } from './lending';
import { isCorrelated } from './utils';

export const load: PageServerLoad = async ({ url }) => {
  // const bribes = url.searchParams.getAll('bribe'); // count bribe emissions in the apy
  const chains = getValidSearchParams(
    url.searchParams,
    'chain',
    ['mainnet', 'arbitrum', 'base', 'linea', 'mantle', 'optimism', 'scroll', 'zksync'],
  );
  const depeg = toNumber(url.searchParams.get('depeg')) ?? 0.97;
  const exposures = getValidSearchParams(url.searchParams, 'exposure', ['btc', 'eth', 'usd']);
  const force = url.searchParams.get('force')?.toLowerCase() === FORCE_PASSWORD.toLowerCase();
  const minLiquidity = toNumber(url.searchParams.get('liquidity')) ?? 10_000;
  const protocols = getValidSearchParams(
    url.searchParams,
    'protocol',
    ['aave', 'compound', 'dolomite', 'euler', 'morpho', 'spark', 'zerolend'],
  );
  const sortOrder = url.searchParams.get('sort') ?? 'yield';
  // const page = Number(url.searchParams.get('page') ?? '1');

  const results = await Promise.all(protocols.map(async protocol => {
    switch (protocol) {
      case 'aave': return await searchAave(chains, depeg, force);
      case 'compound': return await searchCompound(chains, depeg, force);
      case 'morpho': return await searchMorpho(chains, depeg, force);

      case 'dolomite':
      case 'euler':
      case 'spark':
      case 'zerolend':
      default:
        return [];
    }
  }));

  const loops = await Promise.all(results.flat()
    .filter(item => exposures.some(exposure =>
      isCorrelated(item.supplyAsset.symbol.toLowerCase(), exposure) &&
      isCorrelated(item.borrowAsset.symbol.toLowerCase(), exposure)
    ))
    .filter(item => item.liquidityUSD >= minLiquidity)
    .map(async item => {
      const supplyTokenApr = await getTokenApr(item.supplyAsset.symbol, item.chainId, item.supplyAsset.address, force);
      const collateralApr = (1 + item.supplyApr.weekly) * (1 + supplyTokenApr) - 1;
      const borrowTokenApr = await getTokenApr(item.borrowAsset.symbol, item.chainId, item.borrowAsset.address, force);
      const borrowApr = (1 + item.borrowApr.weekly) * (1 + borrowTokenApr) - 1;
      const leverage = 1 / (1 - item.ltv);

      return {
        ...item,
        collateralApr,
        borrowApr,
        yieldApr: calculateYield(collateralApr, borrowApr, item.ltv),
        leverage,
      };
    })
  );

  switch (sortOrder) {
    case 'yield':
    default:
      loops.sort((a, b) => b.yieldApr - a.yieldApr);
      break;

    case 'lltv':
      loops.sort((a, b) => b.ltv - a.ltv);
      break;
  }

  return {
    loops
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

function calculateYield(collateralApr: number, borrowApr: number, ltv: number) {
  const leverage = 1 + ltv / (1 - ltv);
  return leverage * (collateralApr - ltv * borrowApr);
}
