import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * Auto-KYC Approval API (DEMO ONLY)
 *
 * This endpoint is called internally after a user submits a KYC request.
 * It uses the admin private key server-side to auto-approve the KYC.
 * This is purely for demo purposes and never exposed in the UI.
 */

const AUTO_KYC_ENABLED = process.env.AUTO_KYC_ENABLED === 'true';
const ADMIN_PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Polkadot Hub Testnet RPC
const POLKADOT_HUB_RPC = 'https://eth-rpc-testnet.polkadot.io/';

const REMITTANCE_ABI = [
  'function approveKYC(address user, uint8 tier) external',
  'function getKYCStatus(address user) external view returns (uint8)',
  'function requestKYC(string calldata documentHash) external',
];

// KYC Status enum matching contract
const KYC_STATUS = {
  NONE: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
};

// Default tier for auto-approved users (Tier 1 = basic)
const DEFAULT_AUTO_TIER = 1;

export async function POST(request: NextRequest) {
  try {
    // Check if auto-KYC is enabled
    if (!AUTO_KYC_ENABLED) {
      return NextResponse.json(
        { error: 'Auto-KYC is not enabled' },
        { status: 403 }
      );
    }

    // Validate server configuration
    if (!ADMIN_PRIVATE_KEY || !CONTRACT_ADDRESS) {
      console.error('❌ Auto-KYC: Missing PRIVATE_KEY or CONTRACT_ADDRESS');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userAddress, tier } = body;

    // Validate user address
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid user address' },
        { status: 400 }
      );
    }

    const approvalTier = tier || DEFAULT_AUTO_TIER;

    console.log(`🤖 Auto-KYC: Processing approval for ${userAddress} at Tier ${approvalTier}`);

    const provider = new ethers.JsonRpcProvider(POLKADOT_HUB_RPC);
    const adminWallet = new ethers.Wallet(
      ADMIN_PRIVATE_KEY.startsWith('0x') ? ADMIN_PRIVATE_KEY : `0x${ADMIN_PRIVATE_KEY}`,
      provider
    );
    const contract = new ethers.Contract(CONTRACT_ADDRESS, REMITTANCE_ABI, adminWallet);

    // Check current KYC status
    const currentStatus = await contract.getKYCStatus(userAddress);
    console.log(`📋 Current KYC status for ${userAddress}: ${currentStatus}`);

    if (Number(currentStatus) === KYC_STATUS.APPROVED) {
      console.log(`✅ User ${userAddress} already approved`);
      return NextResponse.json({
        success: true,
        message: 'User already KYC approved',
        alreadyApproved: true,
      });
    }

    if (Number(currentStatus) !== KYC_STATUS.PENDING) {
      console.log(`⏳ User ${userAddress} has no pending KYC request (status: ${currentStatus})`);
      return NextResponse.json({
        success: false,
        message: 'No pending KYC request found. The user must submit a KYC request first.',
        status: Number(currentStatus),
      });
    }

    // Auto-approve the KYC
    console.log(`📝 Sending approveKYC transaction for ${userAddress}...`);
    const tx = await contract.approveKYC(userAddress, approvalTier);
    console.log(`⏳ Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Auto-KYC approved for ${userAddress} at Tier ${approvalTier}, tx: ${receipt.hash}`);

    return NextResponse.json({
      success: true,
      message: `KYC auto-approved for demo`,
      transactionHash: receipt.hash,
      tier: approvalTier,
    });
  } catch (error) {
    console.error('❌ Auto-KYC error:', error);

    // Parse revert reason if possible
    const errorMessage =
      error instanceof Error
        ? error.message.includes('No pending request')
          ? 'No pending KYC request found on-chain. Submit KYC first.'
          : error.message
        : 'Auto-KYC approval failed';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
