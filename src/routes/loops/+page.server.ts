import { getTokenApr } from '$lib/server/yields';
import type { PageServerLoad } from './$types';
import { searchAave } from './lending/aave';
import { searchMorpho } from './lending/morpho';
import { isCorrelated, type YieldLoop } from './utils';

export const load: PageServerLoad = async ({ url }) => {
  // const bribes = url.searchParams.getAll('bribe'); // count bribe emissions in the apy
  const validChains = ['ethereum', 'zksync', 'mantle', 'base', 'arbitrum', 'bera'] as const;
  const chainsParam = url.searchParams.getAll('chain');
  const chains = chainsParam.length > 0
    ? validChains.filter(c => chainsParam.includes(c))
    : validChains;

  const validExposures = ['btc', 'eth', 'usd'] as const;
  const exposuresParam = url.searchParams.getAll('exposure');
  const exposures = exposuresParam.length > 0
    ? validExposures.filter(e => exposuresParam.includes(e))
    : validExposures;

  const minLiquidity = toNumber(url.searchParams.get('liquidity')) ?? 10_000;
  let protocols = url.searchParams.getAll('protocol');
  if (protocols.length === 0) {
    protocols = ['aave', 'compound', 'dolomite', 'euler', 'morpho', 'spark', 'zerolend'];
  }
  const sortOrder = url.searchParams.get('sort') ?? 'yield';
  // const page = Number(url.searchParams.get('page') ?? '1');

  const results: YieldLoop[] = [];

  if (protocols.includes('aave')) {
    results.push(...await searchAave(chains));
  }
  if (protocols.includes('compound')) {
  }
  if (protocols.includes('dolomite')) {
  }
  if (protocols.includes('euler')) {
  }
  if (protocols.includes('morpho')) {
    results.push(...await searchMorpho(chains));
  }
  if (protocols.includes('spark')) {
  }
  if (protocols.includes('zerolend')) {
  }

  const loops = await Promise.all(results
    .filter(item => exposures.some(exposure =>
      isCorrelated(item.collateralAsset.symbol.toLowerCase(), exposure) &&
      isCorrelated(item.loanAsset.symbol.toLowerCase(), exposure)
    ))
    .filter(item => item.liquidityUSD >= minLiquidity)
    .map(async item => {
      const supplyTokenApr = await getTokenApr(item.collateralAsset.symbol, item.chainId, item.collateralAsset.address);
      const collateralApr = (1 + item.supplyApr.weekly) * (1 + supplyTokenApr) - 1;
      const borrowTokenApr = await getTokenApr(item.loanAsset.symbol, item.chainId, item.loanAsset.address);
      const borrowApr = (1 + item.borrowApr.weekly) * (1 + borrowTokenApr) - 1;
      const leverage = 1 + item.ltv / (1 - item.ltv);

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

function toNumber(value: string | null) {
  if (value === null) return null;

  const result = Number(value);
  return isNaN(result)? null : result;
}

function calculateYield(collateralApr: number, borrowApr: number, ltv: number) {
  const leverage = 1 + ltv / (1 - ltv);
  return leverage * (collateralApr - ltv * borrowApr);
}
