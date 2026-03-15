'use client';

import { AlertCircle, AlertTriangle, CheckCircle, Clock, RefreshCw, Shield, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const REMITTANCE_ABI = parseAbi(['function getUserInfo(address user) external view returns (uint8 tier, uint256 dailyLimit, uint256 todayUsed, uint256 balance, bool isWhitelistedUser, bool isBlacklistedUser, bool isFrozenUser, uint8 kycStatus)', 'function getKYCRequest(address user) external view returns (string memory documentHash, uint256 timestamp, uint8 status, string memory rejectionReason)', 'function getKYCStatus(address user) external view returns (uint8)']);
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
export function KYCStatusCard() {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      toast.error('Contract address not configured properly');
    }
  }, []);

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
    chainId: CHAIN_ID,
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
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchUserInfo(), refetchKYCRequest()]);
      toast.success('KYC data refreshed');
    } catch (error) {
      toast.error('Failed to refresh KYC data');
    } finally {
      setIsRefreshing(false);
    }
  };
  const kycStatusNum = userInfo ? userInfo[7] : undefined;
  const kycStatus = kycStatusNum !== undefined ? KYCStatus[kycStatusNum as keyof typeof KYCStatus] : undefined;
  const tierNum = userInfo ? userInfo[0] : undefined;
  const tierName = tierNum !== undefined ? UserTier[tierNum as keyof typeof UserTier] : undefined;
  const dailyLimit = userInfo ? formatEther(userInfo[1]) : undefined;
  const rejectionReason = kycRequest ? kycRequest[3] : undefined;
  const kycTimestamp = kycRequest ? new Date(Number(kycRequest[1]) * 1000) : undefined;
  const isLoading = loadingUserInfo || loadingKYCRequest;
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };
  const getStatusColor = (status: string) => {
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
  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Your identity has been verified. You can now use all platform features.';
      case 'PENDING':
        return 'Your KYC request is under review. This typically takes 1-3 business days.';
      case 'REJECTED':
        return 'Your KYC request was rejected. Please review the feedback and resubmit.';
      default:
        return 'Complete KYC verification to access all platform features and higher limits.';
    }
  };
  const renderErrorState = () => (
    <div className="text-sm text-red-500 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      Error loading KYC data
    </div>
  );
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            KYC Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Please connect your wallet to view KYC status</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            KYC Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Contract address not configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            KYC Verification Status
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading || isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {isLoading ? <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" /> : hasErrorUserInfo ? <AlertTriangle className="h-5 w-5 text-red-500" /> : kycStatus ? getStatusIcon(kycStatus) : <AlertCircle className="h-5 w-5 text-gray-600" />}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Status:</span>
              {isLoading ? <Skeleton className="h-6 w-20" /> : hasErrorUserInfo ? renderErrorState() : kycStatus ? <Badge className={getStatusColor(kycStatus)}>{kycStatus}</Badge> : <Badge variant="secondary">Unknown</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{isLoading ? 'Loading...' : hasErrorUserInfo ? 'Unable to load status message' : kycStatus ? getStatusMessage(kycStatus) : 'Unable to determine status'}</p>
          </div>
        </div>
        {kycStatus === 'APPROVED' && !isLoading && !hasErrorUserInfo && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Verification Complete</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p>
                • Account Tier: <span className="font-medium">{tierName || 'Unknown'}</span>
              </p>
              <p>
                • Daily Limit: <span className="font-medium">{dailyLimit ? `${parseFloat(dailyLimit).toFixed(4)} ${SYMBOL}` : 'Unknown'}</span>
              </p>
              <p>• Full platform access enabled</p>
              {kycTimestamp && (
                <p>
                  • Approved on: <span className="font-medium">{kycTimestamp.toLocaleDateString()}</span>
                </p>
              )}
            </div>
          </div>
        )}
        {kycStatus === 'REJECTED' && !isLoading && !hasErrorUserInfo && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Verification Failed</span>
            </div>
            {rejectionReason && !hasErrorKYCRequest && (
              <div className="mb-3">
                <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{rejectionReason}</p>
              </div>
            )}
            <p className="text-sm text-red-700 mb-3">Please review the requirements and submit a new request with valid documentation.</p>
            <Button size="sm" variant="outline" className="text-red-700 border-red-300 bg-transparent">
              Resubmit KYC
            </Button>
          </div>
        )}
        {kycStatus === 'PENDING' && !isLoading && !hasErrorUserInfo && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Under Review</span>
            </div>
            <p className="text-sm text-yellow-700 mb-2">Our team is reviewing your documents. You'll receive an email notification once the review is complete.</p>
            {kycTimestamp && !hasErrorKYCRequest && (
              <p className="text-sm text-yellow-600">
                Submitted on: {kycTimestamp.toLocaleDateString()} at {kycTimestamp.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
        {kycStatus === 'NONE' && !isLoading && !hasErrorUserInfo && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Verification Required</span>
            </div>
            <p className="text-sm text-blue-700 mb-3">Complete your KYC verification to access all platform features and increase your transaction limits.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
