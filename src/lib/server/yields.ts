import { apyToApr } from '$lib/core/utils';

const defiLlamaPools = {
  wsteth: '747c1d2a-c668-4682-b9f9-296708a3dd90',
  cbeth: '0f45d730-b279-4629-8e11-ccb5cc3038b4',
  weeth: '46bd2bdf-6d92-4066-b482-e885ee172264',
  rseth: '33c732f6-a78d-41da-af5b-ccd9fa5e52d5',
  wrseth: '33c732f6-a78d-41da-af5b-ccd9fa5e52d5',
  meth: 'b9f2f00a-ba96-4589-a171-dde979a23d87',
  ezeth: 'e28e32b5-e356-41d9-8dc7-a376ece56619',
  woeth: '423681e3-4787-40ce-ae43-e9f67c5269b3',
  wsuperoethb: 'f388573e-5c0f-4dac-9f70-116a4aabaf17',
  oseth: '4d01599c-69ae-41a3-bae1-5fab896f04c8',
  reth: 'd4b3c522-6127-4b89-bedf-83641cdcd2eb',
  susds: 'd8c4eff5-c8a9-46fc-a888-057c4c668e72',
  susde: '66985a81-9c51-46ca-9977-42b4fe7bc6df',
  ethx: '90bfb3c2-5d35-4959-a275-ba5085b08aa3',
  yneth: '44dd4153-aa9f-4616-9a88-e6803c86b995',
  ynethx: 'e3c59895-d6ad-4634-b257-f599f1a1a4a0',
  rsweth: 'eff9b43c-a80d-4bfc-9f9e-55e02a8ef619',
  stusr: '0aedb3f6-9298-49de-8bb0-2f611a4df784',
  wstusr: '0aedb3f6-9298-49de-8bb0-2f611a4df784',
  rlp: '2ad8497d-c855-4840-85ad-cdc536b92ced',
  'usd0++': '55b0893b-1dbb-47fd-9912-5e439cd3d511',
  srusd: '402b0554-9525-40af-8703-3c59b0aa863c',
  stusdt: 'e1b9420a-30d4-4c27-8e01-2d6cd240e1b9',
  bsdeth: 'ca775845-b68a-4084-8d8d-29c31970a643',
  hyusd: '8449ce9a-fc8d-4d93-991a-55113fa80a5a',
};

export async function getTokenApr(symbol: string, chainId: number, address: string) {
  symbol = symbol.toLowerCase();
  if (symbol.startsWith('pt-')) {
    const markets = await getPendleMarkets(chainId);
    const market = markets.find(({ pt }) => pt.toLowerCase() === `${chainId}-${address}`.toLowerCase());
    if (market) {
      return apyToApr(market.details.impliedApy);
    }
  }
  if (symbol.startsWith('lp-')) {
    const res = await fetch(`https://api-v2.pendle.finance/core/v2/${chainId}/markets/${address}/data`);
    const { aggregatedApy } = await res.json() as { impliedApy: number, aggregatedApy: number };
    return apyToApr(aggregatedApy);
  }

  if (isValidDefiLlama(symbol)) {
    const pool = defiLlamaPools[symbol];
    const res = await fetch(`https://yields.llama.fi/poolsEnriched?pool=${pool}`);
    const { data } = await res.json() as { data: { apy: number, apyMean30d: number }[] };
    return apyToApr(data[0].apyMean30d / 100);
  }

  return 0;
}

async function getPendleMarkets(chainId: number) {
  const res = await fetch(`https://api-v2.pendle.finance/core/v1/${chainId}/markets/active`);
  const { markets } = await res.json() as {
    markets: {
      address: string,
      pt: string,
      yt: string,
      details: {
        liquidity: number,
        impliedApy: number,
      },
    }[],
  };
  return markets;
}

const isValidDefiLlama = (symbol: string): symbol is keyof typeof defiLlamaPools => Object.hasOwn(defiLlamaPools, symbol);
