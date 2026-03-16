'use client';

import {
  WarningIcon,
  CheckCircleIcon,
  CurrencyCircleDollarIcon,
  DownloadSimpleIcon,
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  TrendUpIcon,
  Coins,
} from '@phosphor-icons/react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEther, formatUnits, parseAbi } from 'viem';
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

interface Transaction {
  txnId: number;
  sender: string;
  recipient: string;
  amount: bigint;
  fee: bigint;
  timestamp: bigint;
  token: string;
  status: 'completed' | 'pending' | 'failed';
  hash?: string;
  blockNumber?: number;
}
interface TransactionStats {
  totalVolume24h: string;
  totalTransactions24h: number;
  avgTransactionSize: string;
  successRate: number;
}
const REMITTANCE_ABI = parseAbi([
  'function getAllTransactions() external view returns ((address sender, address recipient, uint256 amount, uint256 fee, uint256 timestamp, uint256 txnId, address token)[] memory)',
  'function getTotalTransactions() external view returns (uint256)',
  'function getContractBalance() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function getTierLimit(uint8 tier) external view returns (uint256)',
  'function getTransaction(uint256 txnId) external view returns (address,address,uint256,uint256,uint256,uint256,address)',
  'function stablecoinSymbols(address token) external view returns (string)',
  'event Sent(address indexed sender, address indexed recipient, uint256 amount)',
  'event Claimed(address indexed recipient, uint256 amount)',
  'event TransactionRecorded(uint256 indexed txnId, address indexed sender, address indexed recipient, uint256 amount, uint256 fee)',
  'struct Transaction { address sender; address recipient; uint256 amount; uint256 fee; uint256 timestamp; uint256 txnId; address token; }',
]);
const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

export function TransactionAnalytics() {
  const { address, isConnected } = useAccount();
  const [timeRange, setTimeRange] = useState('7d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats>({
    totalVolume24h: '0',
    totalTransactions24h: 0,
    avgTransactionSize: '0',
    successRate: 0
  });
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [tierAnalytics, setTierAnalytics] = useState<any[]>([]);
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { symbol: string; decimals: number }>>({
    '0x0000000000000000000000000000000000000000': { symbol: SYMBOL || 'PAS', decimals: 18 }
  });
  const [stablecoinStats, setStablecoinStats] = useState<Record<string, { volume: string; count: number; symbol: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      toast.error('Contract address not configured properly');
      setIsLoading(false);
    }
  }, []);

  const {
    data: allTransactions,
    refetch: refetchTransactions,
    isLoading: loadingTransactions,
    error: errorTransactions,
    isError: hasErrorTransactions
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getAllTransactions',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: totalTransactions,
    refetch: refetchTotal,
    isLoading: loadingTotal
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTotalTransactions',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: contractBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getContractBalance',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'TransactionRecorded',
    chainId: CHAIN_ID,
    onLogs(logs) {
      console.log('New transaction recorded:', logs);
      refetchTransactions();
      refetchTotal();
      refetchBalance();
      toast.success('New transaction detected');
    }
  });
  // Effect to discover tokens when transactions change
  useEffect(() => {
    if (!transactions.length || !contractAddress) return;

    const discoverTokens = async () => {
      const uniqueTokens = Array.from(new Set(transactions.map(t => t.token.toLowerCase())));
      const newTokens = uniqueTokens.filter(t => !tokenMetadata[t]);

      if (newTokens.length === 0) return;

      try {
        const { createPublicClient, http, defineChain } = await import('viem');
        const polkadotTestnet = defineChain({
          id: CHAIN_ID,
          name: 'Polkadot Hub Testnet',
          nativeCurrency: { name: 'WND', symbol: 'WND', decimals: 18 },
          rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
        });
        const client = createPublicClient({ chain: polkadotTestnet, transport: http() });
        const updatedMetadata = { ...tokenMetadata };

        await Promise.all(newTokens.map(async (tokenAddr) => {
          if (tokenAddr === '0x0000000000000000000000000000000000000000') return;
          try {
            const [symbol, decimals] = await Promise.all([
              client.readContract({
                address: contractAddress,
                abi: REMITTANCE_ABI,
                functionName: 'stablecoinSymbols',
                args: [tokenAddr as `0x${string}`]
              }) as Promise<string>,
              client.readContract({
                address: tokenAddr as `0x${string}`,
                abi: parseAbi(['function decimals() view returns (uint8)']),
                functionName: 'decimals'
              }).catch(() => 18) as Promise<number>
            ]);
            updatedMetadata[tokenAddr] = { symbol: symbol || 'TOKEN', decimals: Number(decimals) };
          } catch (e) {
            console.error(`Failed to fetch metadata for ${tokenAddr}:`, e);
            updatedMetadata[tokenAddr] = { symbol: 'TOKEN', decimals: 18 };
          }
        }));
        setTokenMetadata(updatedMetadata);
      } catch (e) {
        console.error('Discovery error:', e);
      }
    };

    discoverTokens();
  }, [transactions, contractAddress, tokenMetadata]);

  // Effect to update stats and charts when transactions OR metadata change
  useEffect(() => {
    if (!transactions.length) {
      if (!loadingTransactions) setIsLoading(false);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const last24hTxs = transactions.filter((tx) => Number(tx.timestamp) > oneDayAgo);

    // Total Volume (Native)
    const nativeTxs = last24hTxs.filter(tx => tx.token === '0x0000000000000000000000000000000000000000');
    const totalNativeVolume = nativeTxs.reduce((sum, tx) => sum + Number(formatEther(tx.amount)), 0);
    const avgNativeSize = nativeTxs.length > 0 ? totalNativeVolume / nativeTxs.length : 0;

    // Stablecoin Stats
    const scTxs = last24hTxs.filter(tx => tx.token !== '0x0000000000000000000000000000000000000000');
    const scGrouped: Record<string, { volume: number; count: number; symbol: string }> = {};

    scTxs.forEach(tx => {
      const tokenAddr = tx.token.toLowerCase();
      const meta = tokenMetadata[tokenAddr] || { symbol: 'TOKEN', decimals: 18 };
      if (!scGrouped[tokenAddr]) {
        scGrouped[tokenAddr] = { volume: 0, count: 0, symbol: meta.symbol };
      }
      scGrouped[tokenAddr].volume += Number(formatUnits(tx.amount, meta.decimals));
      scGrouped[tokenAddr].count += 1;
    });

    const finalScStats: Record<string, { volume: string; count: number; symbol: string }> = {};
    Object.entries(scGrouped).forEach(([addr, data]) => {
      finalScStats[addr] = { ...data, volume: data.volume.toFixed(2) };
    });
    setStablecoinStats(finalScStats);

    setStats({
      totalVolume24h: totalNativeVolume.toFixed(2),
      totalTransactions24h: last24hTxs.length,
      avgTransactionSize: avgNativeSize.toFixed(2),
      successRate: 99.9
    });

    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * 86400;
      const dayEnd = now - (i - 1) * 86400;
      const dayTxs = transactions.filter((tx) => {
        const txTime = Number(tx.timestamp);
        return txTime >= dayStart && txTime < dayEnd;
      });
      const dayNativeVolume = dayTxs.filter(tx => tx.token === '0x0000000000000000000000000000000000000000')
        .reduce((sum, tx) => sum + Number(formatEther(tx.amount)), 0);

      // For stablecoins, we'll just count transactions for the chart or "pseudo-volume" (assuming USD parity for simple visualization)
      const dayScVolume = dayTxs.filter(tx => tx.token !== '0x0000000000000000000000000000000000000000')
        .reduce((sum, tx) => {
          const meta = tokenMetadata[tx.token.toLowerCase()] || { decimals: 18 };
          return sum + Number(formatUnits(tx.amount, meta.decimals));
        }, 0);

      chartData.push({
        date: new Date(dayStart * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        nativeVolume: Math.round(dayNativeVolume),
        scVolume: Math.round(dayScVolume),
        transactions: dayTxs.length
      });
    }
    setVolumeData(chartData);

    setStatusDistribution([
      { name: 'Completed', value: transactions.length, color: 'oklch(0.42 0.09 265)' },
      { name: 'Pending', value: 0, color: 'oklch(0.72 0.16 75)' },
      { name: 'Failed', value: 0, color: 'oklch(0.55 0.22 25)' }
    ]);

    setTierAnalytics([
      { tier: 'VIP', volume: Math.round(totalNativeVolume * 0.4), count: Math.round(last24hTxs.length * 0.1), avgAmount: Math.round(avgNativeSize * 4) },
      { tier: 'TIER3', volume: Math.round(totalNativeVolume * 0.3), count: Math.round(last24hTxs.length * 0.2), avgAmount: Math.round(avgNativeSize * 2) },
      { tier: 'TIER2', volume: Math.round(totalNativeVolume * 0.2), count: Math.round(last24hTxs.length * 0.3), avgAmount: Math.round(avgNativeSize * 1.2) },
      { tier: 'TIER1', volume: Math.round(totalNativeVolume * 0.1), count: Math.round(last24hTxs.length * 0.4), avgAmount: Math.round(avgNativeSize * 0.4) }
    ]);
    setIsLoading(false);
  }, [transactions, tokenMetadata, loadingTransactions]);

  // Effect to process raw transactions into state
  useEffect(() => {
    if (!allTransactions || !Array.isArray(allTransactions)) {
      setIsLoading(loadingTransactions || loadingTotal);
      return;
    }
    const processed: Transaction[] = allTransactions.map((tx) => ({
      txnId: Number(tx.txnId),
      sender: tx.sender,
      recipient: tx.recipient,
      amount: tx.amount,
      fee: tx.fee,
      timestamp: tx.timestamp,
      token: tx.token,
      status: 'completed' as const
    }));
    setTransactions(processed);
  }, [allTransactions, loadingTransactions, loadingTotal]);
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.sender.toLowerCase().includes(searchTerm.toLowerCase()) || tx.recipient.toLowerCase().includes(searchTerm.toLowerCase()) || tx.txnId.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary/10 text-primary border-border';
      case 'pending':
        return 'bg-muted text-muted-foreground border-border';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  const refreshData = async () => {
    console.log('Refreshing transaction data...');
    setIsLoading(true);
    try {
      await Promise.all([refetchTransactions(), refetchTotal(), refetchBalance()]);
      toast.success('Transaction data refreshed');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh transaction data');
    } finally {
      setIsLoading(false);
    }
  };
  if (!isConnected) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-xl bg-muted/30">
        <div className="text-center">
          <WarningIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" weight="duotone" />
          <h3 className="text-lg font-semibold">Wallet Not Connected</h3>
          <p className="text-muted-foreground">Please connect your wallet to view transaction data.</p>
        </div>
      </div>
    );
  }
  if (!contractAddress) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-xl bg-muted/30">
        <div className="text-center">
          <WarningIcon className="mx-auto mb-4 h-10 w-10 text-destructive sm:h-12 sm:w-12" weight="duotone" />
          <h3 className="text-lg font-semibold">Configuration Error</h3>
          <p className="text-muted-foreground">Contract address not properly configured.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
        <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
          <ArrowClockwiseIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} weight="regular" />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="min-w-0 border-border shadow-sm border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Native Volume (24h)</CardTitle>
            <CurrencyCircleDollarIcon className="h-4 w-4 text-primary" weight="duotone" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-muted" />
            ) : (
              <>
                <div className="text-xl font-semibold">
                  {stats.totalVolume24h} {SYMBOL}
                </div>
                <p className="text-xs text-muted-foreground">Network native token</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stablecoin Activity (24h)</CardTitle>
            <Coins className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-muted" />
            ) : (
              <>
                <div className="text-sm space-y-1">
                  {Object.values(stablecoinStats).length === 0 ? (
                    <span className="text-muted-foreground italic">No activity</span>
                  ) : (
                    Object.values(stablecoinStats).map(s => (
                      <div key={s.symbol} className="flex justify-between items-center">
                        <span className="font-semibold text-lg">{s.volume} {s.symbol}</span>
                        <Badge variant="secondary" className="text-[10px] px-1 h-4">{s.count} txs</Badge>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions (24h)</CardTitle>
            <TrendUpIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-muted" />
            ) : (
              <>
                <div className="text-xl font-semibold">{stats.totalTransactions24h}</div>
                <p className="text-xs text-muted-foreground">Native + Stablecoins</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Native Avg Size</CardTitle>
            <CurrencyCircleDollarIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-muted" />
            ) : (
              <>
                <div className="text-xl font-semibold">
                  {stats.avgTransactionSize} {SYMBOL}
                </div>
                <p className="text-xs text-muted-foreground">Native token average</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">Transaction Volume</CardTitle>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full bg-muted" />
            ) : (
              <ChartContainer
                config={{
                  nativeVolume: {
                    label: `Native (${SYMBOL})`,
                    color: 'oklch(0.51 0.17 259.94)'
                  },
                  scVolume: {
                    label: 'Stablecoins (Units)',
                    color: 'oklch(0.63 0.17 140.24)'
                  }
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="nativeVolume" fill="var(--color-nativeVolume)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="scVolume" fill="var(--color-scVolume)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Transaction Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full bg-muted" />
            ) : (
              <ChartContainer
                config={{
                  completed: { label: 'Completed', color: 'oklch(0.42 0.09 265)' },
                  pending: { label: 'Pending', color: 'oklch(0.72 0.16 75)' },
                  failed: { label: 'Failed', color: 'oklch(0.55 0.22 25)' }
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="min-w-0 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Volume by User Tier (Estimated)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {tierAnalytics.map((tier) => (
                <div key={tier.tier} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary" className="border-border">{tier.tier}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-semibold">
                      {tier.volume} {SYMBOL}
                    </p>
                    <p className="text-sm text-muted-foreground">{tier.count} transactions</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {tier.avgAmount} {SYMBOL}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="min-w-0 border-border shadow-sm">
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:w-56">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="regular" />
                <Input placeholder="Search by address or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="min-w-0 pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <DownloadSimpleIcon className="mr-2 h-4 w-4" weight="regular" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : hasErrorTransactions ? (
            <div className="py-8 text-center text-destructive">
              <WarningIcon className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12" weight="duotone" />
              <p>Error loading transactions</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <TrendUpIcon className="mx-auto mb-4 h-12 w-12 opacity-50" weight="duotone" />
              <p>No transactions found</p>
              <p className="text-sm">Transactions will appear here once users start sending remittances.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions
                .slice()
                .sort((a, b) => b.txnId - a.txnId)
                .slice(0, 10)
                .map((tx) => (
                  <div key={tx.txnId} className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary" weight="regular" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {formatAddress(tx.sender)} → {formatAddress(tx.recipient)}
                          </p>
                          <p className="text-sm text-muted-foreground">{formatDate(tx.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {(() => {
                            const meta = tokenMetadata[tx.token.toLowerCase()];
                            return `${formatUnits(tx.amount, meta?.decimals ?? 18)} ${meta?.symbol ?? ''}`;
                          })()}
                        </p>
                        <Badge className={getStatusColor(tx.status)}>{tx.status.toUpperCase()}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Transaction ID</p>
                        <p className="font-mono">{tx.txnId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fee</p>
                        <p className="font-mono">
                          {(() => {
                            const meta = tokenMetadata[tx.token.toLowerCase()];
                            return `${formatUnits(tx.fee, meta?.decimals ?? 18)} ${meta?.symbol ?? ''}`;
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-mono">{formatDate(tx.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
