import { createPublicClient, http, type HttpTransport, type PublicClient } from 'viem';
import {
  arbitrum,
  base,
  berachain,
  gnosis,
  linea,
  mainnet,
  mantle,
  optimism,
  polygon,
  scroll,
  zksync,
} from 'viem/chains';

export const chains = {
  arbitrum,
  base,
  berachain,
  gnosis,
  linea,
  mainnet: {
    ...mainnet,
    rpcUrls: {
      ...mainnet.rpcUrls,
      default: {
        ...mainnet.rpcUrls.default,
        http: ['https://eth.meowrpc.com'],
      },
    },
  } as const,
  mantle,
  optimism,
  polygon,
  scroll,
  zksync,
};

const clients = Object.fromEntries(
  Object.entries(chains).map(([name, chain]) => [name, createPublicClient({
    batch: { multicall: true },
    chain,
    transport: http(),
  })])
) as { [K in keyof typeof chains]: PublicClient<HttpTransport, typeof chains[K]> };

export type ChainName = keyof typeof chains;

export type ChainId = typeof chains[keyof typeof chains]['id'];

export const getChainId = <T extends keyof typeof chains>(name: T): typeof chains[T]['id'] => chains[name].id;
export const getChainName = <T extends ChainId>(id: T) => Object.entries(chains).find(([, chain]) => chain.id === id)?.[0];

export const getViemClient = <T extends keyof typeof chains>(name: T) => clients[name];

export const getViemClientFromId = <T extends ChainId>(id: T) =>
  Object.values(clients).find(client => client.chain.id === id) as PublicClient<
    HttpTransport,
    Extract<typeof chains[keyof typeof chains], { id: T }>
  >;

export const toFilteredChainIds = <T extends keyof typeof chains, V extends keyof typeof chains>(
  chainNames: readonly T[],
  validChainNames: readonly V[],
): (typeof chains[(T & V)])['id'][] =>
  chainNames
    .filter(name => validChainNames.includes(name as unknown as V))
    .map(name => getChainId(name));
