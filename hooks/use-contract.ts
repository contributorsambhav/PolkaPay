"use client"

import { useCallback, useState } from "react"

import { remittanceContract } from "@/lib/contract"
import { useAuth } from "@/contexts/auth-context"

export function useContract() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const handleContractCall = useCallback(async (operation, successMessage) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await operation()
      if (successMessage) {
        console.log(successMessage)
      }
      return result
    } catch (err) {
      const errorMessage = err?.reason || err?.message || "Transaction failed"
      setError(errorMessage)
      console.error("Contract operation failed:", err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])
  const requestKYC = useCallback(
    async (documentHash) => {
      return handleContractCall(() => remittanceContract.requestKYC(documentHash), "KYC request submitted successfully")
    },
    [handleContractCall],
  )
  const approveKYC = useCallback(
    async (userAddress, tier) => {
      return handleContractCall(() => remittanceContract.approveKYC(userAddress, tier), "KYC approved successfully")
    },
    [handleContractCall],
  )
  const rejectKYC = useCallback(
    async (userAddress, reason) => {
      return handleContractCall(() => remittanceContract.rejectKYC(userAddress, reason), "KYC rejected successfully")
    },
    [handleContractCall],
  )
  const sendRemittance = useCallback(
    async (recipient, amount) => {
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
    async (userAddress, tier) => {
      return handleContractCall(
        () => remittanceContract.setUserTier(userAddress, tier),
        "User tier updated successfully",
      )
    },
    [handleContractCall],
  )
  const freezeUser = useCallback(
    async (userAddress, frozen) => {
      return handleContractCall(
        () => remittanceContract.freezeRecipient(userAddress, frozen),
        `User ${frozen ? "frozen" : "unfrozen"} successfully`,
      )
    },
    [handleContractCall],
  )
  const setBlacklist = useCallback(
    async (userAddress, status) => {
      return handleContractCall(
        () => remittanceContract.setBlacklist(userAddress, status),
        `User ${status ? "blacklisted" : "removed from blacklist"} successfully`,
      )
    },
    [handleContractCall],
  )
  const getUserInfo = useCallback(
    async (userAddress) => {
      return handleContractCall(() => remittanceContract.getUserInfo(userAddress))
    },
    [handleContractCall],
  )
  const getPendingKYC = useCallback(async () => {
    return handleContractCall(() => remittanceContract.getPendingKYC())
  }, [handleContractCall])
  const getMyBalance = useCallback(async () => {
    return handleContractCall(() => remittanceContract.getMyBalance())
  }, [handleContractCall])
  const getMyRemainingLimit = useCallback(async () => {
    return handleContractCall(() => remittanceContract.getMyRemainingLimit())
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
