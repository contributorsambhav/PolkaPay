'use client';

import { AlertTriangle, CheckCircle, Clock, RefreshCw, Shield, User, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const REMITTANCE_ABI = parseAbi(['function getUserInfo(address user) external view returns (uint8 tier, uint256 dailyLimit, uint256 todayUsed, uint256 balance, bool isWhitelistedUser, bool isBlacklistedUser, bool isFrozenUser, uint8 kycStatus)', 'function getKYCRequest(address user) external view returns (string memory documentHash, uint256 timestamp, uint8 status, string memory rejectionReason)', 'function getKYCStatus(address user) external view returns (uint8)', 'function getBalance(address user) external view returns (uint256)', 'function isWhitelisted(address user) external view returns (bool)', 'function isBlacklisted(address user) external view returns (bool)', 'function isFrozen(address user) external view returns (bool)', 'function getRemainingLimit(address user) external view returns (uint256)', 'function getTierLimit(uint8 tier) external view returns (uint256)']);
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
const KYCStatus = {
  0: 'NONE',
  1: 'PENDING',
  2: 'APPROVED',
  3: 'REJECTED'
} as const;
const UserTier = {
  0: 'NONE',
  1: 'TIER1',
  2: 'TIER2',
  3: 'TIER3',
  4: 'VIP'
} as const;
export function ProfileTab() {
  const { address, isConnected, chain } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      toast.error('Contract address not configured properly');
    }
  }, []);
  useEffect(() => {
    console.log('🔗 ProfileTab Connection State:', {
      address,
      isConnected,
      chain: chain?.id,
      chainName: chain?.name,
      contractAddress
    });
  }, [address, isConnected, chain, contractAddress]);
  const CORRECT_CHAIN_ID = 420420417;

  const {
    data: userInfo,
    refetch: refetchUserInfo,
    isLoading: loadingUserInfo,
    error: errorUserInfo,
    isError: hasErrorUserInfo
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getUserInfo',
    args: [address!],
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });
  const {
    data: kycRequest,
    refetch: refetchKYCRequest,
    isLoading: loadingKYCRequest,
    error: errorKYCRequest,
    isError: hasErrorKYCRequest
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getKYCRequest',
    args: [address!],
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });
  useEffect(() => {
    console.log('📊 ProfileTab Contract Read Results:', {
      userInfo: {
        data: userInfo,
        loading: loadingUserInfo,
        error: hasErrorUserInfo ? errorUserInfo : null
      },
      kycRequest: {
        data: kycRequest,
        loading: loadingKYCRequest,
        error: hasErrorKYCRequest ? errorKYCRequest : null
      }
    });
  }, [userInfo, loadingUserInfo, hasErrorUserInfo, errorUserInfo, kycRequest, loadingKYCRequest, hasErrorKYCRequest, errorKYCRequest]);
  const refreshData = async () => {
    console.log('🔄 Refreshing profile data...');
    setIsRefreshing(true);
    try {
      const promises = [refetchUserInfo(), refetchKYCRequest()];
      const results = await Promise.allSettled(promises);
      results.forEach((result, index) => {
        const names = ['UserInfo', 'KYCRequest'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${names[index]} refreshed:`, result.value);
        } else {
          console.error(`❌ ${names[index]} refresh failed:`, result.reason);
        }
      });
      toast.success('Profile data refreshed');
    } catch (error) {
      console.error('❌ Profile refresh failed:', error);
      toast.error('Failed to refresh profile data');
    } finally {
      setIsRefreshing(false);
    }
  };
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TIER3':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TIER2':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'TIER1':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
  const getKYCStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };
  const renderErrorState = (errorMessage: string) => (
    <div className="text-sm text-red-500 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      {errorMessage}
    </div>
  );
  const renderLoadingState = () => <Skeleton className="h-6 w-24" />;
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Wallet Not Connected</h3>
          <p className="text-muted-foreground">Please connect your wallet to view your profile</p>
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
  const tierName = userInfo ? UserTier[userInfo[0] as keyof typeof UserTier] : undefined;
  const kycStatusName = userInfo ? KYCStatus[userInfo[7] as keyof typeof KYCStatus] : undefined;
  const dailyLimit = userInfo ? formatEther(userInfo[1]) : undefined;
  const todayUsed = userInfo ? formatEther(userInfo[2]) : undefined;
  const balance = userInfo ? formatEther(userInfo[3]) : undefined;
  const isWhitelistedUser = userInfo ? userInfo[4] : undefined;
  const isBlacklistedUser = userInfo ? userInfo[5] : undefined;
  const isFrozenUser = userInfo ? userInfo[6] : undefined;
  const remainingLimit = userInfo && dailyLimit && todayUsed ? (parseFloat(dailyLimit) - parseFloat(todayUsed)).toFixed(4) : undefined;
  const kycDocumentHash = kycRequest ? kycRequest[0] : undefined;
  const kycTimestamp = kycRequest ? new Date(Number(kycRequest[1]) * 1000) : undefined;
  const kycRejectionReason = kycRequest ? kycRequest[3] : undefined;
  const isLoading = loadingUserInfo || loadingKYCRequest;
  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading || isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Wallet Address</label>
              <p className="text-sm bg-muted p-2 rounded font-mono">{address}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Balance</label>
              {isLoading ? (
                renderLoadingState()
              ) : hasErrorUserInfo ? (
                renderErrorState('Error loading balance')
              ) : (
                <p className="text-sm font-semibold">
                  {balance} {SYMBOL}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Tier</label>
              {isLoading ? renderLoadingState() : hasErrorUserInfo ? renderErrorState('Error loading tier') : tierName ? <Badge className={getTierColor(tierName)}>{tierName}</Badge> : <Badge variant="secondary">Unknown</Badge>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">KYC Status</label>
              {isLoading ? (
                renderLoadingState()
              ) : hasErrorUserInfo ? (
                renderErrorState('Error loading KYC status')
              ) : kycStatusName ? (
                <div className="flex items-center gap-2">
                  {getKYCStatusIcon(kycStatusName)}
                  <Badge className={getKYCStatusColor(kycStatusName)}>{kycStatusName}</Badge>
                </div>
              ) : (
                <Badge variant="secondary">Unknown</Badge>
              )}
            </div>
            {kycStatusName === 'REJECTED' && kycRejectionReason && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-600">Rejection Reason</label>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{kycRejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Security & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Whitelisted Status</span>
              </div>
              {isLoading ? (
                renderLoadingState()
              ) : hasErrorUserInfo ? (
                renderErrorState('Error loading whitelist status')
              ) : isBlacklistedUser !== undefined && isWhitelistedUser !== undefined ? (
                isBlacklistedUser ? (
                  <Badge variant="destructive">Blacklisted</Badge>
                ) : (
                  <Badge variant={isWhitelistedUser ? 'outline' : 'destructive'} className={isWhitelistedUser ? 'text-green-600 border-green-200' : ''}>
                    {isWhitelistedUser ? 'Whitelisted' : 'Not Whitelisted'}
                  </Badge>
                )
              ) : (
                <Badge variant="secondary">Unknown</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Account Status</span>
              </div>
              {isLoading ? (
                renderLoadingState()
              ) : hasErrorUserInfo ? (
                renderErrorState('Error loading account status')
              ) : isFrozenUser !== undefined ? (
                <Badge variant={isFrozenUser ? 'destructive' : 'outline'} className={!isFrozenUser ? 'text-green-600 border-green-200' : ''}>
                  {isFrozenUser ? 'Frozen' : 'Active'}
                </Badge>
              ) : (
                <Badge variant="secondary">Unknown</Badge>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Daily Transaction Limits</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Current Tier: {isLoading ? 'Loading...' : hasErrorUserInfo ? 'Error' : tierName || 'Unknown'}</p>
                <p>Daily Limit: {isLoading ? 'Loading...' : hasErrorUserInfo ? 'Error' : dailyLimit ? `${parseFloat(dailyLimit).toFixed(4)} ${SYMBOL}` : 'Unknown'}</p>
                <p>Used Today: {isLoading ? 'Loading...' : hasErrorUserInfo ? 'Error' : todayUsed ? `${parseFloat(todayUsed).toFixed(4)} ${SYMBOL}` : 'Unknown'}</p>
                <p>Remaining: {isLoading ? 'Loading...' : hasErrorUserInfo ? 'Error' : remainingLimit ? `${remainingLimit} ${SYMBOL}` : 'Unknown'}</p>
              </div>
            </div>
            {kycTimestamp && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">KYC Information</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Submitted: {kycTimestamp.toLocaleDateString()}</p>
                    {kycDocumentHash && <p>Document Hash: {kycDocumentHash.slice(0, 20)}...</p>}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Debug Info Card - Remove in production */}
      {/* { <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm text-yellow-800">Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-yellow-700">
          <div>Connected: {isConnected ? '✅' : '❌'}</div>
          <div>Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
          <div>Contract: {contractAddress?.slice(0, 6)}...{contractAddress?.slice(-4)}</div>
          <div>Loading: {isLoading ? '⏳' : '✅'}</div>
          <div>UserInfo Error: {hasErrorUserInfo ? '❌' : '✅'}</div>
          <div>KYC Error: {hasErrorKYCRequest ? '❌' : '✅'}</div>
          <div>Raw UserInfo: {JSON.stringify(userInfo, (_, v) => typeof v === "bigint" ? v.toString() : v)}</div>
          <div>Raw KYC: {JSON.stringify(kycRequest, (_, v) => typeof v === "bigint" ? v.toString() : v)}</div>
        </CardContent>
      </Card> } */}
    </div>
  );
}
