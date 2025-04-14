import { getTokenApr } from '$lib/server/yields';
import type { PageServerLoad } from './$types';
import { searchAave, searchCompound, searchMorpho } from './lending';
import { isCorrelated } from './utils';

export const load: PageServerLoad = async ({ url }) => {
  // const bribes = url.searchParams.getAll('bribe'); // count bribe emissions in the apy
  const validChains = ['mainnet', 'zksync', 'mantle', 'base', 'arbitrum', 'berachain'] as const;
  const chainsParam = url.searchParams.getAll('chain');
  const chains = chainsParam.length > 0
    ? validChains.filter(chain => chainsParam.includes(chain))
    : validChains;

  const validExposures = ['btc', 'eth', 'usd'] as const;
  const exposuresParam = url.searchParams.getAll('exposure');
  const exposures = exposuresParam.length > 0
    ? validExposures.filter(e => exposuresParam.includes(e))
    : validExposures;

  const minLiquidity = toNumber(url.searchParams.get('liquidity')) ?? 10_000;

  const validProtocols = ['aave', 'compound', 'dolomite', 'euler', 'morpho', 'spark', 'zerolend'] as const;
  const protocolsParam = url.searchParams.getAll('protocol');
  const protocols = protocolsParam.length > 0
    ? validProtocols.filter(protocol => protocolsParam.includes(protocol))
    : validProtocols

  const sortOrder = url.searchParams.get('sort') ?? 'yield';
  // const page = Number(url.searchParams.get('page') ?? '1');

  const results = await Promise.all(protocols.map(async protocol => {
    switch (protocol) {
      case 'aave': return await searchAave(chains);
      case 'compound': return await searchCompound(chains);
      case 'morpho': return await searchMorpho(chains);

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
      const supplyTokenApr = await getTokenApr(item.supplyAsset.symbol, item.chainId, item.supplyAsset.address);
      const collateralApr = (1 + item.supplyApr.weekly) * (1 + supplyTokenApr) - 1;
      const borrowTokenApr = await getTokenApr(item.borrowAsset.symbol, item.chainId, item.borrowAsset.address);
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
