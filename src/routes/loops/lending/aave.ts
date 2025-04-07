import { erc20Abi } from 'abitype/abis';
import { createPublicClient, getContract, http } from 'viem';
import { arbitrum, base, mainnet, scroll, zksync } from 'viem/chains';
import aavePoolAbi from '$lib/abi/aave-pool';
import aavePoolAddressesProviderAbi from '$lib/abi/aave-pool-addresses-provider';
import { isCorrelated, toChainId, type Chain, type YieldLoop } from '../utils';

const poolAddressesProviderMap = {
  ethereum: [
    '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
    '0xcfBf336fe147D643B9Cb705648500e101504B16d',
    '0xeBa440B438Ad808101d1c451C1C5322c90BEFCdA',
  ],
  arbitrum: ['0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb'],
  base: ['0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D'],
  scroll: ['0x69850D0B276776781C063771b161bd8894BCdD04'],
  zksync: ['0x2A3948BB219D6B2Fa83D64100006391a96bE6cb7'],
} as const;

export async function searchAave(chainsInput: readonly Chain[]): Promise<YieldLoop[]> {
  const validChains = ['zksync'] as const; // ['ethereum', 'base', 'arbitrum', 'scroll', 'zksync'] as const;
  const chains = validChains.filter(chain => chainsInput.includes(chain));

  if (chains.length === 0) return [];

  const results: YieldLoop[] = [];

  for (const chain of chains) {
    const client = createPublicClient({
      chain: getViemChain(chain),
      transport: http()
    });

    for (const poolAddressesProviderAddress of poolAddressesProviderMap[chain]) {
      const poolAddressesProvider = getContract({
        address: poolAddressesProviderAddress,
        abi: aavePoolAddressesProviderAbi,
        client,
      });

      const poolAddress = await poolAddressesProvider.read.getPool();
      const pool = getContract({
        address: poolAddress,
        abi: aavePoolAbi,
        client,
      });

      const tokenAddresses = await pool.read.getReservesList();

      const tokenInfos = await Promise.all(tokenAddresses.map(async address => {
        const erc20Token = getContract({
          address,
          abi: erc20Abi,
          client,
        });
        const symbol = await erc20Token.read.symbol().catch(() => null);
        const config = parseConfig((await pool.read.getConfiguration([address])).data);

        return {
          enabled: !config.frozen && !config.paused && config.active,
          address,
          symbol,
          config,
        };
      }));

      const eModes = (await Promise.all([1, 2, 3, 4].map(async eMode => {
        const supplyBitmap = await pool.read.getEModeCategoryCollateralBitmap([eMode]);
        const borrowBitmap = await pool.read.getEModeCategoryBorrowableBitmap([eMode]);

        if (supplyBitmap === 0n || borrowBitmap === 0n) {
          return null;
        }

        const data = await pool.read.getEModeCategoryCollateralConfig([eMode]);

        return {
          eMode,
          ltv: data.ltv,
          lltv: data.liquidationThreshold,
          supplyBitmap,
          borrowBitmap,
        };
      }))).filter(x => x !== null);
      // const eModeMap = new Map(eModes.map(info => [info.eMode, info]));

      for (const [supplyIndex, supplyToken] of tokenInfos.entries()) {
        if (!supplyToken.enabled || !supplyToken.symbol) continue;

        for (const [borrowIndex, borrowToken] of tokenInfos.entries()) {
          if (!borrowToken.enabled || !borrowToken.config.borrowEnabled || !borrowToken.symbol) continue;

          if (
            (!isCorrelated(supplyToken.symbol, 'btc') || !isCorrelated(borrowToken.symbol, 'btc')) &&
            (!isCorrelated(supplyToken.symbol, 'eth') || !isCorrelated(borrowToken.symbol, 'eth')) &&
            (!isCorrelated(supplyToken.symbol, 'usd') || !isCorrelated(borrowToken.symbol, 'usd'))
          ) {
            continue;
          }

          // allow for 3% price drop
          let ltv = Math.min(supplyToken.config.ltv, supplyToken.config.lltv * 0.97);

          const validEModes = eModes.filter(eMode => getBit(eMode.supplyBitmap, supplyIndex) && getBit(eMode.borrowBitmap, borrowIndex));
          if (validEModes.length > 0) {
            ltv = Math.max(...validEModes.map(eMode => Math.min(eMode.ltv, eMode.lltv * 0.97) / 10000))
          }

          const chainId = toChainId(chain);
          const supplyApr = (await getYieldApr(supplyToken.address, poolAddressesProviderAddress, chainId))?.supply ?? 0;
          const borrowApr = (await getYieldApr(borrowToken.address, poolAddressesProviderAddress, chainId))?.borrow;

          if (borrowApr === undefined) continue;

          results.push({
            protocol: 'aave',
            chainId,
            loanAsset: {
              address: borrowToken.address,
              symbol: borrowToken.symbol,
            },
            collateralAsset: {
              address: supplyToken.address,
              symbol: supplyToken.symbol,
            },
            supplyApr: {
              daily: supplyApr,
              weekly: supplyApr,
              monthly: supplyApr,
              yearly: supplyApr,
            },
            borrowApr: {
              daily: borrowApr,
              weekly: borrowApr,
              monthly: borrowApr,
              yearly: borrowApr,
            },
            liquidity: 1_000_000,
            ltv,
            link: `https://app.aave.com/`,
          });
        }
      }
    }
  }

  return results;
}

function getViemChain(chain: Chain) {
  switch (chain) {
    case 'arbitrum': return arbitrum;
    case 'base': return base;
    case 'ethereum': return mainnet;
    case 'scroll': return scroll;
    case 'zksync': return zksync;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

async function getYieldApr(tokenAddress: `0x${string}`, poolAddressesProvider: `0x${string}`, chainId: number) {
  const id = `${tokenAddress}${poolAddressesProvider}${chainId}`;
  const timestamp = Math.floor(Date.now() / 1000) - 10*24*60*60;
  const res = await fetch(`https://aave-api-v2.aave.com/data/rates-history?reserveId=${id}&from=${timestamp}&resolutionInHours=6`);
  const data = await res.json() as { liquidityRate_avg: number, variableBorrowRate_avg: number }[];
  if (!data || data.length === 0) {
    return null;
  }
  return {
    supply: data[data.length - 1].liquidityRate_avg,
    borrow: data[data.length - 1].variableBorrowRate_avg,
  };
}

function getBit(bitmap: bigint, bit: number) {
  const mask = 0b1n << BigInt(bit);
  return Boolean(bitmap & mask);
}

function parseConfig(data: bigint) {
  const getBits = (start: number, end: number) => {
    const shift = BigInt(end) + 1n;
    const mask = (0b1n << shift) - 1n;
    return (data & mask) >> BigInt(start);
  };

  return {
    ltv: Number(getBits(0, 15)) / 10000,
    lltv: Number(getBits(16, 31)) / 10000,
    liquidationBonus: Number(getBits(32, 47)),
    decimals: Number(getBits(48, 55)),
    active: Boolean(getBits(56, 56)),
    frozen: Boolean(getBits(57, 57)),
    borrowEnabled: Boolean(getBits(58, 58)),
    stableRateBorrowEnabled: Boolean(getBits(59, 59)),
    paused: Boolean(getBits(60, 60)),
    isolationBorrowEnabled: Boolean(getBits(61, 61)),
    siloBorrowEnabled: Boolean(getBits(62, 62)),
    flashloanEnabled: Boolean(getBits(63, 63)),
    reserveFactor: Number(getBits(64, 79)),
    borrowCap: Number(getBits(80, 115)),
    supplyCap: Number(getBits(116, 151)),
    liquidationFee: Number(getBits(152, 167)),
    eMode: Number(getBits(168, 175)),
  };
}
