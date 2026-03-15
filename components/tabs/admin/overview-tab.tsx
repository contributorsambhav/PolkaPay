'use client';

import {
  ChartLineUpIcon,
  WarningIcon,
  SealCheckIcon,
  ArrowClockwiseIcon,
  GearIcon,
  TrendUpIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract, useWatchContractEvent, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

interface OverviewTabProps {
  onTabChange: (tab: 'overview' | 'kyc' | 'users' | 'transactions' | 'settings') => void;
}

const REMITTANCE_ABI = parseAbi(['function getPendingKYC() external view returns (address[] memory)', 'function getContractBalance() external view returns (uint256)', 'function owner() external view returns (address)', 'function paused() external view returns (bool)', 'function getTierLimit(uint8 tier) external view returns (uint256)', 'function pause() external', 'function unpause() external', 'event KYCRequested(address indexed user, string documentHash, uint256 timestamp)', 'event KYCApproved(address indexed user, uint256 timestamp)', 'event KYCRejected(address indexed user, string reason, uint256 timestamp)', 'event KYCDocumentUpdated(address indexed user, string oldHash, string newHash, uint256 timestamp)', 'event Sent(address indexed sender, address indexed recipient, uint256 amount)', 'event Claimed(address indexed recipient, uint256 amount)', 'event Frozen(address indexed recipient, bool frozen)', 'event TierUpdated(address indexed user, uint8 newTier)', 'event UserWhitelisted(address indexed user, bool status)', 'event UserBlacklisted(address indexed user, bool status)', 'event Paused(address account)', 'event Unpaused(address account)']);

const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME;
const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

export function OverviewTab({ onTabChange }: OverviewTabProps) {
  const { address, isConnected, chain } = useAccount();
  const { writeContract } = useWriteContract();
  useEffect(() => {
    console.log('🔗 Wallet Connection State:', {
      address,
      isConnected,
      chain: chain?.id,
      chainName: chain?.name
    });
  }, [address, isConnected, chain]);
  const [stats, setStats] = useState({
    pendingKYC: 0,
    contractBalance: '0'
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
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
    data: pendingKYC,
    refetch: refetchPendingKYC,
    isLoading: loadingKYC,
    error: errorKYC,
    isError: hasErrorKYC
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getPendingKYC',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: contractBalance,
    refetch: refetchBalance,
    isLoading: loadingBalance,
    error: errorBalance,
    isError: hasErrorBalance
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getContractBalance',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: contractOwner,
    error: errorOwner,
    isError: hasErrorOwner
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'owner',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const {
    data: isPaused,
    refetch: refetchPaused,
    error: errorPaused,
    isError: hasErrorPaused
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'paused',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected
    }
  });
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    console.log('📊 Contract Read Results:', {
      pendingKYC: {
        data: pendingKYC,
        loading: loadingKYC,
        error: hasErrorKYC ? errorKYC : null
      },
      contractBalance: {
        data: contractBalance,
        loading: loadingBalance,
        error: hasErrorBalance ? errorBalance : null
      },
      contractOwner: {
        data: contractOwner,
        error: hasErrorOwner ? errorOwner : null
      },
      isPaused: {
        data: isPaused,
        error: hasErrorPaused ? errorPaused : null
      }
    });
  }, [pendingKYC, loadingKYC, hasErrorKYC, errorKYC, contractBalance, loadingBalance, hasErrorBalance, errorBalance, contractOwner, hasErrorOwner, errorOwner, isPaused, hasErrorPaused, errorPaused]);
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'KYCRequested',
    onLogs(logs) {
      console.log('📝 KYC Requested Events:', logs);
      setRecentEvents((prev) =>
        [
          ...logs.map((log) => ({
            type: 'KYC Requested',
            ...log
          })),
          ...prev
        ].slice(0, 10)
      );
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'KYCApproved',
    onLogs(logs) {
      console.log('✅ KYC Approved Events:', logs);
      setRecentEvents((prev) =>
        [
          ...logs.map((log) => ({
            type: 'KYC Approved',
            ...log
          })),
          ...prev
        ].slice(0, 10)
      );
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Sent',
    onLogs(logs) {
      console.log('💸 Remittance Sent Events:', logs);
      setRecentEvents((prev) =>
        [
          ...logs.map((log) => ({
            type: 'Remittance Sent',
            ...log
          })),
          ...prev
        ].slice(0, 10)
      );
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Claimed',
    onLogs(logs) {
      console.log('💰 Claimed Events:', logs);
      setRecentEvents((prev) =>
        [
          ...logs.map((log) => ({
            type: 'Claimed',
            ...log
          })),
          ...prev
        ].slice(0, 10)
      );
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Paused',
    onLogs(logs) {
      console.log('⏸️ Paused Events:', logs);
      toast.info('Contract has been paused');
    }
  });
  useWatchContractEvent({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    eventName: 'Unpaused',
    onLogs(logs) {
      console.log('▶️ Unpaused Events:', logs);
      toast.info('Contract has been unpaused');
    }
  });
  useEffect(() => {
    const newStats = {
      pendingKYC: Array.isArray(pendingKYC) ? pendingKYC.length : 0,
      contractBalance: contractBalance ? formatEther(contractBalance) : '0'
    };
    console.log('📈 Updating stats:', newStats);
    setStats(newStats);
    setIsLoading(loadingKYC || loadingBalance);
  }, [pendingKYC, contractBalance, loadingKYC, loadingBalance]);
  const refreshData = async () => {
    console.log('🔄 Refreshing all contract data...');
    setIsLoading(true);
    try {
      const promises = [refetchPendingKYC(), refetchBalance(), refetchPaused()];
      const results = await Promise.allSettled(promises);
      results.forEach((result, index) => {
        const names = ['PendingKYC', 'Balance', 'Paused'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${names[index]} refreshed:`, result.value);
        } else {
          console.error(`❌ ${names[index]} refresh failed:`, result.reason);
        }
      });
      toast.success('Data refresh completed');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      toast.error('Failed to refresh some data');
    } finally {
      setIsLoading(false);
    }
  };
  const handlePauseToggle = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!contractAddress) {
      toast.error('Contract address not configured');
      return;
    }
    console.log('🔄 Toggling contract pause state...');
    console.log('Current paused state:', isPaused);
    try {
      const functionName = isPaused ? 'unpause' : 'pause';
      console.log(`📞 Calling ${functionName} function...`);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName,
        chainId: CHAIN_ID
      });
      console.log('✅ Transaction submitted:', hash);
      toast.success(`Transaction submitted: ${hash}`);
      setTimeout(() => {
        console.log('🔄 Refetching pause status...');
        refetchPaused();
      }, 3000);
    } catch (error) {
      console.error('❌ Pause toggle failed:', error);
      toast.error(`Failed to ${isPaused ? 'unpause' : 'pause'} contract: ${error}`);
    }
  };
  console.log('🎨 OverviewTab render:', {
    isConnected,
    contractAddress,
    isLoading,
    stats,
    hasErrors: {
      kyc: hasErrorKYC,
      balance: hasErrorBalance,
      owner: hasErrorOwner,
      paused: hasErrorPaused
    }
  });
  if (!isConnected) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center p-4">
        <div className="text-center">
          <WarningIcon className="mx-auto mb-4 h-12 w-12 text-warning" size={48} />
          <h3 className="text-lg font-semibold">Wallet Not Connected</h3>
          <p className="text-muted-foreground">Please connect your wallet to view admin data</p>
        </div>
      </div>
    );
  }
  if (!contractAddress) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center p-4">
        <div className="text-center">
          <WarningIcon className="mx-auto mb-4 h-12 w-12 text-destructive" size={48} />
          <h3 className="text-lg font-semibold">Configuration Error</h3>
          <p className="text-muted-foreground">Contract address not properly configured</p>
          <p className="mt-2 text-xs text-muted-foreground">Check NEXT_PUBLIC_CONTRACT_ADDRESS</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">Admin Overview</h2>
        <div className="flex flex-wrap items-center gap-2">
          {isPaused && (
            <Badge variant="destructive" className="flex w-fit items-center gap-1">
              <WarningIcon className="h-3 w-3" size={12} />
              Contract Paused
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <ArrowClockwiseIcon className={`mr-2 h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} size={16} />
            Refresh
          </Button>
          <Button variant={isPaused ? 'default' : 'destructive'} size="sm" onClick={handlePauseToggle} disabled={!isConnected || !contractAddress}>
            {isPaused ? 'Unpause Contract' : 'Pause Contract'}
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Contract Balance"
          icon={<TrendUpIcon className="h-4 w-4" size={16} />}
          subtitle="Total contract funds"
          value={
            isLoading || loadingBalance ? (
              <Skeleton className="h-8 w-24" />
            ) : hasErrorBalance ? (
              <span className="text-sm text-destructive">Error loading balance</span>
            ) : (
              <span className="text-xl font-bold tabular-nums sm:text-2xl">
                {parseFloat(stats.contractBalance).toFixed(4)} {SYMBOL}
              </span>
            )
          }
          valueClassName="text-foreground"
        />
        <StatCard
          title="Pending KYC"
          icon={<SealCheckIcon className="h-4 w-4" size={16} />}
          subtitle="Awaiting review"
          value={
            isLoading || loadingKYC ? (
              <Skeleton className="h-8 w-16" />
            ) : hasErrorKYC ? (
              <span className="text-sm text-destructive">Error loading KYC</span>
            ) : (
              <span className="text-xl font-bold tabular-nums sm:text-2xl">{stats.pendingKYC}</span>
            )
          }
        />
        <StatCard
          title="System Status"
          icon={<ChartLineUpIcon className="h-4 w-4" size={16} />}
          subtitle="Contract status"
          value={
            hasErrorPaused ? (
              <Badge variant="secondary">Unknown</Badge>
            ) : (
              <Badge variant={isPaused ? 'destructive' : 'default'}>{isPaused ? 'Paused' : 'Active'}</Badge>
            )
          }
        />
        <StatCard
          title="Contract Owner"
          icon={<GearIcon className="h-4 w-4" size={16} />}
          subtitle="Owner address"
          value={
            hasErrorOwner ? (
              <span className="text-sm text-destructive">Error loading owner</span>
            ) : (
              <span className="break-all font-mono text-xs text-foreground">{contractOwner || 'Loading...'}</span>
            )
          }
          valueClassName="break-all font-mono text-xs"
        />
        <StatCard
          title="Network"
          icon={<GearIcon className="h-4 w-4" size={16} />}
          subtitle={`Chain ID: ${CHAIN_ID}`}
          value={<span className="text-xl font-bold sm:text-2xl">{NETWORK_NAME ?? '—'}</span>}
        />
        <StatCard
          title="Contract Address"
          icon={<GearIcon className="h-4 w-4" size={16} />}
          subtitle="Deployment address"
          value={<span className="break-all font-mono text-xs text-foreground">{contractAddress}</span>}
          valueClassName="break-all font-mono text-xs"
        />
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
            <Button className="h-auto min-h-[4rem] flex-col gap-2 py-3" onClick={() => onTabChange('kyc')} disabled={stats.pendingKYC === 0}>
              <SealCheckIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" size={24} />
              <span className="text-center text-xs sm:text-sm">Review KYC</span>
              {stats.pendingKYC > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.pendingKYC}
                </Badge>
              )}
            </Button>
            <Button variant="outline" className="h-auto min-h-[4rem] flex-col gap-2 py-3" onClick={() => onTabChange('users')}>
              <UsersIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" size={24} />
              <span className="text-center text-xs sm:text-sm">Manage Users</span>
            </Button>
            <Button variant="outline" className="h-auto min-h-[4rem] flex-col gap-2 py-3" onClick={() => onTabChange('transactions')}>
              <TrendUpIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" size={24} />
              <span className="text-center text-xs sm:text-sm">View Transactions</span>
            </Button>
            <Button variant="outline" className="h-auto min-h-[4rem] flex-col gap-2 py-3" onClick={() => onTabChange('settings')}>
              <GearIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" size={24} />
              <span className="text-center text-xs sm:text-sm">System Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length > 0 ? (
            <div className="space-y-2 overflow-hidden">
              {recentEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ChartLineUpIcon className="h-4 w-4 sm:h-5 sm:w-5" size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{event.type}</p>
                      <p className="text-xs text-muted-foreground sm:text-sm">Block: {event.blockNumber?.toString()}</p>
                    </div>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground sm:text-right">
                    {event.transactionHash?.slice(0, 10)}...
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <ChartLineUpIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" size={48} />
              <p className="text-muted-foreground">Recent activity will appear here</p>
              <p className="mt-1 text-sm text-muted-foreground">Transaction logs and KYC events</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
