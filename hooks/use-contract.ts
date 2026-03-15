"use client"

import { useCallback, useState } from "react"

import { remittanceContract } from "@/lib/contract"
import { useAuth } from "@/contexts/auth-context"

export function useContract() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleContractCall = useCallback(async (operation: () => Promise<unknown>, successMessage?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await operation()
      if (successMessage) {
        console.log(successMessage)
      }
      return result
    } catch (err: unknown) {
      const errObj = err as { reason?: string; message?: string }
      const errorMessage = errObj?.reason ?? errObj?.message ?? "Transaction failed"
      setError(errorMessage)
      console.error("Contract operation failed:", err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])
  const requestKYC = useCallback(
    async (documentHash: string) => {
      return handleContractCall(() => remittanceContract.requestKYC(documentHash), "KYC request submitted successfully")
    },
    [handleContractCall],
  )
  const approveKYC = useCallback(
    async (userAddress: string, tier: number) => {
      return handleContractCall(() => remittanceContract.approveKYC(userAddress, tier), "KYC approved successfully")
    },
    [handleContractCall],
  )
  const rejectKYC = useCallback(
    async (userAddress: string, reason: string) => {
      return handleContractCall(() => remittanceContract.rejectKYC(userAddress, reason), "KYC rejected successfully")
    },
    [handleContractCall],
  )
  const sendRemittance = useCallback(
    async (recipient: string, amount: string) => {
      return handleContractCall(
        () => remittanceContract.sendRemittance(recipient, amount),
        "Remittance sent successfully",
      )
    },
    [handleContractCall],
  )
  const claimRemittance = useCallback(async () => {
    return handleContractCall(() => remittanceContract.claimRemittance(), "Funds claimed successfully")
  }, [handleContractCall])
  const setUserTier = useCallback(
    async (userAddress: string, tier: number) => {
      return handleContractCall(
        () => remittanceContract.setUserTier(userAddress, tier),
        "User tier updated successfully",
      )
    },
    [handleContractCall],
  )
  const freezeUser = useCallback(
    async (userAddress: string, frozen: boolean) => {
      return handleContractCall(
        () => remittanceContract.freezeRecipient(userAddress, frozen),
        `User ${frozen ? "frozen" : "unfrozen"} successfully`,
      )
    },
    [handleContractCall],
  )
  const setBlacklist = useCallback(
    async (userAddress: string, status: boolean) => {
      return handleContractCall(
        () => remittanceContract.setBlacklist(userAddress, status),
        `User ${status ? "blacklisted" : "removed from blacklist"} successfully`,
      )
    },
    [handleContractCall],
  )
  const getUserInfo = useCallback(
    async (userAddress: string) => {
      return handleContractCall(() => remittanceContract.getUserInfo(userAddress), undefined)
    },
    [handleContractCall],
  )
  const getPendingKYC = useCallback(async () => {
    return handleContractCall(() => remittanceContract.getPendingKYC(), undefined)
  }, [handleContractCall])
  const getMyBalance = useCallback(async () => {
    return handleContractCall(() => remittanceContract.getMyBalance(), undefined)
  }, [handleContractCall])
  const getMyRemainingLimit = useCallback(async () => {
    return handleContractCall(() => remittanceContract.getMyRemainingLimit(), undefined)
  }, [handleContractCall])
  return {
    isLoading,
    error,
    requestKYC,
    approveKYC,
    rejectKYC,
    sendRemittance,
    claimRemittance,
    setUserTier,
    freezeUser,
    setBlacklist,
    getUserInfo,
    getPendingKYC,
    getMyBalance,
    getMyRemainingLimit,
    clearError: () => setError(null),
  }
}
