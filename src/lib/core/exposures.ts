export const exposures = {
  btc: { name: 'BTC' },
  eth: { name: 'ETH' },
  usd: { name: 'USD' },
};

export type Exposure = keyof typeof exposures;
