'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWatchContractEvent, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';

const REMITTANCE_ABI = parseAbi(['function claimRemittance() external', 'function getMyBalance() external view returns (uint256)', 'function getMyKYCStatus() external view returns (uint8)', 'function getMyWhitelistStatus() external view returns (bool)', 'function getMyBlacklistStatus() external view returns (bool)', 'function getMyFrozenStatus() external view returns (bool)', 'event Claimed(address indexed recipient, uint256 amount)']);
enum KYCStatus {
  NONE = 0,
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3
}
const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const getContractAddress = (): `0x${string}` | undefined => {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return undefined;
  }
  return address as `0x${string}`;
};
const getKYCStatusLabel = (status: number) => {
  switch (status) {
    case KYCStatus.NONE:
      return 'None';
    case KYCStatus.PENDING:
      return 'Pending';
    case KYCStatus.APPROVED:
      return 'Approved';
    case KYCStatus.REJECTED:
      return 'Rejected';
    default:
      return 'Unknown';
  }
};
export function ClaimFundsForm() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      setError('Contract address not configured properly');
    }
  }, []);

  const CORRECT_CHAIN_ID = 420420417;

  const {
    data: balance,
    refetch: refetchBalance,
    isError: hasBalanceError
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyBalance',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: kycStatus,
    refetch: refetchKYC,
    isError: hasKYCError
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyKYCStatus',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isWhitelisted, isError: hasWhitelistError } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyWhitelistStatus',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isBlacklisted, isError: hasBlacklistError } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyBlacklistStatus',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isFrozen, isError: hasFrozenError } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyFrozenStatus',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });

  const { isLoading: isWaitingForTx, isSuccess: isTxConfirmed, isError: isTxFailed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: CORRECT_CHAIN_ID
  });

  useEffect(() => {
    if (isTxConfirmed) {
      setSuccess(true);
      setShowSuccessModal(true);
      setIsLoading(false);
      setTxHash(undefined);
      refetchBalance();
      refetchKYC();
      toast.success('Funds claimed successfully!');
    }
  }, [isTxConfirmed]);

  useEffect(() => {
    if (isTxFailed) {
      setIsLoading(false);
      setErrorMessage('Claim transaction failed to confirm on the blockchain.');
      setShowErrorModal(true);
      setTxHash(undefined);
      toast.error('Claim failed');
    }
  }, [isTxFailed]);

  const isActuallyLoading = isLoading || isWaitingForTx;
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Claimed',
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args?.recipient?.toLowerCase() === address?.toLowerCase()) {
          console.log('📬 Claimed event detected:', log.args);
        }
      });
    }
  });
  const clearError = () => setError('');
  const handleConfirmClaim = async () => {
    if (!contractAddress || !isConnected) {
      setError('Wallet not connected');
      return;
    }
    if (!balance || balance === BigInt(0)) {
      setError('No funds available to claim');
      return;
    }
    setSuccess(false);
    setError('');
    setIsLoading(true);
    try {
      console.log('🚀 Claiming remittance:', {
        balance: formatEther(balance as bigint),
        contractAddress,
        chainId: CORRECT_CHAIN_ID
      });
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'claimRemittance',
        args: [],
        chainId: CORRECT_CHAIN_ID
      });
      console.log('✅ Claim transaction submitted:', hash);
      setTxHash(hash);
      toast.success(`Claim transaction submitted: ${hash}`);
    } catch (err: any) {
      console.error('❌ Claim transaction failed:', err);
      setIsLoading(false);
      let errorMessage = 'Claim transaction failed';
      if (err.message) {
        if (err.message.includes('KYC not approved')) {
          errorMessage = 'Your KYC is not approved. Please complete KYC verification first.';
        } else if (err.message.includes('Access denied')) {
          errorMessage = 'Access denied. Your account may not be whitelisted or may be blacklisted.';
        } else if (err.message.includes('No balance to claim')) {
          errorMessage = 'No funds available to claim';
        } else if (err.message.includes('Account frozen')) {
          errorMessage = 'Your account is currently frozen';
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };
  const refreshData = () => {
    refetchBalance();
    refetchKYC();
  };
  const canClaim = isConnected && contractAddress && kycStatus === KYCStatus.APPROVED && isWhitelisted && !isBlacklisted && !isFrozen && balance && balance > BigInt(0);
  const balanceFormatted = balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000';
  const hasBalance = balance && balance > BigInt(0);
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Claim Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please connect your wallet to claim funds.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  if (!contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Claim Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Contract address not configured properly. Please check your environment variables.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Claim Funds
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Status Display */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>KYC Status:</span>
            <span className={kycStatus === KYCStatus.APPROVED ? 'text-green-600 font-medium' : 'text-yellow-600'}>{hasKYCError ? 'Error loading' : getKYCStatusLabel(kycStatus || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Account Status:</span>
            <span className={canClaim ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{canClaim ? 'Ready to Claim' : 'Cannot Claim'}</span>
          </div>
        </div>
        {/* Warning messages for account issues */}
        {!canClaim && isConnected && hasBalance && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {kycStatus !== KYCStatus.APPROVED && 'KYC approval required. '}
              {!isWhitelisted && 'Account not whitelisted. '}
              {isBlacklisted && 'Account is blacklisted. '}
              {isFrozen && 'Account is frozen. '}
              Please contact support for assistance.
            </AlertDescription>
          </Alert>
        )}
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Available Balance</p>
              <p className="text-2xl font-bold text-primary">{hasBalanceError ? 'Error loading' : `${balanceFormatted} ${SYMBOL}`}</p>
            </div>
            <ConfirmationModal
              trigger={
                <Button disabled={isActuallyLoading || !canClaim} className="min-w-[120px]">
                  {isActuallyLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {isWaitingForTx ? 'Confirming...' : 'Claiming...'}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Claim Now
                    </>
                  )}
                </Button>
              }
              title="Confirm Fund Claim"
              description={
                <div className="space-y-2">
                  <p>
                    Are you sure you want to claim{' '}
                    <strong>
                      {balanceFormatted} ${SYMBOL}
                    </strong>
                    ?
                  </p>
                  <p className="text-sm text-muted-foreground">The funds will be transferred to your connected wallet address.</p>
                </div>
              }
              confirmText="Claim Funds"
              onConfirm={handleConfirmClaim}
              icon={<Download className="h-5 w-5" />}
            />
          </div>
        </div>
        {!hasBalance && !hasBalanceError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No funds available to claim at this time.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">Funds claimed successfully! Check your wallet for the transaction.</AlertDescription>
          </Alert>
        )}

        {/* Success Modal */}
        <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <AlertDialogTitle>Claim Successful!</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-4">
                Your funds have been claimed successfully and transferred to your wallet. It may take a minute for the balance to update in your wallet display.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowSuccessModal(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Error Modal */}
        <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 text-red-600">
                  <XCircle className="h-6 w-6" />
                </div>
                <AlertDialogTitle>Claim Failed</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-4">
                {errorMessage || 'There was an error processing your claim. Please try again.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowErrorModal(false)} className="bg-red-600 hover:bg-red-700">
                Try Again
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
