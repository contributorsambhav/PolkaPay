'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Crown, Filter, MoreHorizontal, Pause, Play, RefreshCw, Search, UserCheck, UserX, Users } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UserActionConfirmationModal } from '@/components/ui/confirmation-modal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const REMITTANCE_ABI = parseAbi(['function getAllKYCUsers() external view returns (address[] memory)', 'function getUserInfo(address user) external view returns (uint8 tier, uint256 dailyLimit, uint256 todayUsed, uint256 balance, bool isWhitelistedUser, bool isBlacklistedUser, bool isFrozenUser, uint8 kycStatus)', 'function owner() external view returns (address)', 'function setUserTier(address user, uint8 tier) external', 'function freezeRecipient(address user, bool frozen) external', 'function setBlacklist(address user, bool status) external']);
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
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">{trigger}</div>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Crown className="h-5 w-5 shrink-0 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Change User Tier</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-sm font-medium text-muted-foreground">User address</p>
                <p className="break-all rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">{userAddress}</p>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-muted-foreground">Current tier</p>
                <Badge className={getTierColor(currentTier)}>{currentTier}</Badge>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">New tier</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(Number(e.target.value))}
                  className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {TierOptions.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">This will update the user’s daily transaction limits immediately.</p>
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 cursor-pointer" onClick={handleConfirm} disabled={selectedTier === TierOptions.find((t) => t.label === currentTier)?.value}>
                Update tier
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
      return 'bg-primary/15 text-primary border-primary/30';
    case 'TIER3':
      return 'bg-secondary/50 text-secondary-foreground border-border';
    case 'TIER2':
      return 'bg-success/15 text-success border-success/30';
    case 'TIER1':
      return 'bg-warning/15 text-warning-foreground border-warning/30';
    case 'NONE':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};
function UserInfoCard({ userAddress, contractAddress, account, isAdmin, onUserAction, isTransactionPending }: { userAddress: string; contractAddress: `0x${string}`; account: `0x${string}` | undefined; isAdmin: boolean; onUserAction: (action: string, userAddress: string, tier?: number) => void; isTransactionPending: boolean }) {
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
    chainId: CHAIN_ID,
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
        return 'bg-success/15 text-success border-success/30';
      case 'PENDING':
        return 'bg-warning/15 text-warning-foreground border-warning/30';
      case 'REJECTED':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'NONE':
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };
  if (isLoading) {
    return (
      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-48 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1 text-right">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </CardContent>
        <CardFooter className="border-t border-border">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </CardFooter>
      </Card>
    );
  }
  if (error || !userInfo) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-medium text-foreground">{userAddress}</p>
            <Badge variant="destructive" className="mt-2">Error loading data</Badge>
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer shrink-0" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </CardContent>
      </Card>
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
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="truncate font-mono text-sm font-medium text-foreground sm:break-all">{userData.address}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={cn('cursor-default text-xs font-medium', getTierColor(userData.tier))}>
              {userData.tier}
            </Badge>
            <Badge variant="secondary" className={cn('cursor-default text-xs', getKYCStatusColor(userData.kycStatus))}>
              {userData.kycStatus}
            </Badge>
            {userData.isFrozen && (
              <Badge variant="destructive" className="cursor-default text-xs">FROZEN</Badge>
            )}
            {userData.isBlacklisted && (
              <Badge variant="destructive" className="cursor-default text-xs">BLACKLISTED</Badge>
            )}
          </div>
        </div>
        <div className="shrink-0 min-w-0 rounded-lg bg-muted/50 px-3 py-2.5 text-right text-sm sm:min-w-[130px]">
          <p className="font-medium tabular-nums text-foreground">{Math.floor(Number(userData.balance))} {SYMBOL}</p>
          <p className="text-xs text-muted-foreground">Limit {Math.floor(Number(userData.dailyLimit))} · Used {Math.floor(Number(userData.todayUsed))}</p>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border bg-muted/20">
        <TierChangeModal
          trigger={
            <Button size="sm" variant="secondary" className="cursor-pointer" disabled={isTransactionPending}>
              <Crown className="mr-2 h-4 w-4 shrink-0" />
              Change tier
            </Button>
          }
          userAddress={userData.address}
          currentTier={userData.tier}
          onTierChange={(tier) => onUserAction('change-tier', userData.address, tier)}
        />
        {userData.isFrozen ? (
          <UserActionConfirmationModal
            trigger={
              <Button size="sm" variant="outline" className="cursor-pointer border-success/40 text-success hover:bg-success/10" disabled={isTransactionPending}>
                <Play className="mr-2 h-4 w-4 shrink-0" />
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
              <Button size="sm" variant="outline" className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10" disabled={isTransactionPending}>
                <Pause className="mr-2 h-4 w-4 shrink-0" />
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
              <Button size="sm" variant="outline" className="cursor-pointer border-success/40 text-success hover:bg-success/10" disabled={isTransactionPending}>
                <UserCheck className="mr-2 h-4 w-4 shrink-0" />
                Remove from blacklist
              </Button>
            }
            action="remove-blacklist"
            userAddress={userData.address}
            onConfirm={() => onUserAction('remove-blacklist', userData.address)}
          />
        ) : (
          <UserActionConfirmationModal
            trigger={
              <Button size="sm" variant="outline" className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10" disabled={isTransactionPending}>
                <UserX className="mr-2 h-4 w-4 shrink-0" />
                Blacklist
              </Button>
            }
            action="blacklist"
            userAddress={userData.address}
            onConfirm={() => onUserAction('blacklist', userData.address)}
          />
        )}
      </CardFooter>
    </Card>
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

  const { data: contractOwner } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'owner',
    chainId: CHAIN_ID,
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
    chainId: CHAIN_ID,
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
            chainId: CHAIN_ID
          });
          break;
        case 'freeze':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'freezeRecipient',
            args: [userAddress as `0x${string}`, true],
            chainId: CHAIN_ID
          });
          break;
        case 'unfreeze':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'freezeRecipient',
            args: [userAddress as `0x${string}`, false],
            chainId: CHAIN_ID
          });
          break;
        case 'blacklist':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'setBlacklist',
            args: [userAddress as `0x${string}`, true],
            chainId: CHAIN_ID
          });
          break;
        case 'remove-blacklist':
          await writeContractAsync({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: 'setBlacklist',
            args: [userAddress as `0x${string}`, false],
            chainId: CHAIN_ID
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
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">User Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage KYC-approved users</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-warning" />
          <p className="text-sm font-medium text-muted-foreground">Connect your wallet to access user management</p>
        </div>
      </div>
    );
  }
  if (!contractAddress) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">User Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage KYC-approved users</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-muted-foreground">Contract address not configured</p>
        </div>
      </div>
    );
  }
  if (!isAdmin && contractOwner) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">User Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage KYC-approved users</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-muted-foreground">Access denied: admin privileges required</p>
          <p className="mt-2 text-xs text-muted-foreground">Owner: {contractOwner}</p>
        </div>
      </div>
    );
  }
  const isLoading = loadingKYCUsers || isRefreshing;
  const isTransactionPending = isWritePending || isConfirming;
  return (
    <div className="w-full min-w-0 space-y-8">
      {/* Page header: no outer card, clean separation */}
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            User Management
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer shrink-0"
            onClick={refreshData}
            disabled={isLoading || isTransactionPending}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" className="cursor-pointer shrink-0">
            <Filter className="mr-2 h-4 w-4 shrink-0" />
            Filter
          </Button>
        </div>
      </header>

      {errorKYCUsers && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load users from contract</AlertDescription>
        </Alert>
      )}

      <div className="min-w-0 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border shadow-sm">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 rounded" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-9 w-10 rounded-lg" />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </CardFooter>
            </Card>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
            <Users className="mb-4 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No users found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchTerm ? 'Try a different search.' : 'Users will appear here once they complete KYC.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((userAddress) => (
            <UserInfoCard
              key={userAddress}
              userAddress={userAddress}
              contractAddress={contractAddress!}
              account={address}
              isAdmin={isAdmin}
              onUserAction={handleUserAction}
              isTransactionPending={isTransactionPending}
            />
          ))
        )}
      </div>
    </div>
  );
}
