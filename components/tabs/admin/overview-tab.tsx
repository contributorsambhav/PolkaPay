'use client';

import { Activity, AlertTriangle, FileCheck, RefreshCw, Settings, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract, useWatchContractEvent, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface OverviewTabProps {
  onTabChange: (tab: string) => void;
}

const REMITTANCE_ABI = parseAbi(['function getPendingKYC() external view returns (address[] memory)', 'function getContractBalance() external view returns (uint256)', 'function owner() external view returns (address)', 'function paused() external view returns (bool)', 'function getTierLimit(uint8 tier) external view returns (uint256)', 'function pause() external', 'function unpause() external', 'event KYCRequested(address indexed user, string documentHash, uint256 timestamp)', 'event KYCApproved(address indexed user, uint256 timestamp)', 'event KYCRejected(address indexed user, string reason, uint256 timestamp)', 'event KYCDocumentUpdated(address indexed user, string oldHash, string newHash, uint256 timestamp)', 'event Sent(address indexed sender, address indexed recipient, uint256 amount)', 'event Claimed(address indexed recipient, uint256 amount)', 'event Frozen(address indexed recipient, bool frozen)', 'event TierUpdated(address indexed user, uint8 newTier)', 'event UserWhitelisted(address indexed user, bool status)', 'event UserBlacklisted(address indexed user, bool status)', 'event Paused(address account)', 'event Unpaused(address account)']);

// Environment variables
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID;
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME;

const getContractAddress = (): `0x${string}` | undefined => {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  console.log('🔍 Contract Address from env:', address);
  if (!address) {
    console.error('❌ NEXT_PUBLIC_CONTRACT_ADDRESS not found in environment');
    return undefined;
  }
  if (!address.startsWith('0x') || address.length !== 42) {
    console.error('❌ Invalid contract address format:', address);
    return undefined;
  }
  return address as `0x${string}`;
};
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
  const CORRECT_CHAIN_ID = 420420417;

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
    chainId: CORRECT_CHAIN_ID,
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
    chainId: CORRECT_CHAIN_ID,
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
    chainId: CORRECT_CHAIN_ID,
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
    chainId: CORRECT_CHAIN_ID,
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
        chainId: CORRECT_CHAIN_ID
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Wallet Not Connected</h3>
          <p className="text-muted-foreground">Please connect your wallet to view admin data</p>
        </div>
      </div>
    );
  }
  if (!contractAddress) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Configuration Error</h3>
          <p className="text-muted-foreground">Contract address not properly configured</p>
          <p className="text-xs text-muted-foreground mt-2">Check NEXT_PUBLIC_CONTRACT_ADDRESS environment variable</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Overview</h2>
        <div className="flex items-center gap-4">
          {isPaused && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Contract Paused
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant={isPaused ? 'default' : 'destructive'} size="sm" onClick={handlePauseToggle} disabled={!isConnected || !contractAddress}>
            {isPaused ? 'Unpause Contract' : 'Pause Contract'}
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading || loadingBalance ? (
              <Skeleton className="h-8 w-24" />
            ) : hasErrorBalance ? (
              <div className="text-sm text-red-500">Error loading balance</div>
            ) : (
              <div className="text-2xl font-bold">
                {parseFloat(stats.contractBalance).toFixed(4)} {SYMBOL}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total contract funds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading || loadingKYC ? <Skeleton className="h-8 w-16" /> : hasErrorKYC ? <div className="text-sm text-red-500">Error loading KYC</div> : <div className="text-2xl font-bold">{stats.pendingKYC}</div>}
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasErrorPaused ? <Badge variant="secondary">Unknown</Badge> : <Badge variant={isPaused ? 'destructive' : 'default'}>{isPaused ? 'Paused' : 'Active'}</Badge>}</div>
            <p className="text-xs text-muted-foreground">Contract status</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Owner</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono break-all">{hasErrorOwner ? <div className="text-red-500">Error loading owner</div> : contractOwner || 'Loading...'}</div>
            <p className="text-xs text-muted-foreground">Owner address</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{NETWORK_NAME}</div>
            <p className="text-xs text-muted-foreground">Chain ID: {CHAIN_ID}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Address</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono break-all">{contractAddress}</div>
            <p className="text-xs text-muted-foreground">Deployment address</p>
          </CardContent>
        </Card>
      </div>
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col gap-2" onClick={() => onTabChange('kyc')} disabled={stats.pendingKYC === 0}>
              <FileCheck className="h-6 w-6" />
              Review KYC
              {stats.pendingKYC > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.pendingKYC}
                </Badge>
              )}
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" onClick={() => onTabChange('users')}>
              <Users className="h-6 w-6" />
              Manage Users
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" onClick={() => onTabChange('transactions')}>
              <TrendingUp className="h-6 w-6" />
              View Transactions
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" onClick={() => onTabChange('settings')}>
              <Settings className="h-6 w-6" />
              System Settings
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length > 0 ? (
            <div className="space-y-4">
              {recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{event.type}</p>
                      <p className="text-sm text-muted-foreground">Block: {event.blockNumber?.toString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{event.transactionHash?.slice(0, 10)}...</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Recent activity will appear here</p>
              <p className="text-sm text-muted-foreground">Transaction logs and KYC events will be displayed</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
