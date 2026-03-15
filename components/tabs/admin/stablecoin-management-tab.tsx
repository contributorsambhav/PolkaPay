'use client';

import { AlertTriangle, CheckCircle, Coins, Loader2, Plus, RefreshCw, Trash2, Wallet, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatUnits, isAddress } from 'viem';
import { useToast } from '@/hooks/use-toast';
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
      { internalType: 'string', name: 'symbol', type: 'string' },
    ],
    name: 'addSupportedStablecoin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'removeSupportedStablecoin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'getStablecoinAccumulatedFees',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'withdrawStablecoinFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
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
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface StablecoinInfo {
  address: `0x${string}`;
  symbol: string;
  fees: string;
  feesRaw: bigint;
  decimals: number;
}

/* ── Confirmation modal (matching settings-tab pattern) ─── */
function ConfirmationModal({
  trigger,
  title,
  description,
  confirmText,
  onConfirm,
  variant = 'default',
  icon,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">{trigger}</div>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              {icon}
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">{description}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant={variant} className="cursor-pointer" onClick={() => { onConfirm(); setIsOpen(false); }}>
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export function StablecoinManagementTab() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const contractAddress = getContractAddress();
  const { writeContractAsync } = useWriteContract();

  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [newTokenSymbol, setNewTokenSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [stablecoinsInfo, setStablecoinsInfo] = useState<StablecoinInfo[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Owner check ─── */
  const { data: contractOwner, isLoading: isOwnerLoading } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'owner',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected },
  });

  const isAdmin = address && contractOwner && address.toLowerCase() === contractOwner.toString().toLowerCase();

  /* ── Supported stablecoins ─── */
  const { data: supportedCoins, refetch: refetchCoins } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getSupportedStablecoins',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected },
  });

  /* ── tx receipt ─── */
  const { isLoading: isTxPending, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: CHAIN_ID,
  });

  useEffect(() => {
    if (isTxConfirmed) {
      setIsAdding(false);
      setIsRemoving(null);
      setIsWithdrawing(null);
      setTxHash(undefined);
      setNewTokenAddress('');
      setNewTokenSymbol('');
      refetchCoins();
      setRefreshKey((k) => k + 1);
    }
  }, [isTxConfirmed, refetchCoins]);

  /* ── Fetch stablecoin details ─── */
  useEffect(() => {
    if (!supportedCoins || !contractAddress || !address) return;
    const coins = supportedCoins as `0x${string}`[];
    if (coins.length === 0) {
      setStablecoinsInfo([]);
      return;
    }

    const fetchInfo = async () => {
      const { createPublicClient, http, defineChain } = await import('viem');
      const polkadotTestnet = defineChain({
        id: CHAIN_ID,
        name: 'Polkadot Hub Testnet',
        nativeCurrency: { name: 'WND', symbol: 'WND', decimals: 18 },
        rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
      });
      const client = createPublicClient({ chain: polkadotTestnet, transport: http() });

      const results: StablecoinInfo[] = [];
      for (const token of coins) {
        try {
          const [symbol, fees, dec] = await Promise.all([
            client.readContract({ address: contractAddress, abi: REMITTANCE_ABI, functionName: 'stablecoinSymbols', args: [token] }) as Promise<string>,
            client.readContract({ address: contractAddress, abi: REMITTANCE_ABI, functionName: 'getStablecoinAccumulatedFees', args: [token], account: address }) as Promise<bigint>,
            client.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18) as Promise<number>,
          ]);
          results.push({
            address: token,
            symbol,
            fees: parseFloat(formatUnits(fees, Number(dec))).toFixed(6),
            feesRaw: fees,
            decimals: Number(dec),
          });
        } catch {
          // skip
        }
      }
      setStablecoinsInfo(results);
    };
    fetchInfo();
  }, [supportedCoins, contractAddress, address, refreshKey]);

  /* ── Handlers ─── */
  const handleAddStablecoin = async () => {
    if (!contractAddress || !newTokenAddress || !newTokenSymbol) return;
    if (!isAddress(newTokenAddress)) {
      toast({ title: 'Invalid Address', description: 'Please enter a valid ERC-20 token address.', variant: 'destructive' });
      return;
    }
    setIsAdding(true);
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'addSupportedStablecoin',
        args: [newTokenAddress as `0x${string}`, newTokenSymbol],
        chainId: CHAIN_ID,
      });
      setTxHash(hash);
      toast({ title: 'Adding Stablecoin…', description: `Adding ${newTokenSymbol} — confirming on-chain.` });
    } catch (error: any) {
      setIsAdding(false);
      toast({ title: 'Failed', description: error?.message?.includes('already supported') ? 'Token is already supported.' : 'Failed to add stablecoin.', variant: 'destructive' });
    }
  };

  const handleRemoveStablecoin = async (token: `0x${string}`) => {
    if (!contractAddress) return;
    setIsRemoving(token);
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'removeSupportedStablecoin',
        args: [token],
        chainId: CHAIN_ID,
      });
      setTxHash(hash);
      toast({ title: 'Removing…', description: 'Stablecoin removal confirming on-chain.' });
    } catch (error) {
      setIsRemoving(null);
      toast({ title: 'Failed', description: 'Failed to remove stablecoin.', variant: 'destructive' });
    }
  };

  const handleWithdrawFees = async (token: `0x${string}`, symbol: string) => {
    if (!contractAddress) return;
    setIsWithdrawing(token);
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'withdrawStablecoinFees',
        args: [token],
        chainId: CHAIN_ID,
      });
      setTxHash(hash);
      toast({ title: 'Withdrawing Fees…', description: `Withdrawing ${symbol} fees — confirming on-chain.` });
    } catch (error) {
      setIsWithdrawing(null);
      toast({ title: 'Failed', description: 'Failed to withdraw fees.', variant: 'destructive' });
    }
  };

  /* ── Loading & access states ─── */
  if (!isConnected) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Stablecoin Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage supported stablecoins and fees</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <Coins className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">Connect your wallet to manage stablecoins</p>
        </div>
      </div>
    );
  }
  if (isOwnerLoading) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Stablecoin Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage supported stablecoins and fees</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Checking admin privileges…</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Stablecoin Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage supported stablecoins and fees</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <XCircle className="mb-4 h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-muted-foreground">You don&apos;t have admin privileges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-8">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Stablecoin Management</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Add, remove, and manage ERC-20 stablecoins for remittance transfers</p>
      </header>

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Add Stablecoin Card ─── */}
        <Card className="min-w-0 overflow-hidden border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Plus className="h-4 w-4" />
              Add Stablecoin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Token Contract Address</Label>
              <Input
                placeholder="0x…"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                disabled={isAdding || isTxPending}
              />
              {newTokenAddress && !isAddress(newTokenAddress) && (
                <p className="text-xs text-red-600">Invalid address format</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Token Symbol</Label>
              <Input
                placeholder="e.g. USDT, USDC, DAI"
                value={newTokenSymbol}
                onChange={(e) => setNewTokenSymbol(e.target.value.toUpperCase())}
                disabled={isAdding || isTxPending}
                maxLength={10}
              />
            </div>
            <Button
              className="w-full"
              disabled={isAdding || isTxPending || !newTokenAddress || !newTokenSymbol || !isAddress(newTokenAddress)}
              onClick={handleAddStablecoin}
            >
              {isAdding || isTxPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" />Add Stablecoin</>
              )}
            </Button>
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
                Only add verified ERC-20 stablecoin contracts deployed on the Polkadot Hub Testnet. Users will be able to send and claim these tokens through the remittance system.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* ── Supported Stablecoins Card ─── */}
        <Card className="min-w-0 overflow-hidden border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between text-base font-semibold">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Supported Stablecoins
              </div>
              <Button variant="outline" size="sm" onClick={() => { refetchCoins(); setRefreshKey((k) => k + 1); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stablecoinsInfo.length === 0 ? (
              <div className="text-center py-8">
                <Coins className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No stablecoins configured yet.</p>
              </div>
            ) : (
              stablecoinsInfo.map((coin) => (
                <div
                  key={coin.address}
                  className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{coin.symbol}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{coin.address.slice(0, 10)}…{coin.address.slice(-6)}</span>
                    </div>
                    <ConfirmationModal
                      trigger={
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={isRemoving === coin.address}>
                          {isRemoving === coin.address ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      }
                      title="Remove Stablecoin"
                      description={`Remove ${coin.symbol} (${coin.address}) from supported stablecoins? Users will no longer be able to send this token. Existing balances can still be claimed.`}
                      confirmText="Remove"
                      onConfirm={() => handleRemoveStablecoin(coin.address)}
                      variant="destructive"
                      icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Accumulated Fees</p>
                      <p className="font-mono font-medium tabular-nums text-sm">{coin.fees} {coin.symbol}</p>
                    </div>
                    <ConfirmationModal
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isWithdrawing === coin.address || coin.feesRaw === BigInt(0)}
                        >
                          {isWithdrawing === coin.address ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Wallet className="mr-1 h-4 w-4" />
                          )}
                          Withdraw
                        </Button>
                      }
                      title={`Withdraw ${coin.symbol} Fees`}
                      description={`Withdraw ${coin.fees} ${coin.symbol} in accumulated fees to your admin address?`}
                      confirmText="Withdraw"
                      onConfirm={() => handleWithdrawFees(coin.address, coin.symbol)}
                      icon={<Wallet className="h-5 w-5" />}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
