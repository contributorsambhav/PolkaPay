import { ethers } from "ethers"
export const REMITTANCE_ABI = [
  "function requestKYC(string calldata documentHash) external",
  "function approveKYC(address user, uint8 tier) external",
  "function rejectKYC(address user, string calldata reason) external",
  "function batchApprove(address[] calldata users, uint8[] calldata tiers) external",
  "function sendRemittance(address recipient) external payable",
  "function claimRemittance() external",
  "function setBlacklist(address user, bool status) external",
  "function setUserTier(address user, uint8 tier) external",
  "function setTierLimit(uint8 tier, uint256 limit) external",
  "function pause() external",
  "function unpause() external",
  "function freezeRecipient(address user, bool frozen) external",
  "function getBalance(address user) external view returns (uint256)",
  "function isWhitelisted(address user) external view returns (bool)",
  "function isBlacklisted(address user) external view returns (bool)",
  "function isFrozen(address user) external view returns (bool)",
  "function isKYCApproved(address user) external view returns (bool)",
  "function getPendingKYC() external view returns (address[])",
  "function getKYCStatus(address user) external view returns (uint8)",
  "function getKYCRequest(address user) external view returns (string memory, uint256, uint8, string memory)",
  "function getUserInfo(address user) external view returns (uint8, uint256, uint256, uint256, bool, bool, bool, uint8)",
  "function getRemainingLimit(address user) external view returns (uint256)",
  "function getTierLimit(uint8 tier) external view returns (uint256)",
  "function getContractBalance() external view returns (uint256)",
  "function getMyBalance() external view returns (uint256)",
  "function getMyKYCStatus() external view returns (uint8)",
  "function getMyTier() external view returns (uint8)",
  "function getMyRemainingLimit() external view returns (uint256)",
  "function getMyWhitelistStatus() external view returns (bool)",
  "function getMyBlacklistStatus() external view returns (bool)",
  "function getMyFrozenStatus() external view returns (bool)",
  "event KYCRequested(address indexed user, string documentHash, uint256 timestamp)",
  "event KYCApproved(address indexed user, uint256 timestamp)",
  "event KYCRejected(address indexed user, string reason, uint256 timestamp)",
  "event Sent(address indexed sender, address indexed recipient, uint256 amount)",
  "event Claimed(address indexed recipient, uint256 amount)",
  "event Frozen(address indexed recipient, bool frozen)",
  "event TierUpdated(address indexed user, uint8 newTier)",
  "event UserWhitelisted(address indexed user, bool status)",
  "event UserBlacklisted(address indexed user, bool status)",
]
export const REMITTANCE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x1234567890123456789012345678901234567890"
export enum UserTier {
  NONE = 0,
  TIER1 = 1,
  TIER2 = 2,
  TIER3 = 3,
  VIP = 4,
}
export enum KYCStatus {
  NONE = 0,
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3,
}
export class RemittanceContract {
  private contract: ethers.Contract | null = null
  private signer: ethers.Signer | null = null
  constructor() {
    this.initializeContract()
  }
  private async initializeContract() {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        this.signer = await provider.getSigner()
        this.contract = new ethers.Contract(REMITTANCE_CONTRACT_ADDRESS, REMITTANCE_ABI, this.signer)
      } catch (error) {
        console.error("Failed to initialize contract:", error)
      }
    }
  }
  async requestKYC(documentHash: string): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.requestKYC(documentHash)
  }
  async approveKYC(userAddress: string, tier: UserTier): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.approveKYC(userAddress, tier)
  }
  async rejectKYC(userAddress: string, reason: string): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.rejectKYC(userAddress, reason)
  }
  async batchApprove(users: string[], tiers: UserTier[]): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.batchApprove(users, tiers)
  }
  async sendRemittance(recipient: string, amount: string): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    const value = ethers.parseEther(amount)
    return await this.contract.sendRemittance(recipient, { value })
  }
  async claimRemittance(): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.claimRemittance()
  }
  async setBlacklist(userAddress: string, status: boolean): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.setBlacklist(userAddress, status)
  }
  async setUserTier(userAddress: string, tier: UserTier): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.setUserTier(userAddress, tier)
  }
  async freezeRecipient(userAddress: string, frozen: boolean): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.freezeRecipient(userAddress, frozen)
  }
  async pauseContract(): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.pause()
  }
  async unpauseContract(): Promise<ethers.TransactionResponse> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.unpause()
  }
  async getBalance(userAddress: string): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    const balance = await this.contract.getBalance(userAddress)
    return ethers.formatEther(balance)
  }
  async getUserInfo(userAddress: string) {
    if (!this.contract) throw new Error("Contract not initialized")
    const [tier, dailyLimit, todayUsed, balance, isWhitelisted, isBlacklisted, isFrozen, kycStatus] =
      await this.contract.getUserInfo(userAddress)
    return {
      tier: Number(tier),
      dailyLimit: ethers.formatEther(dailyLimit),
      todayUsed: ethers.formatEther(todayUsed),
      balance: ethers.formatEther(balance),
      isWhitelisted,
      isBlacklisted,
      isFrozen,
      kycStatus: Number(kycStatus),
    }
  }
  async getKYCRequest(userAddress: string) {
    if (!this.contract) throw new Error("Contract not initialized")
    const [documentHash, timestamp, status, rejectionReason] = await this.contract.getKYCRequest(userAddress)
    return {
      documentHash,
      timestamp: Number(timestamp),
      status: Number(status),
      rejectionReason,
    }
  }
  async getPendingKYC(): Promise<string[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.getPendingKYC()
  }
  async getRemainingLimit(userAddress: string): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    const remaining = await this.contract.getRemainingLimit(userAddress)
    return ethers.formatEther(remaining)
  }
  async getMyBalance(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    const balance = await this.contract.getMyBalance()
    return ethers.formatEther(balance)
  }
  async getMyKYCStatus(): Promise<number> {
    if (!this.contract) throw new Error("Contract not initialized")
    return Number(await this.contract.getMyKYCStatus())
  }
  async getMyTier(): Promise<number> {
    if (!this.contract) throw new Error("Contract not initialized")
    return Number(await this.contract.getMyTier())
  }
  async getMyRemainingLimit(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    const remaining = await this.contract.getMyRemainingLimit()
    return ethers.formatEther(remaining)
  }
  onKYCRequested(callback: (user: string, documentHash: string, timestamp: number) => void) {
    if (!this.contract) return
    this.contract.on("KYCRequested", callback)
  }
  onKYCApproved(callback: (user: string, timestamp: number) => void) {
    if (!this.contract) return
    this.contract.on("KYCApproved", callback)
  }
  onSent(callback: (sender: string, recipient: string, amount: bigint) => void) {
    if (!this.contract) return
    this.contract.on("Sent", callback)
  }
  onClaimed(callback: (recipient: string, amount: bigint) => void) {
    if (!this.contract) return
    this.contract.on("Claimed", callback)
  }
  static formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  static getTierName(tier: number): string {
    switch (tier) {
      case UserTier.TIER1:
        return "TIER1"
      case UserTier.TIER2:
        return "TIER2"
      case UserTier.TIER3:
        return "TIER3"
      case UserTier.VIP:
        return "VIP"
      default:
        return "NONE"
    }
  }
  static getKYCStatusName(status: number): string {
    switch (status) {
      case KYCStatus.PENDING:
        return "PENDING"
      case KYCStatus.APPROVED:
        return "APPROVED"
      case KYCStatus.REJECTED:
        return "REJECTED"
      default:
        return "NONE"
    }
  }
}
export const remittanceContract = new RemittanceContract()
