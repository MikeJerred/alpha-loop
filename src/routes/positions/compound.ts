import type { EIP1193Provider } from 'viem';
import { chains, isDefined } from '$lib/core';

const validChains = [
  chains.arbitrum,
  chains.base,
  chains.linea,
  chains.mainnet,
  chains.mantle,
  chains.optimism,
  chains.polygon,
  chains.scroll,
  chains.unichain,
];

export const getCompoundPositions = async (ethereum: EIP1193Provider) => {
  
};
