/**
 * Single source of truth for chain and contract config.
 * All components should import from here instead of defining inline.
 */

export const CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID || "420420417",
  10
);

export function getContractAddress(): `0x${string}` | undefined {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return undefined;
  }
  return address as `0x${string}`;
}
