import { arbitrum, base, linea, mainnet, mantle, optimism, polygon, scroll, unichain, zksync } from 'viem/chains';

export const chains = {
  arbitrum: [arbitrum, [
    'https://arbitrum-one.public.blastapi.io',
    ...arbitrum.rpcUrls.default.http,
  ]],
  base: [base, [
    'https://base-mainnet.public.blastapi.io',
    'https://base.llamarpc.com',
    ...base.rpcUrls.default.http,
  ]],
  linea: [linea, [
    'https://linea-mainnet.public.blastapi.io',
    ...linea.rpcUrls.default.http,
  ]],
  mainnet: [mainnet, [
    'https://eth-mainnet.public.blastapi.io',
    'https://eth.llamarpc.com',
    ...mainnet.rpcUrls.default.http,
  ]],
  mantle: [mantle, [
    'https://mantle-mainnet.public.blastapi.io',
    ...mantle.rpcUrls.default.http,
  ]],
  optimism: [optimism, [
    'https://optimism-mainnet.public.blastapi.io',
    ...optimism.rpcUrls.default.http,
  ]],
  polygon: [polygon, [
    `https://polygon-mainnet.public.blastapi.io`,
    ...polygon.rpcUrls.default.http,
  ]],
  scroll: [scroll, [
    'https://scroll-mainnet.public.blastapi.io',
    ...scroll.rpcUrls.default.http,
  ]],
  unichain: [unichain, [
    `https://unichain-mainnet.public.blastapi.io`,
    ...unichain.rpcUrls.default.http,
  ]],
  zksync: [zksync, [
    'https://zksync-mainnet.public.blastapi.io',
    ...zksync.rpcUrls.default.http,
  ]],
} as const;

export type Chain = keyof typeof chains;
export type ChainId = typeof chains[Chain][0]['id'];
