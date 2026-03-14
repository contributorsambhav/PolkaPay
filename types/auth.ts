export interface User {
  id: string
  address: string
  email: string
  role: "user" | "admin"
  kycStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  tier: "NONE" | "TIER1" | "TIER2" | "TIER3" | "VIP"
  isWhitelisted: boolean
  isBlacklisted: boolean
  isFrozen: boolean
  balance: string
  dailyLimit: string
  todayUsed: string
  createdAt: string
}
export interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (address: string, signature: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}
export interface KYCRequest {
  documentHash: string
  timestamp: string
  status: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason?: string
}
