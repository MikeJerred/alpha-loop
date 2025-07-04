import type { Protocol } from '../../lib/core/protocols';

export type YieldLoop = {
  protocol: Protocol,
  chainId: number,
  borrowAsset: {
    address: string,
    symbol: string,
  },
  supplyAsset: {
    address: string,
    symbol: string,
  },
  borrowApr: {
    daily: number,
    weekly: number,
    monthly: number,
    yearly: number,
  },
  supplyApr: {
    daily: number,
    weekly: number,
    monthly: number,
    yearly: number,
  },
  liquidityUSD: number,
  ltv: number,
  link: string,
};

export function isCorrelated(symbol: string, type: 'btc' | 'eth' | 'usd') {
  switch (type) {
    case 'btc':
      return symbol.toLowerCase().includes('btc');
    case 'eth':
      return symbol.toLowerCase().includes('eth');
    case 'usd':
      return symbol.toLowerCase().includes('usd') ||
        symbol.toLowerCase().includes('usr') ||
        symbol.toLowerCase().includes('rlp') ||
        symbol.toLowerCase() === 'gho';
  }
}
