'use client'

import { createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'

// Polkadot Hub Testnet Configuration
const POLKADOT_HUB_TESTNET_RPC = 'https://eth-rpc-testnet.polkadot.io/'
const POLKADOT_HUB_TESTNET_CHAIN_ID = 420420417

export const polkadotHubTestnet = {
  id: POLKADOT_HUB_TESTNET_CHAIN_ID,
  name: 'Polkadot Hub TestNet',
  network: 'polkadot-hub-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Paseo',
    symbol: 'PAS',
  },
  rpcUrls: {
    default: { http: [POLKADOT_HUB_TESTNET_RPC] },
    public: { http: [POLKADOT_HUB_TESTNET_RPC] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout-testnet.polkadot.io' },
  },
  testnet: true,
} as const

export const config = createConfig({
  chains: [polkadotHubTestnet],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [polkadotHubTestnet.id]: http(POLKADOT_HUB_TESTNET_RPC),
  },
})

export { polkadotHubTestnet as activeChain }
export type Config = typeof config
