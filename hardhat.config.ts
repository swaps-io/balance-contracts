import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import 'hardhat-contract-sizer';
import 'dotenv/config';

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || '';
const BINANCE_RPC_URL = process.env.BINANCE_RPC_URL || '';
const GNOSIS_RPC_URL = process.env.GNOSIS_RPC_URL || '';
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || '';

const EMPTY_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || EMPTY_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    ethereum: {
      url: ETHEREUM_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    binance: {
      url: BINANCE_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    gnosis: {
      url: GNOSIS_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    arbitrum: {
      url: ARBITRUM_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: true,
    runOnCompile: true,
    strict: true,
    only: [
      'contracts/BalanceCollector.sol',
      'contracts/BalanceCollector2.sol',
    ],
  },
};

export default config;
