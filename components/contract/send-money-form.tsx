'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, DollarSign, RefreshCw, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, isAddress, parseAbi, parseEther } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWatchContractEvent, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmationModal, UserActionConfirmationModal } from '@/components/ui/confirmation-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type React from 'react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

const REMITTANCE_ABI = parseAbi(['function sendRemittance(address recipient) external payable', 'function getMyBalance() external view returns (uint256)', 'function getMyKYCStatus() external view returns (uint8)', 'function getMyTier() external view returns (uint8)', 'function getMyRemainingLimit() external view returns (uint256)', 'function getMyWhitelistStatus() external view returns (bool)', 'function getMyBlacklistStatus() external view returns (bool)', 'function getMyFrozenStatus() external view returns (bool)', 'function calculateTransactionFee(uint256 amount) external pure returns (uint256)', 'function getTransactionCost(uint256 amount) external pure returns (uint256 fee, uint256 total)', 'event Sent(address indexed sender, address indexed recipient, uint256 amount)']);
enum KYCStatus {
  NONE = 0,
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3
}
enum UserTier {
  NONE = 0,
  TIER1 = 1,
  TIER2 = 2,
  TIER3 = 3,
  VIP = 4
}
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { XCircle } from 'lucide-react';
const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const getTierLabel = (tier: number) => {
  switch (tier) {
    case UserTier.NONE:
      return 'None';
    case UserTier.TIER1:
      return 'Tier 1';
    case UserTier.TIER2:
      return 'Tier 2';
    case UserTier.TIER3:
      return 'Tier 3';
    case UserTier.VIP:
      return 'VIP';
    default:
      return 'Unknown';
  }
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
interface TransactionCost {
  userPaysAmount: string; // Amount user entered (what they will pay)
  fee: string; // Fee deducted from user's amount
  recipientReceives: string; // Amount recipient will actually receive (userPays - fee)
  feeWei: bigint; // Fee in wei
  userPaysWei: bigint; // Amount user pays in wei
  recipientReceivesWei: bigint; // Amount recipient receives in wei
}
export function SendMoneyForm() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionCost, setTransactionCost] = useState<TransactionCost | null>(null);
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

  const {
    data: kycStatus,
    refetch: refetchKYC,
    isError: hasKYCError
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyKYCStatus',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: userTier,
    refetch: refetchTier,
    isError: hasTierError
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyTier',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: remainingLimit,
    refetch: refetchLimit,
    isError: hasLimitError
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyRemainingLimit',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isWhitelisted, isError: hasWhitelistError } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyWhitelistStatus',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isBlacklisted, isError: hasBlacklistError } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyBlacklistStatus',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isFrozen, isError: hasFrozenError } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyFrozenStatus',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { isLoading: isWaitingForTx, isSuccess: isTxConfirmed, isError: isTxFailed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: CHAIN_ID
  });

  useEffect(() => {
    if (isTxConfirmed) {
      setSuccess(true);
      setShowSuccessModal(true);
      setIsLoading(false);
      setRecipient('');
      setAmount('');
      setTransactionCost(null);
      setTxHash(undefined);
      refetchLimit();
      refetchKYC();
      refetchTier();
      toast.success('Funds sent successfully!');
    }
  }, [isTxConfirmed]);

  useEffect(() => {
    if (isTxFailed) {
      setIsLoading(false);
      setErrorMessage('Transaction failed to confirm on the blockchain. Please check your balance and try again.');
      setShowErrorModal(true);
      setTxHash(undefined);
      toast.error('Transaction failed');
    }
  }, [isTxFailed]);

  const isActuallyLoading = isLoading || isWaitingForTx;

  const { data: costData, refetch: refetchCost } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTransactionCost',
    args: amount && parseFloat(amount) > 0 ? [parseEther(amount)] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!amount && parseFloat(amount) > 0
    }
  });
  useEffect(() => {
    if (costData && amount && parseFloat(amount) > 0) {
      const [fee, total] = costData as [bigint, bigint];
      const userPaysWei = parseEther(amount);
      const recipientReceivesWei = userPaysWei - fee;
      setTransactionCost({
        userPaysAmount: parseFloat(amount).toFixed(4),
        fee: parseFloat(formatEther(fee)).toFixed(6),
        recipientReceives: parseFloat(formatEther(recipientReceivesWei)).toFixed(6),
        feeWei: fee,
        userPaysWei: userPaysWei,
        recipientReceivesWei: recipientReceivesWei
      });
    } else {
      setTransactionCost(null);
    }
  }, [costData, amount]);
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Sent',
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args?.sender?.toLowerCase() === address?.toLowerCase()) {
          // Event handled by useWaitForTransactionReceipt for UI
          console.log('📬 Sent event detected:', log.args);
        }
      });
    }
  });
  const clearError = () => setError('');
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    setAmount(newAmount);
    clearError();
    if (!newAmount || parseFloat(newAmount) <= 0) {
      setTransactionCost(null);
    }
  };
  const handleConfirmSend = async () => {
    if (!contractAddress || !isConnected) {
      setError('Wallet not connected');
      return;
    }
    if (!isAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!transactionCost) {
      setError('Transaction cost not calculated. Please wait and try again.');
      return;
    }
    setSuccess(false);
    setError('');
    setIsLoading(true);
    try {
      const userPaysWei = parseEther(amount);
      if (remainingLimit && userPaysWei > (remainingLimit as bigint)) {
        throw new Error(`Amount exceeds daily limit. Available: ${formatEther(remainingLimit as bigint)} ${SYMBOL}`);
      }
      console.log('🚀 Sending remittance:', {
        recipient,
        userPaysAmount: `${amount} ${SYMBOL}`,
        recipientReceives: `${formatEther(transactionCost.recipientReceivesWei)} ${SYMBOL}`,
        fee: `${formatEther(transactionCost.feeWei)} ${SYMBOL}`,
        contractAddress,
        chainId: CHAIN_ID
      });
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'sendRemittance',
        args: [recipient as `0x${string}`],
        value: userPaysWei, // Send exactly what user entered
        chainId: CHAIN_ID
      });
      console.log('✅ Transaction submitted:', hash);
      setTxHash(hash);
      toast.success(`Transaction submitted: ${hash}`);
    } catch (err: any) {
      console.error('❌ Send transaction failed:', err);
      setIsLoading(false);
      let errorMessage = 'Transaction failed';
      if (err.message) {
        if (err.message.includes('KYC not approved')) {
          errorMessage = 'Your KYC is not approved. Please complete KYC verification first.';
        } else if (err.message.includes('Access denied')) {
          errorMessage = 'Access denied. Your account may not be whitelisted or may be blacklisted.';
        } else if (err.message.includes('Daily limit exceeded')) {
          errorMessage = 'Daily sending limit exceeded. Try a smaller amount.';
        } else if (err.message.includes('Cannot send to self')) {
          errorMessage = 'You cannot send money to yourself';
        } else if (err.message.includes('Recipient is frozen')) {
          errorMessage = 'The recipient account is currently frozen';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ${SYMBOL} in your wallet for this transaction';
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };
  const refreshData = () => {
    refetchKYC();
    refetchTier();
    refetchLimit();
    if (amount && parseFloat(amount) > 0) {
      refetchCost();
    }
  };
  const canSend = isConnected && contractAddress && kycStatus === KYCStatus.APPROVED && isWhitelisted && !isBlacklisted && !isFrozen;
  const isFormValid = recipient && amount && parseFloat(amount) > 0 && isAddress(recipient) && canSend && transactionCost;
  const remainingLimitFormatted = remainingLimit ? parseFloat(formatEther(remainingLimit as bigint)).toFixed(4) : '0';

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Money
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please connect your wallet to send money.</AlertDescription>
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
            <Send className="h-5 w-5" />
            Send Money
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
            <Send className="h-5 w-5" />
            Send Money
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* User Status Display */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>KYC Status:</span>
            <span className={kycStatus === KYCStatus.APPROVED ? 'text-green-600 font-medium' : 'text-yellow-600'}>{hasKYCError ? 'Error loading' : getKYCStatusLabel(kycStatus || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>User Tier:</span>
            <span className="font-medium">{hasTierError ? 'Error loading' : getTierLabel(userTier || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Available to send today:</span>
            <span className="font-medium text-blue-600">{hasLimitError ? 'Error loading' : `${remainingLimitFormatted} ${SYMBOL}`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Account Status:</span>
            <span className={canSend ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{canSend ? 'Ready to Send' : 'Cannot Send'}</span>
          </div>
        </div>
        {/* Warning messages for account issues */}
        {!canSend && isConnected && (
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                clearError();
              }}
              disabled={isLoading}
              required
            />
            {recipient && !isAddress(recipient) && <p className="text-sm text-red-600">Invalid address format</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount You Will Pay ({SYMBOL})</Label>
            <Input id="amount" type="number" step="0.0001" min="0.0001" placeholder="0.0000" value={amount} onChange={handleAmountChange} disabled={isLoading} required />
            {amount && parseFloat(amount) <= 0 && <p className="text-sm text-red-600">Amount must be greater than 0</p>}
            {amount && remainingLimit && parseEther(amount) > remainingLimit && (
              <p className="text-sm text-red-600">
                Amount exceeds daily limit (Available: {remainingLimitFormatted} {SYMBOL})
              </p>
            )}
            <p className="text-xs text-muted-foreground">Enter the total amount you want to pay. The recipient will receive this amount minus transaction fees.</p>
          </div>
          {/* Transaction Cost Display */}
          {transactionCost && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Transaction Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>You will pay:</span>
                  <span className="font-medium text-blue-600">
                    {transactionCost.userPaysAmount} {SYMBOL}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transaction Fee:</span>
                  <span className="font-medium text-red-600">
                    -{transactionCost.fee} {SYMBOL}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Recipient receives:</span>
                  <span className="text-green-600">
                    {transactionCost.recipientReceives}{SYMBOL}
                  </span>
                </div>
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-sm">
                    <strong>Important:</strong> The recipient will receive {transactionCost.recipientReceives} ${SYMBOL} (your payment minus fees). You will be charged exactly {transactionCost.userPaysAmount} {SYMBOL} from your wallet.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
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
              <AlertDescription className="text-green-800">Transaction submitted successfully! It may take a few minutes to confirm.</AlertDescription>
            </Alert>
          )}
          <ConfirmationModal
            trigger={
              <Button type="button" disabled={isActuallyLoading || !isFormValid} className="w-full">
                {isActuallyLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {isWaitingForTx ? 'Confirming on-chain...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Money
                  </>
                )}
              </Button>
            }
            title="Confirm Transaction"
            description={
              <div className="space-y-4">
                <div>
                  <p className="mb-2">Transaction Details:</p>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>To:</span>
                      <span className="font-mono text-sm">{recipient}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>You pay:</span>
                      <span className="font-semibold text-blue-600">
                        {amount} {SYMBOL}
                      </span>
                    </div>
                    {transactionCost && (
                      <>
                        <div className="flex justify-between">
                          <span>Transaction Fee:</span>
                          <span className="text-red-600">
                            -{transactionCost.fee} {SYMBOL}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Recipient receives:</span>
                          <span className="text-green-600">
                            {transactionCost.recipientReceives} {SYMBOL}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-sm">This transaction cannot be reversed once confirmed. The recipient will receive less than what you pay due to transaction fees.</AlertDescription>
                </Alert>
              </div>
            }
            confirmText="Send Transaction"
            onConfirm={handleConfirmSend}
            icon={<Send className="h-5 w-5" />}
          />

          {/* Success Modal */}
          <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <AlertDialogTitle>Transfer Successful!</AlertDialogTitle>
                </div>
                <AlertDialogDescription className="pt-4">
                  Your remittance has been sent successfully. The recipient can now claim the funds from their dashboard.
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
                  <AlertDialogTitle>Transfer Failed</AlertDialogTitle>
                </div>
                <AlertDialogDescription className="pt-4">
                  {errorMessage || 'There was an error processing your transaction. Please try again.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowErrorModal(false)} className="bg-red-600 hover:bg-red-700">
                  Try Again
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
