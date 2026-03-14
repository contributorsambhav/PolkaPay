require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const { PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // Polkadot Hub Testnet (Paseo)
    polkadotHubTestnet: {
      url: "https://eth-rpc-testnet.polkadot.io/",
      chainId: 420420417,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : [],
    },

    // Sepolia remains for cross-chain reference if needed, but primary is Polkadot
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      chainId: 11155111,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : [],
    },
  },

  defaultNetwork: "polkadotHubTestnet",
};
