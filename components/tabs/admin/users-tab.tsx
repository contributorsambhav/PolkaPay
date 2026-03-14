'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Crown, Filter, MoreHorizontal, Pause, Play, RefreshCw, Search, UserCheck, UserX, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UserActionConfirmationModal } from '@/components/ui/confirmation-modal';
import { toast } from 'sonner';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const REMITTANCE_ABI = parseAbi(['function getAllKYCUsers() external view returns (address[] memory)', 'function getUserInfo(address user) external view returns (uint8 tier, uint256 dailyLimit, uint256 todayUsed, uint256 balance, bool isWhitelistedUser, bool isBlacklistedUser, bool isFrozenUser, uint8 kycStatus)', 'function owner() external view returns (address)', 'function setUserTier(address user, uint8 tier) external', 'function freezeRecipient(address user, bool frozen) external', 'function setBlacklist(address user, bool status) external']);
const getContractAddress = (): `0x${string}` | undefined => {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address || !address.startsWith('0x') || address.length !== 42) {
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
const TierOptions = [
  { value: 0, label: 'NONE' },
  { value: 1, label: 'TIER1' },
  { value: 2, label: 'TIER2' },
  { value: 3, label: 'TIER3' },
  { value: 4, label: 'VIP' }
];
interface UserData {
  address: string;
  tier: string;
  kycStatus: string;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
  isFrozen: boolean;
  balance: string;
  dailyLimit: string;
  todayUsed: string;
  isLoading?: boolean;
  error?: boolean;
}
function TierChangeModal({ trigger, userAddress, currentTier, onTierChange }: { trigger: React.ReactNode; userAddress: string; currentTier: string; onTierChange: (tier: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(TierOptions.find((t) => t.label === currentTier)?.value || 0);
  const handleConfirm = () => {
    onTierChange(selectedTier);
    setIsOpen(false);
  };
  return (
    <div>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Change User Tier</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">User Address:</p>
                <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all">{userAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Current Tier:</p>
                <Badge className={getTierColor(currentTier)}>{currentTier}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select New Tier:</label>
                <select value={selectedTier} onChange={(e) => setSelectedTier(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  {TierOptions.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-500">This action will immediately change the user's daily transaction limits.</p>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleConfirm} disabled={selectedTier === TierOptions.find((t) => t.label === currentTier)?.value}>
                Update Tier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
    case 'NONE':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
function UserInfoCard({ userAddress, contractAddress, account, isAdmin, onUserAction, isTransactionPending }: { userAddress: string; contractAddress: `0x${string}`; account: `0x${string}` | undefined; isAdmin: boolean; onUserAction: (action: string, userAddress: string, tier?: number) => void; isTransactionPending: boolean }) {
  const CORRECT_CHAIN_ID = 420420417;

  const {
    data: userInfo,
    isLoading,
    error,
    refetch
  } = useReadContract({
    address: contractAddress,
    account: account,
    abi: REMITTANCE_ABI,
    functionName: 'getUserInfo',
    args: [userAddress as `0x${string}`],
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!account && isAdmin && !!userAddress
    }
  });
  useEffect(() => {
    if (window.userRefetchFunctions) {
      window.userRefetchFunctions[userAddress] = refetch;
    } else {
      window.userRefetchFunctions = { [userAddress]: refetch };
    }
    return () => {
      if (window.userRefetchFunctions) {
        delete window.userRefetchFunctions[userAddress];
      }
    };
  }, [refetch, userAddress]);
  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'NONE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium font-mono text-sm">{userAddress}</p>
              <div className="flex items-center gap-2 mt-1">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-sm">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-10" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    );
  }
  if (error || !userInfo) {
    return (
      <div className="border rounded-lg p-4 border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium font-mono text-sm">{userAddress}</p>
              <Badge variant="destructive">Error loading data</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
  const [tier, dailyLimit, todayUsed, balance, isWhitelistedUser, isBlacklistedUser, isFrozenUser, kycStatus] = userInfo;
  const userData = {
    address: userAddress,
    tier: UserTier[tier as keyof typeof UserTier] || 'UNKNOWN',
    kycStatus: KYCStatus[kycStatus as keyof typeof KYCStatus] || 'UNKNOWN',
    isWhitelisted: isWhitelistedUser,
    isBlacklisted: isBlacklistedUser,
    isFrozen: isFrozenUser,
    balance: formatEther(balance),
    dailyLimit: formatEther(dailyLimit),
    todayUsed: formatEther(todayUsed)
  };
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-medium font-mono text-sm">{userData.address}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getTierColor(userData.tier)}>{userData.tier}</Badge>
              <Badge className={getKYCStatusColor(userData.kycStatus)}>{userData.kycStatus}</Badge>
              {userData.isFrozen && <Badge variant="destructive">FROZEN</Badge>}
              {userData.isBlacklisted && <Badge variant="destructive">BLACKLISTED</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right text-sm">
            <p className="text-muted-foreground">
              Balance: {Math.floor(Number(userData.balance))} ${SYMBOL}
            </p>
            <p className="text-muted-foreground">
              Limit: {Math.floor(Number(userData.dailyLimit))} ${SYMBOL}
            </p>
            <p className="text-muted-foreground">
              Used Today: {Math.floor(Number(userData.todayUsed))} ${SYMBOL}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <TierChangeModal
          trigger={
            <Button size="sm" variant="outline" disabled={isTransactionPending}>
              <Crown className="h-4 w-4 mr-2" />
              Change Tier
            </Button>
          }
          userAddress={userData.address}
          currentTier={userData.tier}
          onTierChange={(tier) => onUserAction('change-tier', userData.address, tier)}
        />
        {userData.isFrozen ? (
          <UserActionConfirmationModal
            trigger={
              <Button size="sm" variant="outline" className="text-green-600 bg-transparent" disabled={isTransactionPending}>
                <Play className="h-4 w-4 mr-2" />
                Unfreeze
              </Button>
            }
            action="unfreeze"
            userAddress={userData.address}
            onConfirm={() => onUserAction('unfreeze', userData.address)}
          />
        ) : (
          <UserActionConfirmationModal
            trigger={
              <Button size="sm" variant="outline" className="text-red-600 bg-transparent" disabled={isTransactionPending}>
                <Pause className="h-4 w-4 mr-2" />
                Freeze
              </Button>
            }
            action="freeze"
            userAddress={userData.address}
            onConfirm={() => onUserAction('freeze', userData.address)}
          />
        )}
        {userData.isBlacklisted ? (
          <UserActionConfirmationModal
            trigger={
              <Button size="sm" variant="outline" className="text-green-600 bg-transparent" disabled={isTransactionPending}>
                <UserCheck className="h-4 w-4 mr-2" />
                Remove from Blacklist
              </Button>
            }
            action="remove-blacklist"
            userAddress={userData.address}
            onConfirm={() => onUserAction('remove-blacklist', userData.address)}
            title="Remove User from Blacklist"
            description={`Are you sure you want to remove ${userData.address} from the blacklist? This user will be able to use the platform again.`}
            confirmText="Remove from Blacklist"
            icon={<UserCheck className="h-5 w-5" />}
          />
        ) : (
          <UserActionConfirmationModal
            trigger={
              <Button size="sm" variant="outline" className="text-red-600 bg-transparent" disabled={isTransactionPending}>
                <UserX className="h-4 w-4 mr-2" />
                Blacklist
              </Button>
            }
            action="blacklist"
            userAddress={userData.address}
            onConfirm={() => onUserAction('blacklist', userData.address)}
            title="Blacklist User"
            description={`Are you sure you want to blacklist ${userData.address}? This user will be denied access to all platform functions.`}
            confirmText="Blacklist User"
            variant="destructive"
            icon={<UserX className="h-5 w-5" />}
          />
        )}
      </div>
    </div>
  );
}
declare global {
  interface Window {
    userRefetchFunctions?: { [key: string]: () => void };
  }
}
export function UsersTab() {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      toast.error('Contract address not configured properly');
    }
  }, []);
  const CORRECT_CHAIN_ID = 420420417;

  const { data: contractOwner } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'owner',
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });
  const {
    data: allKYCUsers,
    refetch: refetchUsers,
    isLoading: loadingKYCUsers,
    error: errorKYCUsers
  } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getAllKYCUsers',
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected && isAdmin
    }
  });
  const { writeContractAsync, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  });
  useEffect(() => {
    if (contractOwner && address) {
      const adminStatus = contractOwner.toLowerCase() === address.toLowerCase();
      setIsAdmin(adminStatus);
      if (!adminStatus && isConnected) {
        toast.error('Access denied: Admin privileges required');
      }
    }
  }, [contractOwner, address, isConnected]);
  const refreshData = async () => {
    if (!isAdmin) return;
    setIsRefreshing(true);
    try {
      await refetchUsers();
      if (window.userRefetchFunctions) {
        await Promise.all(Object.values(window.userRefetchFunctions).map((refetch) => refetch()));
      }
      toast.success('Users data refreshed');
    } catch (error) {
      toast.error('Failed to refresh users data');
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleUserAction = async (action: string, userAddress: string, tier?: number) => {
    if (!contractAddress || !isAdmin) {
      toast.error('Unauthorized action');
      return;
    }
    try {
      switch (action) {
        case 'change-tier':
          if (tier === undefined) {
            toast.error('Tier value required');
            return;
          }
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'setUserTier',
            args: [userAddress as `0x${string}`, tier],
            chainId: CORRECT_CHAIN_ID
          });
          break;
        case 'freeze':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'freezeRecipient',
            args: [userAddress as `0x${string}`, true],
            chainId: CORRECT_CHAIN_ID
          });
          break;
        case 'unfreeze':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'freezeRecipient',
            args: [userAddress as `0x${string}`, false],
            chainId: CORRECT_CHAIN_ID
          });
          break;
        case 'blacklist':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'setBlacklist',
            args: [userAddress as `0x${string}`, true],
            chainId: CORRECT_CHAIN_ID
          });
          break;
        case 'remove-blacklist':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'setBlacklist',
            args: [userAddress as `0x${string}`, false],
            chainId: CORRECT_CHAIN_ID
          });
          break;
        default:
          toast.error('Unknown action');
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };
  useEffect(() => {
    if (isConfirmed) {
      toast.success('Transaction completed successfully');
      refreshData();
    }
  }, [isConfirmed]);
  const filteredUsers = allKYCUsers?.filter((userAddress) => userAddress.toLowerCase().includes(searchTerm.toLowerCase())) || [];
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Please connect your wallet to access user management</p>
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
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Contract address not configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!isAdmin && contractOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Access denied: Admin privileges required</p>
            <p className="text-sm text-muted-foreground mt-2">Contract Owner: {contractOwner}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  const isLoading = loadingKYCUsers || isRefreshing;
  const isTransactionPending = isWritePending || isConfirming;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management ({filteredUsers.length} users)
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
              </div>
              <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading || isTransactionPending}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errorKYCUsers && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Failed to load users from contract</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <Skeleton className="h-5 w-40 mb-2" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-10" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                {errorKYCUsers && <p className="text-sm mt-2">Unable to load users from contract</p>}
              </div>
            ) : (
              filteredUsers.map((userAddress) => <UserInfoCard key={userAddress} userAddress={userAddress} contractAddress={contractAddress!} account={address} isAdmin={isAdmin} onUserAction={handleUserAction} isTransactionPending={isTransactionPending} />)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
