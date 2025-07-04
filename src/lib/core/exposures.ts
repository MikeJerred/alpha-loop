export const exposures = {
  btc: { name: 'BTC' },
  eth: { name: 'ETH' },
  usd: { name: 'USD' },
} as const;

export type Exposure = keyof typeof exposures;
