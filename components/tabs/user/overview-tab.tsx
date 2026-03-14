'use client';

import { Activity, AlertCircle, ArrowDownLeft, ArrowUpRight, BarChart3, Download, RefreshCw, Send, Shield, TrendingUp, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NetworkActivityWidget } from '@/components/analytics/network-activity-widget';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const REMITTANCE_ABI = parseAbi(['function getMyBalance() external view returns (uint256)', 'function getMyKYCStatus() external view returns (uint8)', 'function getMyTier() external view returns (uint8)', 'function getMyRemainingLimit() external view returns (uint256)', 'function getMyWhitelistStatus() external view returns (bool)', 'function getMyBlacklistStatus() external view returns (bool)', 'function getMyFrozenStatus() external view returns (bool)', 'function getTierLimit(uint8 tier) external view returns (uint256)', 'event Sent(address indexed sender, address indexed recipient, uint256 amount)', 'event Claimed(address indexed recipient, uint256 amount)', 'event Received(address indexed sender, address indexed recipient, uint256 amount)']);
interface OverviewTabProps {
  onTabChange: (tab: string) => void;
}
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
interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'claimed';
  amount: string;
  address?: string;
  date: string;
  status: 'completed' | 'pending';
  hash: string;
}
const getContractAddress = (): `0x${string}` | undefined => {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return undefined;
  }
  return address as `0x${string}`;
};
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
      return 'NONE';
    case KYCStatus.PENDING:
      return 'PENDING';
    case KYCStatus.APPROVED:
      return 'APPROVED';
    case KYCStatus.REJECTED:
      return 'REJECTED';
    default:
      return 'UNKNOWN';
  }
};
const getKYCStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
export function OverviewTab({ onTabChange }: OverviewTabProps) {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
  }, []);
  const CORRECT_CHAIN_ID = 420420417;

  const {
    data: balance,
    refetch: refetchBalance,
    isError: hasBalanceError,
    isLoading: isBalanceLoading
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
  const {
    data: userTier,
    refetch: refetchTier,
    isError: hasTierError,
    isLoading: isTierLoading
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyTier',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: currentTierLimit,
    refetch: refetchTierLimit,
    isError: hasTierLimitError,
    isLoading: isTierLimitLoading
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [userTier || 0],
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected && userTier !== undefined
    }
  });
  const {
    data: remainingLimit,
    refetch: refetchLimit,
    isError: hasLimitError,
    isLoading: isLimitLoading
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyRemainingLimit',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isWhitelisted } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyWhitelistStatus',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isBlacklisted } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyBlacklistStatus',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { data: isFrozen } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyFrozenStatus',
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Sent',
    chainId: CORRECT_CHAIN_ID,
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args?.sender?.toLowerCase() === address?.toLowerCase()) {
          const newTx: Transaction = {
            id: log.transactionHash || '',
            type: 'sent',
            amount: formatEther(log.args.amount || BigInt(0)),
            address: log.args.recipient,
            date: new Date().toLocaleDateString(),
            status: 'completed',
            hash: log.transactionHash || ''
          };
          setRecentTransactions((prev) => [newTx, ...prev.slice(0, 4)]);
          setTimeout(() => {
            refetchBalance();
            refetchLimit();
            refetchTierLimit(); // Also refresh tier limit in case admin changed it
          }, 2000);
        } else if (log.args?.recipient?.toLowerCase() === address?.toLowerCase()) {
          const newTx: Transaction = {
            id: log.transactionHash || '',
            type: 'received',
            amount: formatEther(log.args.amount || BigInt(0)),
            address: log.args.sender,
            date: new Date().toLocaleDateString(),
            status: 'completed',
            hash: log.transactionHash || ''
          };
          setRecentTransactions((prev) => [newTx, ...prev.slice(0, 4)]);
          setTimeout(() => {
            refetchBalance();
            refetchLimit();
            refetchTierLimit(); // Also refresh tier limit
          }, 2000);
        }
      });
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Claimed',
    chainId: CORRECT_CHAIN_ID,
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args?.recipient?.toLowerCase() === address?.toLowerCase()) {
          const newTx: Transaction = {
            id: log.transactionHash || '',
            type: 'claimed',
            amount: formatEther(log.args.amount || BigInt(0)),
            date: new Date().toLocaleDateString(),
            status: 'completed',
            hash: log.transactionHash || ''
          };
          setRecentTransactions((prev) => [newTx, ...prev.slice(0, 4)]);
          setTimeout(() => {
            refetchBalance();
            refetchLimit();
            refetchTierLimit(); // Also refresh tier limit
          }, 2000);
        }
      });
    }
  });
  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchBalance(),
        refetchKYC(),
        refetchTier(),
        refetchTierLimit(), // CRITICAL: Also refresh tier limit!
        refetchLimit()
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };
  const dailyLimitFromContract = currentTierLimit ? formatEther(currentTierLimit) : '0';
  const remainingLimitFormatted = remainingLimit ? formatEther(remainingLimit) : '0';
  const usedToday = currentTierLimit && remainingLimit ? (parseFloat(formatEther(currentTierLimit)) - parseFloat(formatEther(remainingLimit))).toFixed(4) : '0';
  const dailyUsagePercentage = currentTierLimit && remainingLimit ? ((parseFloat(formatEther(currentTierLimit)) - parseFloat(formatEther(remainingLimit))) / parseFloat(formatEther(currentTierLimit))) * 100 : 0;
  const balanceFormatted = balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000';
  const kycStatusText = getKYCStatusLabel(kycStatus || 0);
  const tierText = getTierLabel(userTier || 0);
  const isDataLoading = isTierLoading || isTierLimitLoading || isLimitLoading;
  const isAccountReady = kycStatus === KYCStatus.APPROVED && isWhitelisted && !isBlacklisted && !isFrozen;
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to view your overview.</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!contractAddress) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Contract address not configured properly. Please check your environment variables.</AlertDescription>
        </Alert>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Account Overview</h2>
        <Button variant="outline" size="sm" onClick={refreshAllData} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      {/* Account Status Alert */}
      {!isAccountReady && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {kycStatus !== KYCStatus.APPROVED && 'KYC approval required. '}
            {!isWhitelisted && 'Account not whitelisted. '}
            {isBlacklisted && 'Account is blacklisted. '}
            {isFrozen && 'Account is frozen. '}
            Some features may be limited.
          </AlertDescription>
        </Alert>
      )}
      {/* Account Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isBalanceLoading ? <div className="h-8 w-20 bg-muted animate-pulse rounded" /> : hasBalanceError ? <span className="text-sm text-red-600">Error loading</span> : `${balanceFormatted} ${SYMBOL}`}</div>
            <p className="text-xs text-muted-foreground">Ready to claim</p>
          </CardContent>
        </Card>
        {/* Daily Limit Card - Now shows ACTUAL limit from contract */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Limit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isTierLimitLoading || hasTierLimitError ? <div className="h-8 w-20 bg-muted animate-pulse rounded" /> : `${parseFloat(dailyLimitFromContract).toLocaleString()} ${SYMBOL}`}</div>
            <p className="text-xs text-muted-foreground">{tierText} current limit</p>
          </CardContent>
        </Card>
        {/* Today's Usage Card - Now calculated correctly */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isDataLoading ? <div className="h-8 w-20 bg-muted animate-pulse rounded" /> : `${parseFloat(usedToday).toLocaleString()} ${SYMBOL}`}</div>
            <Progress value={Math.min(100, Math.max(0, dailyUsagePercentage))} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {parseFloat(remainingLimitFormatted).toLocaleString()} ${SYMBOL} remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className={getKYCStatusColor(kycStatusText)}>{hasKYCError ? 'Error loading' : kycStatusText}</Badge>
            <p className="text-xs text-muted-foreground mt-2">{kycStatus === KYCStatus.APPROVED ? 'Verification complete' : 'Verification required'}</p>
          </CardContent>
        </Card>
      </div>
      {/* 24h Activity Snapshot */}
      <NetworkActivityWidget />

      {/* Enhanced Usage Breakdown showing dynamic limits */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Limit Breakdown</CardTitle>
          {isDataLoading && <p className="text-sm text-muted-foreground">Loading current limits...</p>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Daily Limit ({tierText})</span>
              <span className="text-sm font-bold">{isDataLoading ? 'Loading...' : `${parseFloat(dailyLimitFromContract).toLocaleString()} ${SYMBOL}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Used Today</span>
              <span className="text-sm">{isDataLoading ? 'Loading...' : `${parseFloat(usedToday).toLocaleString()} ${SYMBOL}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-sm font-medium text-green-600">{isDataLoading ? 'Loading...' : `${parseFloat(remainingLimitFormatted).toLocaleString()} ${SYMBOL}`}</span>
            </div>
            {!isDataLoading && (
              <>
                <Progress value={Math.min(100, Math.max(0, dailyUsagePercentage))} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{dailyUsagePercentage.toFixed(1)}% of daily limit used</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex-col gap-2" onClick={() => onTabChange('send')} disabled={!isAccountReady}>
              <Send className="h-6 w-6" />
              Send Money
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" onClick={() => onTabChange('receive')} disabled={!isAccountReady}>
              <Download className="h-6 w-6" />
              Claim Funds
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" onClick={() => onTabChange('transactions')}>
              <BarChart3 className="h-6 w-6" />
              View Transactions
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent transactions</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'sent' ? 'bg-red-100' : tx.type === 'received' ? 'bg-green-100' : 'bg-blue-100'}`}>{tx.type === 'sent' ? <ArrowUpRight className="h-4 w-4 text-red-600" /> : tx.type === 'received' ? <ArrowDownLeft className="h-4 w-4 text-green-600" /> : <Download className="h-4 w-4 text-blue-600" />}</div>
                    <div>
                      <p className="font-medium">
                        {tx.type === 'sent' && `Sent to ${tx.address?.slice(0, 6)}...${tx.address?.slice(-4)}`}
                        {tx.type === 'received' && `Received from ${tx.address?.slice(0, 6)}...${tx.address?.slice(-4)}`}
                        {tx.type === 'claimed' && 'Claimed funds'}
                      </p>
                      <p className="text-sm text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {parseFloat(tx.amount).toFixed(4)} ${SYMBOL}
                    </p>
                    <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
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
