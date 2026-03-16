# PolkaPay 💸

A secure, blockchain-based remittance platform with KYC verification, built on Polkadot Hub Testnet. PolkaPay enables fast, transparent cross-border money transfers with tiered verification levels and automated compliance.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue?logo=solidity)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Wagmi](https://img.shields.io/badge/Wagmi-2.16-purple)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Features

### 🔐 Security & Compliance
- **Multi-tier KYC Verification** - 4-tier verification system with document upload to IPFS
- **Smart Contract Security** - OpenZeppelin-based contracts with ReentrancyGuard and Pausable
- **Role-based Access Control** - Separate admin and user interfaces
- **Whitelist/Blacklist Management** - Advanced user access control
- **Account Freeze Capability** - Emergency account suspension

### 💰 Financial Operations
- **Tiered Transaction Limits** - Daily limits based on KYC verification level
- **Low Transaction Fees** - 0.00125% fee on all transfers
- **Instant Remittance** - Send money to any verified wallet address
- **Claim-based System** - Recipients claim funds when ready
- **Real-time Balance Tracking** - Live balance and limit monitoring

### 📊 Analytics & Management
- **Transaction History** - Complete audit trail of all transfers
- **Admin Dashboard** - Comprehensive platform management
- **User Dashboard** - Personal transaction and KYC management
- **Real-time Analytics** - Transaction metrics and reporting
- **Batch KYC Approval** - Efficient bulk user verification

## 🏗️ Tech Stack

### Blockchain
- **Smart Contracts**: Solidity 0.8.24
- **Development**: Hardhat 2.26.3
- **Security**: OpenZeppelin Contracts 5.4.0
- **Network**: Polkadot Hub Testnet (Paseo)

### Frontend
- **Framework**: Next.js 16 (App Router, Metadata API, file-based OG/Twitter images)
- **Language**: TypeScript 5.x
- **Blockchain Integration**: Wagmi 2.16, Viem 2.37, Ethers 6.4
- **State Management**: TanStack Query 5.x
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI + shadcn/ui
- **SEO**: Centralized Metadata, JSON-LD structured data, dynamic Open Graph & Twitter images
- **Forms**: React Hook Form + Zod
- **Storage**: IPFS via Pinata

## 📁 Project Structure

```
PolkaPay/
├── contracts/
│   └── Remittance.sol              # Main smart contract with KYC & limit libraries
├── app/
│   ├── layout.tsx                  # Root layout (providers, global metadata, JSON-LD)
│   ├── page.tsx                    # Landing / Operational Console
│   ├── globals.css                 # Global styles & color theme
│   ├── opengraph-image.tsx         # Default OG image generator
│   ├── twitter-image.tsx           # Default Twitter image (reuses OG)
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout (AdminLayoutGuard)
│   │   ├── page.tsx                # Admin console overview
│   │   └── [section]/page.tsx      # overview | kyc | users | transactions | settings
│   │   ├── opengraph-image.tsx     # Admin OG image
│   │   └── twitter-image.tsx       # Admin Twitter image
│   ├── user/
│   │   ├── layout.tsx              # User layout (UserLayoutGuard)
│   │   ├── page.tsx                # User console overview
│   │   └── [section]/page.tsx      # overview | send | receive | kyc | transactions | profile
│   │   ├── opengraph-image.tsx     # User OG image
│   │   └── twitter-image.tsx       # User Twitter image
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Shared dashboard shell for standalone pages
│   │   ├── analytics/page.tsx      # Standalone analytics
│   │   ├── contract/page.tsx       # Standalone send / claim
│   │   └── kyc/page.tsx            # Standalone KYC status + form
│   └── api/
│       └── kyc/
│           ├── submit/route.ts     # IPFS upload endpoint
│           ├── get-request/route.ts# Document retrieval endpoint
│           └── auto-approve/route.ts# Optional auto-approve helper
├── components/
│   ├── layout/                     # Sidebars & dashboard shell
│   │   ├── admin-sidebar.tsx
│   │   ├── user-sidebar.tsx
│   │   ├── admin-layout-guard.tsx  # RequireAuth + RequireAdmin + AdminSidebar + Navbar
│   │   ├── user-layout-guard.tsx   # RequireAuth + UserSidebar + Navbar
│   │   └── dashboard-shell.tsx
│   ├── auth/                       # Login & auth guards
│   │   ├── login-form.tsx
│   │   ├── require-auth.tsx
│   │   ├── require-admin.tsx
│   │   ├── loading-screen.tsx
│   │   └── network-guard.tsx
│   ├── dashboard/
│   │   ├── admin-dashboard.tsx     # Admin tab content router
│   │   └── user-dashboard.tsx      # User tab content router
│   ├── kyc/                        # KYC submission & management
│   ├── contract/                   # Send & Claim forms
│   ├── tabs/                       # Admin & user tab components
│   ├── analytics/                  # Transaction analytics & widgets
│   └── ui/                         # shadcn/ui components + Navbar, StatCard, PageContainer, etc.
├── contexts/
│   └── auth-context.tsx            # Authentication & role management
├── hooks/
│   └── use-contract.ts             # Contract interaction helper
├── lib/
│   ├── constants.ts                # Chain ID, contract address helpers
│   ├── nav-config.ts               # Central nav definitions for admin/user
│   ├── contract.ts                 # Contract wrapper class
│   ├── wagmi.ts                    # Wagmi configuration
│   ├── utils.ts                    # Misc utilities
│   ├── metadata.ts                 # Centralized Metadata + JSON-LD definitions
│   └── og-generator.tsx            # Reusable Open Graph / Twitter image generator
├── scripts/
│   └── deploy.js                   # Contract deployment script
├── hardhat.config.cjs              # Hardhat configuration
├── next.config.mjs                 # Next.js configuration (incl. optimizePackageImports)
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- MetaMask or compatible Web3 wallet
- Polkadot Hub Testnet PAS tokens (for gas fees)
- Pinata account (for IPFS storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/contributorsambhav/PolkaPay.git
cd PolkaPay

# Install dependencies
pnpm install
```

### Environment Setup

Create a `.env` file in the root directory:

```bash
# Blockchain Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...              # Deployed contract address
NEXT_PUBLIC_RPC_URL=https://eth-rpc-testnet.polkadot.io/
NEXT_PUBLIC_CHAIN_ID=420420417                  # Polkadot Hub TestNet
NEXT_PUBLIC_ADMIN_ADDRESS=0x...                 # Admin wallet address
NEXT_PUBLIC_SYMBOL=PAS                          # Native currency symbol

# Pinata IPFS Configuration
PINATA_JWT_SECRET=eyJ...                        # Pinata JWT token
NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key

# Hardhat Deployment (for contract deployment)
PRIVATE_KEY=your_private_key_without_0x
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/... # Optional
```

### Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to Polkadot Hub Testnet
npx hardhat run scripts/deploy.js --network polkadotHubTestnet

# Run tests
npx hardhat test

# Check gas usage
REPORT_GAS=true npx hardhat test
```

### Frontend Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📚 Smart Contract Overview

### Contract: `Remittance.sol`

#### KYC Status Levels
- `NONE (0)` - No KYC submitted
- `PENDING (1)` - Under review
- `APPROVED (2)` - Verified and active
- `REJECTED (3)` - Verification failed

#### User Tiers & Daily Limits
| Tier | Daily Limit | Use Case |
|------|-------------|----------|
| TIER1 | 1,500 ETH | Basic verification |
| TIER2 | 3,000 ETH | Standard verification |
| TIER3 | 6,000 ETH | Premium verification

#### Key Functions

**User Functions:**
```solidity
requestKYC(string documentHash)           // Submit KYC request
sendRemittance(address recipient) payable // Send money
claimRemittance()                         // Claim received funds
getMyBalance()                            // Check balance
getMyKYCStatus()                          // Check KYC status
getMyRemainingLimit()                     // Check daily limit
```

**Admin Functions:**
```solidity
approveKYC(address user, uint8 tier)      // Approve KYC
rejectKYC(address user, string reason)    // Reject KYC
batchApprove(address[] users, uint8[] tiers) // Bulk approve
setBlacklist(address user, bool status)   // Blacklist user
freezeRecipient(address user, bool frozen) // Freeze account
pause() / unpause()                       // Emergency control
```

#### Transaction Fee
- **Rate**: 0.00125% (125 / 10,000,000)
- **Example**: Sending 1000 ETH costs 0.0125 ETH fee
- **Collection**: Admin can withdraw accumulated fees

## 🎨 User Interface

### User Dashboard
- **Overview Tab** - Balance, limits, recent activity
- **Send Money** - Transfer funds to verified users
- **Receive** - Claim incoming transfers
- **KYC Verification** - Submit and track verification
- **Transactions** - Complete transaction history
- **Profile** - Account details and settings

### Admin Dashboard
- **Overview** - Platform statistics
- **KYC Management** - Approve/reject requests
- **User Management** - User access control
- **Transactions** - Platform-wide analytics
- **System Settings** - Tier limits, fees, controls

## 🔄 KYC Workflow

1. **User Submits KYC**
   - Fill personal details (country, phone, ID)
   - Select verification tier
   - Upload government ID (JPG/PNG/PDF)
   - Data encrypted and uploaded to IPFS
   - Document hash stored on-chain

2. **Admin Reviews**
   - View pending requests
   - Review documents from IPFS
   - Approve with tier assignment or reject with reason

3. **User Gets Access**
   - Whitelisted upon approval
   - Daily limits based on tier
   - Can send/receive remittances

## 🔐 Security Features

### Smart Contract Security
- ✅ OpenZeppelin battle-tested libraries
- ✅ ReentrancyGuard on fund operations
- ✅ Pausable for emergency stops
- ✅ Ownable for admin control
- ✅ Input validation and access control

### Frontend Security
- ✅ Wallet signature verification
- ✅ Role-based UI access control
- ✅ Form validation with Zod schemas
- ✅ IPFS document encryption
- ✅ CORS protection on API routes

### Data Privacy
- ✅ KYC documents on IPFS (decentralized)
- ✅ Only document hash on-chain
- ✅ Admin-only access to sensitive data
- ✅ User privacy controls

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test
npx hardhat test test/Lock.js

# Coverage report
npx hardhat coverage
```

## 📊 API Documentation

### POST `/api/kyc/submit`
Upload KYC data and documents to IPFS.

**Request (multipart/form-data):**
```typescript
{
  document: File,
  mobileNo: string,
  country: string,
  idType: string,
  idNumber: string,
  requestedTier: string,
  additionalData: string,
  walletAddress: string
}
```

**Response:**
```json
{
  "success": true,
  "documentHash": "Qm...",
  "ipfsUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
  "documentUrl": "https://gateway.pinata.cloud/ipfs/Qm..."
}
```

### GET `/api/kyc/get-request?cid={hash}`
Retrieve KYC document from IPFS.

**Response:** Binary file (image/PDF) with appropriate content-type

## 🌐 Network Configuration

### Polkadot Hub TestNet
- **Network Name**: Polkadot Hub TestNet
- **Chain ID**: 420420417
- **RPC URL**: https://eth-rpc-testnet.polkadot.io/
- **Currency**: PAS (Paseo)
- **Block Explorer**: https://blockscout-testnet.polkadot.io

### Add to MetaMask
```javascript
{
  chainId: "0x190FECE1", // 420420417 in hex
  chainName: "Polkadot Hub TestNet",
  nativeCurrency: {
    name: "Paseo",
    symbol: "PAS",
    decimals: 18
  },
  rpcUrls: ["https://eth-rpc-testnet.polkadot.io/"],
  blockExplorerUrls: ["https://blockscout-testnet.polkadot.io"]
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Repository Owner**: [@contributorsambhav](https://github.com/contributorsambhav)

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## 🗺️ Roadmap

- [ ] Multi-currency support
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Automated compliance reporting
- [ ] Integration with fiat on/off ramps
- [ ] Multi-signature admin controls
- [ ] Recurring payment support
- [ ] API for third-party integrations

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Wagmi team for excellent React hooks
- Radix UI for accessible components
- Pinata for IPFS infrastructure
- Polkadot for the testnet environment

---

**Built with ❤️ for secure, transparent remittances**
