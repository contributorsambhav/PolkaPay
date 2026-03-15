'use client';

import {
  WarningIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { DetailModal } from './DetailModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

const REMITTANCE_ABI = parseAbi(['function getPendingKYC() external view returns (address[] memory)', 'function getKYCRequest(address user) external view returns (string memory documentHash, uint256 timestamp, uint8 status, string memory rejectionReason)', 'function getUserInfo(address user) external view returns (uint8 tier, uint256 dailyLimit, uint256 todayUsed, uint256 balance, bool isWhitelistedUser, bool isBlacklistedUser, bool isFrozenUser, uint8 kycStatus)', 'function approveKYC(address user, uint8 tier) external', 'function rejectKYC(address user, string calldata reason) external', 'function batchApprove(address[] calldata users, uint8[] calldata tiers) external', 'function owner() external view returns (address)', 'function getTierLimit(uint8 tier) external view returns (uint256)', 'function getAllKYCUsers() external view returns (address[] memory)']);

const KYCStatus = {
  0: 'NONE',
  1: 'PENDING',
  2: 'APPROVED',
  3: 'REJECTED'
} as const;

interface TierLimits {
  [key: number]: string;
}

interface KYCRequestData {
  address: string;
  documentHash: string;
  timestamp: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  userInfo?: {
    tier: number;
    dailyLimit: string;
    balance: string;
    isWhitelisted: boolean;
    isBlacklisted: boolean;
    isFrozen: boolean;
  };
}
const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

function KYCRequestDetails({ address, userAddress, contractAddress, onDataLoaded }: { address: `0x${string}` | undefined; userAddress: string; contractAddress: `0x${string}`; onDataLoaded: (data: KYCRequestData) => void }) {
  const { data: kycData, isError: kycError } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getKYCRequest',
    args: [userAddress as `0x${string}`]
  });

  const { data: userInfo, isError: userInfoError } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getUserInfo',
    args: [userAddress as `0x${string}`]
  });

  useEffect(() => {
    if (kycData && userInfo) {
      try {
        const [documentHash, timestamp, status, rejectionReason] = kycData as [string, bigint, number, string];
        const [tier, dailyLimit, todayUsed, balance, isWhitelisted, isBlacklisted, isFrozen, kycStatus] = userInfo as [number, bigint, bigint, bigint, boolean, boolean, boolean, number];

        const finalDocumentHash = documentHash && documentHash.trim() !== '' ? documentHash : 'No document hash provided';

        onDataLoaded({
          address: userAddress,
          documentHash: finalDocumentHash,
          timestamp: new Date(Number(timestamp) * 1000),
          status: KYCStatus[status as keyof typeof KYCStatus] as 'PENDING' | 'APPROVED' | 'REJECTED',
          rejectionReason: rejectionReason || undefined,
          userInfo: {
            tier,
            dailyLimit: formatEther(dailyLimit),
            balance: formatEther(balance),
            isWhitelisted,
            isBlacklisted,
            isFrozen
          }
        });
      } catch (error) {
        console.error('Error processing KYC data for', userAddress, error);
        onDataLoaded({
          address: userAddress,
          documentHash: 'Error parsing data',
          timestamp: new Date(),
          status: 'PENDING'
        });
      }
    } else if (kycError || userInfoError) {
      onDataLoaded({
        address: userAddress,
        documentHash: 'Error loading data',
        timestamp: new Date(),
        status: 'PENDING'
      });
    }
  }, [kycData, userInfo, kycError, userInfoError, userAddress, onDataLoaded]);

  return null;
}

function KYCRequestsLoader({ address, addresses, contractAddress, onAllDataLoaded }: { address: `0x${string}` | undefined; addresses: readonly string[]; contractAddress: `0x${string}`; onAllDataLoaded: (data: KYCRequestData[]) => void }) {
  const [loadedData, setLoadedData] = useState<Map<string, KYCRequestData>>(new Map());
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    setLoadedData(new Map());
    setHasNotified(false);
  }, [addresses]);

  useEffect(() => {
    if (loadedData.size === addresses.length && addresses.length > 0 && !hasNotified) {
      const sortedData = addresses.map((addr) => loadedData.get(addr)).filter(Boolean) as KYCRequestData[];
      console.log('All KYC data loaded successfully:', sortedData);
      onAllDataLoaded(sortedData);
      setHasNotified(true);
    }
  }, [loadedData, addresses, onAllDataLoaded, hasNotified]);

  useEffect(() => {
    if (addresses.length === 0 || hasNotified) return;

    const timeoutId = setTimeout(() => {
      if (!hasNotified && loadedData.size > 0) {
        console.warn(`Timeout: Only ${loadedData.size}/${addresses.length} addresses loaded`);
        const sortedData = addresses.map((addr) => loadedData.get(addr)).filter(Boolean) as KYCRequestData[];
        onAllDataLoaded(sortedData);
        setHasNotified(true);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [addresses, loadedData, hasNotified, onAllDataLoaded]);

  const handleDataLoaded = useCallback((data: KYCRequestData) => {
    setLoadedData((prev) => {
      const newMap = new Map(prev);
      newMap.set(data.address, data);
      return newMap;
    });
  }, []);

  return (
    <>
      {addresses.map((addr) => (
        <KYCRequestDetails address={address} key={addr} userAddress={addr} contractAddress={contractAddress} onDataLoaded={handleDataLoaded} />
      ))}
    </>
  );
}

export function AdminKYCManagement() {
  const [selectedDocumentHash, setSelectedDocumentHash] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<{ [key: string]: number }>({});
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<KYCRequestData[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tierLimits, setTierLimits] = useState<TierLimits>({});
  const [loadingTierLimits, setLoadingTierLimits] = useState(true);
  const [pendingAddressesState, setPendingAddressesState] = useState<string[]>([]);
  const [dataLoadKey, setDataLoadKey] = useState(0);

  // useEffect(() => {
  //   if (isAdmin && contractAddress && address) {
  //     refetchPending();
  //   }
  // }, [isAdmin, contractAddress, address]);

  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      toast.error('Contract address not configured properly');
    }
  }, []);

  const { data: contractOwner, refetch: refetchOwner } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'owner',
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });

  const {
    data: pendingAddresses,
    refetch: refetchPending,
    isLoading: loadingPending,
    error: errorPending,
    isError: hasErrorPending
  } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getPendingKYC',
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected && isAdmin
    }
  });

  const { data: allKYCUsers, refetch: refetchAllUsers } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getAllKYCUsers',
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isAdmin
    }
  });

  const { data: tier1Limit } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [1],
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isAdmin
    }
  });

  const { data: tier2Limit } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [2],
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isAdmin
    }
  });

  const { data: tier3Limit } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [3],
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isAdmin
    }
  });

  const { data: vipLimit } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [4],
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isAdmin
    }
  });

  const { writeContractAsync, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  });

  useEffect(() => {
    if (contractOwner && address) {
      const adminStatus = (contractOwner as string).toLowerCase() === address.toLowerCase();
      setIsAdmin(adminStatus);
      if (!adminStatus && isConnected) {
        toast.error('Access denied: Admin privileges required');
      }
    }
  }, [contractOwner, address, isConnected]);

  useEffect(() => {
    if (tier1Limit !== undefined && tier2Limit !== undefined && tier3Limit !== undefined && vipLimit !== undefined) {
      setTierLimits({
        1: formatEther(tier1Limit as bigint),
        2: formatEther(tier2Limit as bigint),
        3: formatEther(tier3Limit as bigint),
        4: formatEther(vipLimit as bigint)
      });
      setLoadingTierLimits(false);
    }
  }, [tier1Limit, tier2Limit, tier3Limit, vipLimit]);

  useEffect(() => {
    if (Array.isArray(pendingAddresses)) {
      setPendingAddressesState(pendingAddresses);
      setDataLoadKey((prev) => prev + 1);
      console.log('pendingAddressesState updated:', pendingAddresses);
    }
  }, [pendingAddresses]);

  const handleAllDataLoaded = useCallback((data: KYCRequestData[]) => {
    console.log('All KYC data loaded:', data);
    setPendingRequests(data);
    setIsRefreshing(false);
  }, []);

  const handleViewDetails = (documentHash: string) => {
    setSelectedDocumentHash(documentHash);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDocumentHash(null);
  };

  const refreshData = async () => {
    if (!isAdmin) return;
    setIsRefreshing(true);
    setPendingRequests([]);
    console.log('Refresh triggered:', {
      isAdmin,
      contractAddress,
      address
    });
    try {
      // const refetchPendingRes = await refetchPending();
      // console.log('refetchPending response:', refetchPendingRes);

      const refetchOwnerRes = await refetchOwner();
      console.log('refetchOwner response:', refetchOwnerRes);

      const refetchAllUsersRes = await refetchAllUsers();
      console.log('refetchAllUsers response:', refetchAllUsersRes);

      const results = [refetchOwnerRes, refetchAllUsersRes];
      console.log('All refetch results:', results);

      toast.success('KYC data refreshed');
    } catch (error) {
      console.error('Failed to refresh KYC data', error);
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (userAddress: string) => {
    const tier = selectedTier[userAddress] || 1;
    setProcessingRequest(userAddress);
    try {
      await writeContractAsync({
        address: contractAddress!,
        abi: REMITTANCE_ABI,
        functionName: 'approveKYC',
        args: [userAddress as `0x${string}`, tier],
        chainId: CHAIN_ID
      });
    } catch (error) {
      console.error('Error approving KYC:', error);
      toast.error('Failed to approve KYC');
      setProcessingRequest(null);
    }
  };

  const handleReject = async (userAddress: string) => {
    const reason = rejectionReasons[userAddress];
    if (!reason?.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setProcessingRequest(userAddress);
    try {
      await writeContractAsync({
        address: contractAddress!,
        abi: REMITTANCE_ABI,
        functionName: 'rejectKYC',
        args: [userAddress as `0x${string}`, reason],
        chainId: CHAIN_ID
      });
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      toast.error('Failed to reject KYC');
      setProcessingRequest(null);
    }
  };

  const handleBatchApprove = async () => {
    const requestsToApprove = pendingRequests.filter((r) => selectedTier[r.address]);
    if (requestsToApprove.length === 0) {
      toast.error('Please select tiers for the requests you want to approve');
      return;
    }
    const addresses = requestsToApprove.map((r) => r.address as `0x${string}`);
    const tiers = requestsToApprove.map((r) => selectedTier[r.address]);
    try {
      await writeContractAsync({
        address: contractAddress!,
        abi: REMITTANCE_ABI,
        functionName: 'batchApprove',
        args: [addresses, tiers],
        chainId: CHAIN_ID
      });
    } catch (error) {
      console.error('Error batch approving:', error);
      toast.error('Failed to batch approve KYC requests');
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      toast.success('Transaction completed successfully');
      setProcessingRequest(null);
      refreshData();
      if (processingRequest) {
        setSelectedTier((prev) => {
          const { [processingRequest]: _, ...rest } = prev;
          return rest;
        });
        setRejectionReasons((prev) => {
          const { [processingRequest]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [isConfirmed, processingRequest]);

  const filteredRequests = pendingRequests;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTierName = (tier: number) => {
    if (loadingTierLimits) {
      return 'Loading limits...';
    }
    const limit = tierLimits[tier];
    if (!limit) {
      return `TIER ${tier} (Limit loading...)`;
    }
    switch (tier) {
      case 1:
        return `TIER 1 (${parseFloat(limit).toLocaleString()} ${SYMBOL}/day)`;
      case 2:
        return `TIER 2 (${parseFloat(limit).toLocaleString()} ${SYMBOL}/day)`;
      case 3:
        return `TIER 3 (${parseFloat(limit).toLocaleString()} ${SYMBOL}/day)`;
      case 4:
        return `VIP (${parseFloat(limit).toLocaleString()} ${SYMBOL}/day)`;
      default:
        return `TIER ${tier} (${parseFloat(limit).toLocaleString()} ${SYMBOL}/day)`;
    }
  };

  const renderErrorState = () => (
    <div className="flex items-center gap-2 text-sm text-destructive">
      <WarningIcon className="h-4 w-4" weight="regular" />
      Error loading admin data
    </div>
  );

  if (!isConnected) {
    return (
      <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
        <h2 className="text-xl font-semibold tracking-tight">KYC Management</h2>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <WarningIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" weight="duotone" />
              <p className="text-muted-foreground">Please connect your wallet to access the admin panel.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
        <h2 className="text-xl font-semibold tracking-tight">KYC Management</h2>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <WarningIcon className="mx-auto mb-2 h-8 w-8 text-destructive" weight="duotone" />
              <p className="text-muted-foreground">Contract address not configured.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && contractOwner) {
    return (
      <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
        <h2 className="text-xl font-semibold tracking-tight">KYC Management</h2>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <WarningIcon className="mx-auto mb-2 h-8 w-8 text-destructive" weight="duotone" />
              <p className="text-muted-foreground">Access denied: Admin privileges required.</p>
              <p className="mt-2 text-sm text-muted-foreground">Contract Owner: {String(contractOwner)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loadingPending || isRefreshing;
  const isTransactionPending = isWritePending || isConfirming;

  return (
    <div className="min-w-0 max-w-full w-full space-y-6 overflow-x-hidden">
      <h2 className="text-xl font-semibold tracking-tight">KYC Management</h2>
      {pendingAddressesState.length > 0 && contractAddress && <KYCRequestsLoader key={`${dataLoadKey}-${pendingAddressesState.join(',')}`} address={address} addresses={pendingAddressesState} contractAddress={contractAddress} onAllDataLoaded={handleAllDataLoaded} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{isLoading ? <Skeleton className="h-8 w-16 bg-muted" /> : hasErrorPending ? 'Error' : pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KYC Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{allKYCUsers ? allKYCUsers.length : <Skeleton className="h-8 w-16 bg-muted" />}</div>
            <p className="text-xs text-muted-foreground">All time requests</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Owner</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">{contractOwner ? `${String(contractOwner).slice(0, 6)}...${String(contractOwner).slice(-4)}` : <Skeleton className="h-4 w-20 bg-muted" />}</div>
            <p className="text-xs text-muted-foreground">Admin address</p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Access</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" weight="regular" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{isAdmin ? <Badge className="border-border bg-primary/10 text-primary">ADMIN</Badge> : <Badge variant="secondary">USER</Badge>}</div>
            <p className="text-xs text-muted-foreground">Access level</p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="min-w-0 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileTextIcon className="h-5 w-5" weight="regular" />
              Current Tier Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((tier) => (
                <div key={tier} className="rounded-lg border border-border p-3">
                  <div className="font-medium text-sm">{tier === 4 ? 'VIP' : `TIER ${tier}`}</div>
                  <div className="text-lg font-bold">{loadingTierLimits ? <Skeleton className="h-6 w-20" /> : `${parseFloat(tierLimits[tier] || '0').toLocaleString()} ${SYMBOL}`}</div>
                  <div className="text-xs text-muted-foreground">Daily limit</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="min-w-0 border-border shadow-sm">
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileTextIcon className="h-5 w-5" weight="regular" />
              KYC Requests ({filteredRequests.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="regular" />
                <Input placeholder="Search by address..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
              </div>
              {/* <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading || isTransactionPending}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button> */}
              <Button variant="outline" size="sm" onClick={handleBatchApprove} disabled={isLoading || isTransactionPending}>
                <UsersIcon className="mr-2 h-4 w-4" weight="regular" />
                Batch Approve
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasErrorPending && (
            <Alert variant="destructive" className="mb-4">
              <WarningIcon className="h-4 w-4" weight="regular" />
              <AlertDescription>{renderErrorState()}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileTextIcon className="mx-auto mb-4 h-12 w-12 opacity-50" weight="duotone" />
                <p>No pending KYC requests</p>
                {hasErrorPending && <p className="text-sm mt-2">Unable to load requests from contract</p>}
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request.address} className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium font-mono text-sm">{request.address}</p>
                        <Badge className="border-border bg-muted text-muted-foreground">PENDING</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Submitted: {formatDate(request.timestamp)}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={request.documentHash === 'Error loading data' || request.documentHash === 'No document hash provided'} onClick={() => handleViewDetails(request.documentHash)}>
                      <EyeIcon className="mr-2 h-4 w-4" weight="regular" />
                      View Details
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Document Hash (IPFS)</Label>
                    <p className="text-sm bg-muted p-2 rounded font-mono">{request.documentHash === 'Error loading' ? <span className="text-destructive">Error loading document hash</span> : request.documentHash}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assign Tier (if approving)</Label>
                      <Select
                        value={selectedTier[request.address]?.toString() || ''}
                        onValueChange={(value) =>
                          setSelectedTier((prev) => ({
                            ...prev,
                            [request.address]: parseInt(value)
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{getTierName(1)}</SelectItem>
                          <SelectItem value="2">{getTierName(2)}</SelectItem>
                          <SelectItem value="3">{getTierName(3)}</SelectItem>
                          <SelectItem value="4">{getTierName(4)}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rejection Reason (if rejecting)</Label>
                      <Textarea
                        placeholder="Enter reason for rejection..."
                        value={rejectionReasons[request.address] || ''}
                        onChange={(e) =>
                          setRejectionReasons((prev) => ({
                            ...prev,
                            [request.address]: e.target.value
                          }))
                        }
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <ConfirmationModal
                      trigger={
                        <Button size="sm" disabled={isTransactionPending || processingRequest === request.address || !selectedTier[request.address] || loadingTierLimits}>
                          <CheckCircleIcon className="mr-2 h-4 w-4" weight="regular" />
                          {processingRequest === request.address ? 'Approving...' : 'Approve'}
                        </Button>
                      }
                      title="Approve KYC Request"
                      description={`Are you sure you want to approve the KYC request for ${request.address}? They will be assigned ${getTierName(selectedTier[request.address])} status with corresponding daily limits.`}
                      confirmText="Approve KYC"
                      onConfirm={() => handleApprove(request.address)}
                      icon={<CheckCircleIcon className="h-5 w-5" weight="regular" />}
                    />
                    <ConfirmationModal
                      trigger={
                        <Button size="sm" variant="destructive" disabled={isTransactionPending || processingRequest === request.address || !rejectionReasons[request.address]?.trim()}>
                          <XCircleIcon className="mr-2 h-4 w-4" weight="regular" />
                          {processingRequest === request.address ? 'Rejecting...' : 'Reject'}
                        </Button>
                      }
                      title="Reject KYC Request"
                      description={`Are you sure you want to reject the KYC request for ${request.address}? Reason: "${rejectionReasons[request.address]}" This action will notify the user and they can resubmit with corrected documents.`}
                      confirmText="Reject KYC"
                      onConfirm={() => handleReject(request.address)}
                      variant="destructive"
                      icon={<XCircleIcon className="h-5 w-5" weight="regular" />}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDocumentHash && <DetailModal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} documentHash={selectedDocumentHash} />}
    </div>
  );
}
