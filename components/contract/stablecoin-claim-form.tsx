'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Download, RefreshCw, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUnits } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
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
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'claimStablecoinRemittance',
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
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'StablecoinClaimed',
    type: 'event',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

enum KYCStatus { NONE = 0, PENDING = 1, APPROVED = 2, REJECTED = 3 }

interface TokenBalance {
  token: `0x${string}`;
  symbol: string;
  balance: bigint;
  decimals: number;
}

/* ── Component ─────────────────────────────────────────────────── */
export function StablecoinClaimForm() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [claimedSymbol, setClaimedSymbol] = useState('');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
  }, []);

  /* ── supported stablecoins ─── */
  const { data: supportedCoins, refetch: refetchCoins } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getSupportedStablecoins',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected },
  });

  /* ── KYC ─── */
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
      setIsLoading(false);
      setShowSuccessModal(true);
      setTxHash(undefined);
      setRefreshKey((k) => k + 1);
      toast.success(`Claimed ${claimedSymbol} successfully!`);
    }
  }, [isTxConfirmed]);

  useEffect(() => {
    if (isTxFailed) {
      setIsLoading(false);
      setErrorMessage('Claim transaction failed on-chain.');
      setShowErrorModal(true);
      setTxHash(undefined);
      toast.error('Claim failed');
    }
  }, [isTxFailed]);

  // NOTE: We dynamically fetch balances by iterating coins once supportedCoins loads
  // This is a simplified approach since wagmi doesn't support dynamic-count reads easily
  useEffect(() => {
    if (!supportedCoins || !contractAddress || !address || !isConnected) return;
    const coins = supportedCoins as `0x${string}`[];
    if (coins.length === 0) {
      setTokenBalances([]);
      return;
    }

    const fetchBalances = async () => {
      // We'll use viem public client from the window provider
      const { createPublicClient, http } = await import('viem');
      const { defineChain } = await import('viem');
      const polkadotTestnet = defineChain({
        id: CHAIN_ID,
        name: 'Polkadot Hub Testnet',
        nativeCurrency: { name: 'WND', symbol: 'WND', decimals: 18 },
        rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
      });
      const client = createPublicClient({ chain: polkadotTestnet, transport: http() });

      const results: TokenBalance[] = [];
      for (const token of coins) {
        try {
          const [balance, symbol, dec] = await Promise.all([
            client.readContract({
              address: contractAddress,
              abi: REMITTANCE_ABI,
              functionName: 'getMyStablecoinBalance',
              args: [token],
              account: address,
            }) as Promise<bigint>,
            client.readContract({
              address: contractAddress,
              abi: REMITTANCE_ABI,
              functionName: 'stablecoinSymbols',
              args: [token],
            }) as Promise<string>,
            client.readContract({
              address: token,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }).catch(() => 18) as Promise<number>,
          ]);
          results.push({ token, symbol, balance, decimals: Number(dec) });
        } catch {
          // skip token on error
        }
      }
      setTokenBalances(results);
    };
    fetchBalances();
  }, [supportedCoins, contractAddress, address, isConnected, refreshKey]);

  const canClaim = isConnected && kycStatus === KYCStatus.APPROVED && isWhitelisted && !isFrozen;
  const actuallyLoading = isLoading || isTxPending;

  const handleClaim = async (token: `0x${string}`, symbol: string) => {
    if (!contractAddress) return;
    setClaimedSymbol(symbol);
    setIsLoading(true);
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'claimStablecoinRemittance',
        args: [token],
        chainId: CHAIN_ID,
      });
      setTxHash(hash);
      toast.info('Claim submitted — confirming on-chain…');
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message?.includes('user rejected') ? 'Transaction rejected' : (err?.message ?? 'Claim failed');
      toast.error(msg);
    }
  };

  const refreshAll = () => {
    refetchCoins();
    setRefreshKey((k) => k + 1);
  };

  /* ── early returns ─── */
  if (!isConnected) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Claim Stablecoins</CardTitle></CardHeader>
        <CardContent><Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Please connect your wallet to claim stablecoins.</AlertDescription></Alert></CardContent>
      </Card>
    );
  }
  if (!contractAddress) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Claim Stablecoins</CardTitle></CardHeader>
        <CardContent><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Contract address not configured.</AlertDescription></Alert></CardContent>
      </Card>
    );
  }

  const claimableTokens = tokenBalances.filter((tb) => tb.balance > BigInt(0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2"><Download className="h-5 w-5" />Claim Stablecoins</div>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={actuallyLoading}>
            <RefreshCw className={`h-4 w-4 ${actuallyLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>KYC Status:</span>
            <span className={kycStatus === KYCStatus.APPROVED ? 'text-green-600 font-medium' : 'text-yellow-600'}>
              {kycStatus === KYCStatus.APPROVED ? 'Approved' : 'Not Verified'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Account:</span>
            <span className={canClaim ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{canClaim ? 'Ready' : 'Cannot Claim'}</span>
          </div>
        </div>

        {!canClaim && (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>KYC approval, whitelisting, or unfreezing required.</AlertDescription></Alert>
        )}

        {/* Token balances */}
        {claimableTokens.length === 0 ? (
          <div className="text-center py-8">
            <Coins className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No stablecoin funds available to claim.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claimableTokens.map((tb) => (
              <div key={tb.token} className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{tb.symbol}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{tb.token.slice(0, 6)}…{tb.token.slice(-4)}</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {parseFloat(formatUnits(tb.balance, tb.decimals)).toFixed(4)} {tb.symbol}
                    </p>
                  </div>
                  <Button
                    disabled={actuallyLoading || !canClaim}
                    onClick={() => handleClaim(tb.token, tb.symbol)}
                    className="min-w-[100px]"
                  >
                    {actuallyLoading ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Claiming…</>
                    ) : (
                      <><Download className="h-4 w-4 mr-2" />Claim</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All supported tokens balances (including zero) */}
        {tokenBalances.length > 0 && claimableTokens.length < tokenBalances.length && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Show all {tokenBalances.length} supported tokens
            </summary>
            <div className="mt-2 space-y-1">
              {tokenBalances.filter((tb) => tb.balance === BigInt(0)).map((tb) => (
                <div key={tb.token} className="flex justify-between px-2 py-1.5 rounded bg-muted/30">
                  <span>{tb.symbol} <span className="text-xs text-muted-foreground font-mono">({tb.token.slice(0, 6)}…{tb.token.slice(-4)})</span></span>
                  <span className="text-muted-foreground">0.0000</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Success modal */}
        <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 text-green-600"><CheckCircle className="h-6 w-6" /></div>
                <AlertDialogTitle>Claim Successful!</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-4">
                Your {claimedSymbol} tokens have been transferred to your wallet. It may take a moment for the balance to update.
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
                <AlertDialogTitle>Claim Failed</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-4">{errorMessage || 'Error processing your claim.'}</AlertDialogDescription>
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
