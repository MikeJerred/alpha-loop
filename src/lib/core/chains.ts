export const chains = {
  arbitrum: { id: 42161, name: 'Arbitrum' },
  base: { id: 8453, name: 'Base' },
  bsc: { id: 56, name: 'BNB Smart Chain' },
  linea: { id: 59144, name: 'Linea' },
  mainnet: { id: 1, name: 'Ethereum' },
  mantle: { id: 5000, name: 'Mantle' },
  optimism: { id: 10, name: 'Optimism' },
  polygon: { id: 137, name: 'Polygon' },
  scroll: { id: 5343, name: 'Scroll' },
  zksync: { id: 324, name: 'ZKsync Era' },
} as const;

export type Chain = keyof typeof chains;
export type ChainId = typeof chains[Chain]['id'];
