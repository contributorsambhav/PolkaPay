'use client';

import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChartBarIcon,
  ClockIcon,
  DownloadSimpleIcon,
  ArrowClockwiseIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

interface TransactionArray {
  0: string; // sender
  1: string; // recipient
  2: bigint; // amount
  3: bigint; // fee
  4: bigint; // timestamp
  5: bigint; // txnId
}
interface ProcessedTransaction {
  id: string;
  type: 'sent' | 'received';
  amount: string;
  fee: string;
  address: string;
  date: string;
  timestamp: number;
  txHash?: string;
}
const REMITTANCE_ABI = parseAbi(['function getMyTransactions() external view returns ((address,address,uint256,uint256,uint256,uint256)[] memory)', 'function getUserTransactionIds(address user) external view returns (uint256[] memory)', 'function getTransactionsByUser(address user) external view returns ((address,address,uint256,uint256,uint256,uint256)[] memory)', 'function getTotalTransactions() external view returns (uint256)', 'function getAllTransactions() external view returns ((address,address,uint256,uint256,uint256,uint256)[] memory)', 'function getMyBalance() external view returns (uint256)', 'function calculateTransactionFee(uint256 amount) external pure returns (uint256)', 'function getTransactionCost(uint256 amount) external pure returns (uint256 fee, uint256 total)', 'struct Transaction { address sender; address recipient; uint256 amount; uint256 fee; uint256 timestamp; uint256 txnId; }']);
export function TransactionsTab() {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<ProcessedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');
  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      toast.error('Contract address not configured properly');
      setIsLoading(false);
    }
  }, []);

  const {
    data: userTransactions,
    refetch: refetchTransactions,
    isLoading: loadingTransactions,
    error: transactionsError
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyTransactions',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected && !!address
    }
  });
  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyBalance',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected && !!address
    }
  });
  useEffect(() => {
    if (!userTransactions || !address) {
      setTransactions([]);
      setIsLoading(loadingTransactions);
      return;
    }
    try {
      console.log('📊 Processing transactions:', userTransactions);
      const processed: ProcessedTransaction[] = userTransactions.map((tx: TransactionArray) => {
        const sender = tx[0];
        const recipient = tx[1];
        const amount = tx[2];
        const fee = tx[3];
        const timestamp = tx[4];
        const txnId = tx[5];
        const isSent = sender.toLowerCase() === address.toLowerCase();
        const otherParty = isSent ? recipient : sender;
        const timestampMs = Number(timestamp) * 1000; // Convert to milliseconds
        return {
          id: txnId.toString(),
          type: isSent ? ('sent' as const) : ('received' as const),
          amount: formatEther(amount),
          fee: formatEther(fee),
          address: otherParty,
          date: new Date(timestampMs).toLocaleDateString(),
          timestamp: timestampMs
        };
      });
      processed.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(processed);
      console.log('✅ Processed transactions:', processed);
    } catch (error) {
      console.error('❌ Error processing transactions:', error);
      toast.error('Error processing transaction data');
    } finally {
      setIsLoading(loadingTransactions);
    }
  }, [userTransactions, address, loadingTransactions]);
  useEffect(() => {
    let filtered = [...transactions];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((tx) => tx.address.toLowerCase().includes(term) || tx.amount.includes(term) || tx.id.includes(term));
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === typeFilter);
    }
    if (dateFilter !== 'all') {
      const now = Date.now();
      const days = parseInt(dateFilter.replace('d', ''));
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((tx) => tx.timestamp >= cutoff);
    }
    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, typeFilter, dateFilter]);
  const stats = {
    totalSent: transactions.filter((tx) => tx.type === 'sent').reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
    totalReceived: transactions.filter((tx) => tx.type === 'received').reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
    totalFees: transactions.reduce((sum, tx) => sum + parseFloat(tx.fee), 0),
    totalTransactions: transactions.length,
    currentBalance: userBalance ? parseFloat(formatEther(userBalance)) : 0
  };
  const refreshData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([refetchTransactions(), refetchBalance()]);
      toast.success('Transaction data refreshed');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };
  const exportTransactions = () => {
    const csvContent = [['ID', 'Type', 'Amount (${SYMBOL})', 'Fee (${SYMBOL})', 'Address', 'Date'].join(','), ...filteredTransactions.map((tx) => [tx.id, tx.type, tx.amount, tx.fee, tx.address, tx.date].join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Transactions exported successfully');
  };
  if (!isConnected) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-xl bg-muted/30">
        <div className="text-center">
          <ChartBarIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" weight="duotone" />
          <h3 className="text-lg font-semibold">Wallet Not Connected</h3>
          <p className="text-muted-foreground">Please connect your wallet to view transactions.</p>
        </div>
      </div>
    );
  }
  if (!contractAddress) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-xl bg-muted/30">
        <div className="text-center">
          <ChartBarIcon className="mx-auto mb-4 h-12 w-12 text-destructive" weight="duotone" />
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <ArrowClockwiseIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} weight="regular" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportTransactions} disabled={filteredTransactions.length === 0}>
            <DownloadSimpleIcon className="mr-2 h-4 w-4" weight="regular" />
            Export
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <TrendUpIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-muted" />
            ) : (
              <div className="text-xl font-semibold">
                {stats.currentBalance.toFixed(4)} {SYMBOL}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Available to claim</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <ArrowUpRightIcon className="h-4 w-4 text-destructive" weight="regular" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-muted" />
            ) : (
              <div className="text-xl font-semibold text-foreground">
                {stats.totalSent.toFixed(4)} {SYMBOL}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Outgoing transfers</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <ArrowDownRightIcon className="h-4 w-4 text-primary" weight="regular" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-muted" />
            ) : (
              <div className="text-xl font-semibold text-foreground">
                {stats.totalReceived.toFixed(4)} {SYMBOL}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Incoming transfers</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <TrendDownIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-muted" />
            ) : (
              <div className="text-xl font-semibold">
                {stats.totalFees.toFixed(6)} {SYMBOL}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Transaction fees paid</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 bg-muted" /> : <div className="text-xl font-semibold">{stats.totalTransactions}</div>}
            <p className="text-xs text-muted-foreground">All time activity</p>
          </CardContent>
        </Card>
      </div>
      <Card className="min-w-0 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" weight="regular" />
              <Input placeholder="Search by address, amount, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={(value: 'all' | 'sent' | 'received') => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sent">Sent Only</SelectItem>
                <SelectItem value="received">Received Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(value: 'all' | '7d' | '30d' | '90d') => setDateFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setDateFilter('all');
              }}
            >
              <FunnelSimpleIcon className="mr-2 h-4 w-4" weight="regular" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Transaction History</span>
            <Badge variant="secondary">
              {filteredTransactions.length} of {transactions.length} transactions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${tx.type === 'sent' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{tx.type === 'sent' ? <ArrowUpRightIcon className="h-5 w-5" weight="regular" /> : <ArrowDownRightIcon className="h-5 w-5" weight="regular" />}</div>
                    <div>
                      <p className="font-medium">
                        {tx.type === 'sent' ? 'Sent to' : 'Received from'}
                        <span className="font-mono ml-1 text-sm">
                          {tx.address.slice(0, 6)}...{tx.address.slice(-4)}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClockIcon className="h-3 w-3" weight="regular" />
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span>ID: {tx.id}</span>
                        {parseFloat(tx.fee) > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              Fee: {parseFloat(tx.fee).toFixed(6)} {SYMBOL}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${tx.type === 'sent' ? 'text-destructive' : 'text-primary'}`}>
                      {tx.type === 'sent' ? '-' : '+'}
                      {parseFloat(tx.amount).toFixed(4)} {SYMBOL}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" weight="duotone" />
              <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
              {searchTerm || typeFilter !== 'all' || dateFilter !== 'all' ? <p className="text-muted-foreground">Try adjusting your filters to see more transactions</p> : <p className="text-muted-foreground">Your transaction history will appear here once you start sending or receiving remittances</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
