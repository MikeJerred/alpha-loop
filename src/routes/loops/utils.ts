const chainMap = {
  ethereum: 1,
  zksync: 324,
  mantle: 5000,
  base: 8453,
  arbitrum: 42161,
  bera: 80094,
  scroll: 534352,
} as const;

const chainIdMap = new Map(Object.entries(chainMap).map(([key, value]) => [value, key]));

type ChainToId = typeof chainMap;
type IdToChain = { [K in keyof ChainToId as ChainToId[K]]: K };

export type Protocol = 'aave' | 'compound' | 'dolomite' | 'euler' | 'morpho' | 'spark' | 'zerolend';
export type Chain = keyof ChainToId;
export type ChainId = keyof IdToChain;
export type YieldLoop = {
  protocol: Protocol,
  chainId: ChainId,
  loanAsset: {
    address: string,
    symbol: string,
  },
  collateralAsset: {
    address: string,
    symbol: string,
  },
  supplyApr: {
    daily: number,
    weekly: number,
    monthly: number,
    yearly: number,
  },
  borrowApr: {
    daily: number,
    weekly: number,
    monthly: number,
    yearly: number,
  },
  liquidity: number,
  ltv: number,
  link: string,
};

export const toChainId = <T extends Chain>(chain: T) => chainMap[chain];
export const toChain = <T extends ChainId>(chainId: T): IdToChain[T] => chainIdMap.get(chainId) as IdToChain[T];

export const toFilteredChainIds = <T extends Chain>(chains: readonly Chain[], validChains: readonly T[]) =>
  chains
    .filter(chain => validChains.includes(chain as T))
    .map(chain => toChainId(chain as T));

export function isCorrelated(symbol: string, type: 'btc' | 'eth' | 'usd') {
  switch (type) {
    case 'btc':
      return symbol.toLowerCase().includes('btc');
    case 'eth':
      return symbol.toLowerCase().includes('eth');
    case 'usd':
      return symbol.toLowerCase().includes('usd') || symbol.toLowerCase().includes('usr') || symbol.toLowerCase().includes('rlp');
  }
}
