import { createPublicClient, createWalletClient, custom, erc20Abi, fallback, getContract, http, type EIP1193Provider } from 'viem';
import { CompoundCometABI } from '$lib/abi/CompoundComet';
import { chains, isDefined } from '$lib/core';

const markets = [
  // [chains.mainnet, 'USDC', '0xc3d688B66703497DAA19211EEdff47f25384cdc3'],
  // [chains.mainnet, 'WETH', '0xA17581A9E3356d9A858b789D68B4d866e593aE94'],
  // [chains.mainnet, 'USDT', '0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840'],
  // [chains.mainnet, 'wstETH', '0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3'],
  // [chains.mainnet, 'USDS', '0x5D409e56D886231aDAf00c8775665AD0f9897b56'],
  // [chains.polygon, 'USDC', '0xF25212E676D1F7F89Cd72fFEe66158f541246445'],
  // [chains.polygon, 'USDT', '0xaeB318360f27748Acb200CE616E389A6C9409a07'],
  // [chains.arbitrum, 'USDC.e', '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA'],
  [chains.arbitrum, 'USDC', '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf'],
  // [chains.arbitrum, 'WETH', '0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486'],
  // [chains.arbitrum, 'USDT', '0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07'],
  // [chains.base, 'USDC', '0xb125E6687d4313864e53df431d5425969c15Eb2F'],
  // [chains.base, 'USDbC', '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf'],
  // [chains.base, 'WETH', '0x46e6b214b524310239732D51387075E0e70970bf'],
  // [chains.base, 'AERO', '0x784efeB622244d2348d4F2522f8860B96fbEcE89'],
  // [chains.scroll, 'USDC', '0xB2f97c1Bd3bf02f5e74d13f02E3e26F93D77CE44'],
  // [chains.optimism, 'USDC', '0x2e44e174f7D53F0212823acC11C01A11d58c5bCB'],
  // [chains.optimism, 'USDT', '0x995E394b8B2437aC8Ce61Ee0bC610D617962B214'],
  // [chains.optimism, 'WETH', '0xE36A30D249f7761327fd973001A32010b521b6Fd'],
  // [chains.mantle, 'USDe', '0x606174f62cd968d8e684c645080fa694c1D7786E'],
] as const;

export const getCompoundPositions = async (ethereum: EIP1193Provider) => {
  return await Promise.all(markets.map(async ([[chain, rpcUrls], baseToken, address]) => {
    const walletClient = createWalletClient({
      chain,
      transport: custom(ethereum),
    });
    const [userAddress] = await walletClient.requestAddresses();

    const client = createPublicClient({
      chain,
      transport: fallback(rpcUrls.map(url => http(url))),
    });

    const comet = getContract({ abi: CompoundCometABI, address, client });

    const borrowedAmount = await comet.read.borrowBalanceOf([userAddress]);
    const borrowAddress = await comet.read.baseToken();
    const borrowPriceFeed = await comet.read.baseTokenPriceFeed();
    const borrowScale = await comet.read.baseScale();
    const borrowUsdPrice = await comet.read.getPrice([borrowPriceFeed]);

    const assetCount = await comet.read.numAssets();
    const supplied = (await Promise.all([...new Array(assetCount)].map(async (_, i) => {
      const asset = await comet.read.getAssetInfo([i]);
      const address = asset.asset;
      const amount = await comet.read.collateralBalanceOf([userAddress, asset.asset]);
      if (amount <= 0) return null;

      const price = await comet.read.getPrice([asset.priceFeed]);
      const symbol = await client.readContract({ abi: erc20Abi, address, functionName: 'symbol' });

      return {
        address,
        symbol,
        amount: Number(10n**8n * amount / asset.scale) / 10**8,
        usdValue: Number(price * amount / asset.scale) / 10**8,
      };
    }))).filter(isDefined);

    const borrowed = [{
      address: borrowAddress,
      symbol: baseToken,
      amount: Number(10n**8n * borrowedAmount / borrowScale) / 10**8,
      usdValue: Number(borrowUsdPrice * borrowedAmount / borrowScale) / 10**8,
    }];

    return {
      chainId: chain.id,
      provider: 'compound' as const,
      supplied,
      borrowed,
      total: supplied.reduce((total, { usdValue }) => total + usdValue, 0)
        - borrowed.reduce((total, { usdValue }) => total + usdValue, 0),
    };
  }));
};
