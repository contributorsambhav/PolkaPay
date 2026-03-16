'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Coins, RefreshCw, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUnits, isAddress, parseUnits } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

/* ── ABI fragments ─────────────────────────────────────────────── */
const REMITTANCE_ABI = [
  {
    inputs: [],
    name: 'getSupportedStablecoins',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stablecoinSymbols',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'supportedStablecoins',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'sendStablecoinRemittance',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'getMyStablecoinBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMyKYCStatus',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMyRemainingLimit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMyWhitelistStatus',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMyFrozenStatus',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'calculateTransactionFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'fee', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'txnId', type: 'uint256' },
    ],
    name: 'StablecoinSent',
    type: 'event',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

enum KYCStatus { NONE = 0, PENDING = 1, APPROVED = 2, REJECTED = 3 }

/* ── Component ─────────────────────────────────────────────────── */
export function StablecoinSendForm() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();

  const [selectedToken, setSelectedToken] = useState<`0x${string}` | ''>('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'approving' | 'sending'>('form');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
  }, []);

  /* ── read supported stablecoins ─── */
  const { data: supportedCoins, refetch: refetchCoins } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getSupportedStablecoins',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected },
  });

  /* ── read symbol for selected token ─── */
  const { data: tokenSymbol } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'stablecoinSymbols',
    args: selectedToken ? [selectedToken as `0x${string}`] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && !!selectedToken },
  });

  /* ── token decimals ─── */
  const { data: tokenDecimals } = useReadContract({
    address: selectedToken ? (selectedToken as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: CHAIN_ID,
    query: { enabled: !!selectedToken },
  });

  /* ── wallet token balance ─── */
  const { data: walletTokenBalance, refetch: refetchWalletBalance } = useReadContract({
    address: selectedToken ? (selectedToken as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!selectedToken && !!address },
  });

  /* ── allowance ─── */
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken ? (selectedToken as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!selectedToken && !!address && !!contractAddress },
  });

  /* ── fee ─── */
  const decimals = tokenDecimals ?? 18;
  const parsedAmount = amount && parseFloat(amount) > 0 ? parseUnits(amount, Number(decimals)) : BigInt(0);

  const { data: feeData } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'calculateTransactionFee',
    args: parsedAmount > BigInt(0) ? [parsedAmount] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && parsedAmount > BigInt(0) },
  });

  /* ── KYC status ─── */
  const { data: kycStatus } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyKYCStatus',
    account: address,
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected },
  });

  const { data: isWhitelisted } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyWhitelistStatus',
    account: address,
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected },
  });

  const { data: isFrozen } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyFrozenStatus',
    account: address,
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected },
  });

  /* ── tx receipt ─── */
  const { isLoading: isTxPending, isSuccess: isTxConfirmed, isError: isTxFailed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: CHAIN_ID,
  });

  useEffect(() => {
    if (isTxConfirmed) {
      if (step === 'approving') {
        // Approval confirmed, now send
        setStep('sending');
        setTxHash(undefined);
        refetchAllowance();
        doSend();
      } else if (step === 'sending') {
        setStep('form');
        setShowSuccessModal(true);
        setRecipient('');
        setAmount('');
        setTxHash(undefined);
        refetchWalletBalance();
        toast.success('Stablecoin remittance sent!');
      }
    }
  }, [isTxConfirmed]);

  useEffect(() => {
    if (isTxFailed) {
      setStep('form');
      setErrorMessage('Transaction failed on-chain. Check your balance and try again.');
      setShowErrorModal(true);
      setTxHash(undefined);
      toast.error('Transaction failed');
    }
  }, [isTxFailed]);

  /* ── computed ─── */
  const fee = feeData as bigint | undefined;
  const netAmount = fee && parsedAmount > BigInt(0) ? parsedAmount - fee : parsedAmount;
  const canSend = isConnected && kycStatus === KYCStatus.APPROVED && isWhitelisted && !isFrozen;
  const needsApproval = currentAllowance !== undefined && parsedAmount > BigInt(0) && currentAllowance < parsedAmount;
  const isFormValid = selectedToken && recipient && isAddress(recipient) && amount && parseFloat(amount) > 0 && canSend;

  const isLoading = step !== 'form' || isTxPending;

  /* ── helpers ─── */
  const handleApproveAndSend = async () => {
    if (!contractAddress || !selectedToken) return;
    setError('');
    try {
      if (needsApproval) {
        setStep('approving');
        const hash = await writeContractAsync({
          address: selectedToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress, parsedAmount],
          chainId: CHAIN_ID,
        });
        setTxHash(hash);
        toast.info('Approval submitted — waiting for confirmation…');
      } else {
        setStep('sending');
        await doSend();
      }
    } catch (err: any) {
      setStep('form');
      const msg = err?.message?.includes('user rejected') ? 'Transaction rejected' : (err?.message ?? 'Failed');
      setError(msg);
      toast.error(msg);
    }
  };

  const doSend = async () => {
    if (!contractAddress || !selectedToken) return;
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'sendStablecoinRemittance',
        args: [selectedToken as `0x${string}`, recipient as `0x${string}`, parsedAmount],
        chainId: CHAIN_ID,
      });
      setTxHash(hash);
      toast.info('Stablecoin transfer submitted — confirming on-chain…');
    } catch (err: any) {
      setStep('form');
      const msg = err?.message?.includes('user rejected') ? 'Transaction rejected' : (err?.message ?? 'Send failed');
      setError(msg);
      toast.error(msg);
    }
  };

  /* ── symbols for listing ─── */
  const coins = (supportedCoins as `0x${string}`[] | undefined) ?? [];

  /* ── early returns ─── */
  if (!isConnected) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" />Send Stablecoin</CardTitle></CardHeader>
        <CardContent><Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Please connect your wallet to send stablecoins.</AlertDescription></Alert></CardContent>
      </Card>
    );
  }

  if (!contractAddress) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" />Send Stablecoin</CardTitle></CardHeader>
        <CardContent><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Contract address not configured. Check environment variables.</AlertDescription></Alert></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2"><Coins className="h-5 w-5" />Send Stablecoin</div>
          <Button variant="outline" size="sm" onClick={() => { refetchCoins(); refetchWalletBalance(); refetchAllowance(); }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>KYC Status:</span>
            <span className={kycStatus === KYCStatus.APPROVED ? 'text-green-600 font-medium' : 'text-yellow-600'}>
              {kycStatus === KYCStatus.APPROVED ? 'Approved' : kycStatus === KYCStatus.PENDING ? 'Pending' : 'Not Verified'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Account:</span>
            <span className={canSend ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{canSend ? 'Ready' : 'Cannot Send'}</span>
          </div>
        </div>

        {!canSend && (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>KYC approval, whitelisting, or unfreezing required. Contact support.</AlertDescription></Alert>
        )}

        {/* Token selector */}
        <div className="space-y-2">
          <Label htmlFor="stablecoin-select">Stablecoin</Label>
          {coins.length === 0 ? (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>No stablecoins are currently supported. Contact admin to add one.</AlertDescription></Alert>
          ) : (
            <select
              id="stablecoin-select"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value as `0x${string}`)}
              disabled={isLoading}
            >
              <option value="">Select a stablecoin…</option>
              {coins.map((addr) => (
                <option key={addr} value={addr}>
                  {addr.slice(0, 6)}…{addr.slice(-4)}
                </option>
              ))}
            </select>
          )}
          {selectedToken && tokenSymbol && (
            <Badge variant="secondary" className="mt-1">{tokenSymbol as string}</Badge>
          )}
        </div>

        {/* Wallet balance */}
        {selectedToken && walletTokenBalance !== undefined && (
          <div className="text-sm text-muted-foreground">
            Wallet balance: <span className="font-mono font-medium text-foreground">{parseFloat(formatUnits(walletTokenBalance as bigint, Number(decimals))).toFixed(4)}</span>{' '}
            {(tokenSymbol as string) ?? 'tokens'}
          </div>
        )}

        {/* Recipient */}
        <div className="space-y-2">
          <Label htmlFor="sc-recipient">Recipient Address</Label>
          <Input id="sc-recipient" placeholder="0x…" value={recipient} onChange={(e) => { setRecipient(e.target.value); setError(''); }} disabled={isLoading} />
          {recipient && !isAddress(recipient) && <p className="text-sm text-red-600">Invalid address format</p>}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="sc-amount">Amount</Label>
          <Input id="sc-amount" type="number" step="0.0001" min="0.0001" placeholder="0.0000" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} disabled={isLoading} />
        </div>

        {/* Fee breakdown */}
        {fee !== undefined && parsedAmount > BigInt(0) && (
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>You send:</span>
                <span className="font-medium text-blue-600">{parseFloat(formatUnits(parsedAmount, Number(decimals))).toFixed(4)} {(tokenSymbol as string) ?? ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fee:</span>
                <span className="font-medium text-red-600">-{parseFloat(formatUnits(fee, Number(decimals))).toFixed(6)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Recipient gets:</span>
                <span className="text-green-600">{parseFloat(formatUnits(netAmount, Number(decimals))).toFixed(4)} {(tokenSymbol as string) ?? ''}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval notice */}
        {needsApproval && parsedAmount > BigInt(0) && (
          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>Token approval required.</strong> You&apos;ll first approve the contract to spend your tokens, then send the remittance in a second transaction.
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Action button */}
        <Button
          className="w-full"
          disabled={isLoading || !isFormValid}
          onClick={handleApproveAndSend}
        >
          {isLoading ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />{step === 'approving' ? 'Approving…' : isTxPending ? 'Confirming…' : 'Sending…'}</>
          ) : needsApproval ? (
            <><Coins className="mr-2 h-4 w-4" />Approve & Send</>
          ) : (
            <><Send className="mr-2 h-4 w-4" />Send Stablecoin</>
          )}
        </Button>

        {/* Success modal */}
        <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 text-green-600"><CheckCircle className="h-6 w-6" /></div>
                <AlertDialogTitle>Stablecoin Sent!</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-4">
                Your stablecoin remittance has been sent successfully. The recipient can now claim the tokens from their dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowSuccessModal(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Error modal */}
        <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 text-red-600"><XCircle className="h-6 w-6" /></div>
                <AlertDialogTitle>Transfer Failed</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-4">{errorMessage || 'There was an error processing your transaction.'}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowErrorModal(false)} className="bg-red-600 hover:bg-red-700">Try Again</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
