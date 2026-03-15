'use client';

import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle, DollarSign, Loader2, Pause, Play, Settings, Shield, TrendingUp, Users, Wallet, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { parseEther } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL
const REMITTANCE_ABI = [
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint8', name: 'tier', type: 'uint8' }],
    name: 'getTierLimit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'tier', type: 'uint8' },
      { internalType: 'uint256', name: 'newLimit', type: 'uint256' }
    ],
    name: 'setTierLimit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getContractBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'adminDeposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'withdrawFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAccumulatedFees',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];
const TIERS = [
  { id: 1, name: 'TIER1', label: 'Basic', description: 'New users' },
  { id: 2, name: 'TIER2', label: 'Standard', description: 'Verified users' },
  { id: 3, name: 'TIER3', label: 'Premium', description: 'High-volume users' },
  { id: 4, name: 'VIP', label: 'VIP', description: 'Enterprise users' }
];
function formatEthValue(value: bigint | number | string | undefined, decimals: number = 4): string {
  if (!value || value === 0 || value === '0') return '0.0000';
  try {
    const ethValue = typeof value === 'bigint' ? Number(value) / 1e18 : typeof value === 'string' ? Number(value) / 1e18 : Number(value) / 1e18;
    if (ethValue === 0) return '0.0000';
    if (ethValue < 0.0001 && ethValue > 0) {
      return ethValue.toFixed(8);
    }
    return ethValue.toFixed(decimals);
  } catch (error) {
    console.error(`Error formatting ${SYMBOL} value:`, error);
    return '0.0000';
  }
}
function ConfirmationModal({ trigger, title, description, confirmText, onConfirm, variant = 'default', icon }: { trigger: React.ReactNode; title: string; description: string; confirmText: string; onConfirm: () => void; variant?: 'default' | 'destructive'; icon?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">{trigger}</div>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              {icon}
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">{description}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={variant}
                className="cursor-pointer"
                onClick={() => {
                  onConfirm();
                  setIsOpen(false);
                }}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function EmergencyConfirmationModal({ trigger, title, description, onConfirm, disabled = false }: { trigger: React.ReactNode; title: string; description: string; onConfirm: () => void; disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const isConfirmValid = confirmText === 'EMERGENCY';
  return (
    <>
      <div onClick={() => !disabled && setIsOpen(true)} className={disabled ? '' : 'cursor-pointer'}>{trigger}</div>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive">{title}</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{description}</p>
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">Type &quot;EMERGENCY&quot; to confirm:</p>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type EMERGENCY" className="mt-2 border-border bg-background" />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  setIsOpen(false);
                  setConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                disabled={!isConfirmValid}
                onClick={() => {
                  onConfirm();
                  setIsOpen(false);
                  setConfirmText('');
                }}
              >
                Execute
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export function SettingsTab() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const contractAddress = getContractAddress();
  const [tierLimits, setTierLimits] = useState<Record<number, string>>({});
  const [isUpdatingTier, setIsUpdatingTier] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const {
    data: isPausedData,
    isLoading: isPausedLoading,
    refetch: refetchPausedStatus
  } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'paused',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const isPaused = isPausedData as boolean | undefined;
  const { data: contractOwner, isLoading: isOwnerLoading } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'owner',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const {
    data: contractBalance,
    isLoading: isContractBalanceLoading,
    refetch: refetchContractBalance
  } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getContractBalance',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const {
    data: accumulatedFees,
    isLoading: isAccumulatedFeesLoading,
    refetch: refetchAccumulatedFees
  } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getAccumulatedFees',
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const { data: tier1Limit } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [1],
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const { data: tier2Limit } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [2],
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const { data: tier3Limit } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [3],
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const { data: tier4Limit } = useReadContract({
    account: address,
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [4],
    chainId: CHAIN_ID,
    query: { enabled: !!contractAddress && isConnected }
  });
  const { writeContractAsync } = useWriteContract();
  const [pauseHash, setPauseHash] = useState<`0x${string}` | undefined>();
  const [unpauseHash, setUnpauseHash] = useState<`0x${string}` | undefined>();
  const [setTierLimitHash, setSetTierLimitHash] = useState<`0x${string}` | undefined>();
  const [emergencyWithdrawHash, setEmergencyWithdrawHash] = useState<`0x${string}` | undefined>();
  const [adminDepositHash, setAdminDepositHash] = useState<`0x${string}` | undefined>();
  const [withdrawFeesHash, setWithdrawFeesHash] = useState<`0x${string}` | undefined>();

  const [isPausing, setIsPausing] = useState(false);
  const [isUnpausing, setIsUnpausing] = useState(false);
  const [isSettingTierLimit, setIsSettingTierLimit] = useState(false);
  const [isEmergencyWithdrawing, setIsEmergencyWithdrawing] = useState(false);
  const [isAdminDepositing, setIsAdminDepositing] = useState(false);
  const [isWithdrawingFees, setIsWithdrawingFees] = useState(false);
  const { isLoading: isPauseConfirming, isSuccess: isPauseSuccess } = useWaitForTransactionReceipt({
    hash: pauseHash
  });
  const { isLoading: isUnpauseConfirming, isSuccess: isUnpauseSuccess } = useWaitForTransactionReceipt({
    hash: unpauseHash
  });
  const { isLoading: isTierLimitConfirming, isSuccess: isTierLimitSuccess } = useWaitForTransactionReceipt({
    hash: setTierLimitHash
  });
  const { isLoading: isEmergencyWithdrawConfirming, isSuccess: isEmergencyWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: emergencyWithdrawHash
  });
  const { isLoading: isAdminDepositConfirming, isSuccess: isAdminDepositSuccess } = useWaitForTransactionReceipt({
    hash: adminDepositHash
  });
  const { isLoading: isWithdrawFeesConfirming, isSuccess: isWithdrawFeesSuccess } = useWaitForTransactionReceipt({
    hash: withdrawFeesHash
  });
  const isAdmin = address && contractOwner && address.toLowerCase() === contractOwner.toString().toLowerCase();
  useEffect(() => {
    const limits = [tier1Limit, tier2Limit, tier3Limit, tier4Limit] as (bigint | undefined)[];
    const newTierLimits: Record<number, string> = {};
    limits.forEach((limit, index) => {
      if (limit != null) {
        newTierLimits[index + 1] = formatEthValue(limit, 0);
      }
    });
    setTierLimits(newTierLimits);
  }, [tier1Limit, tier2Limit, tier3Limit, tier4Limit]);
  useEffect(() => {
    if (isPauseSuccess) {
      toast({
        title: 'Contract Paused',
        description: 'The smart contract has been successfully paused.',
        variant: 'default'
      });
      refetchPausedStatus();
    }
  }, [isPauseSuccess, toast, refetchPausedStatus]);
  useEffect(() => {
    if (isUnpauseSuccess) {
      toast({
        title: 'Contract Unpaused',
        description: 'The smart contract has been successfully resumed.',
        variant: 'default'
      });
      refetchPausedStatus();
    }
  }, [isUnpauseSuccess, toast, refetchPausedStatus]);
  useEffect(() => {
    if (isTierLimitSuccess) {
      toast({
        title: 'Tier Limit Updated',
        description: 'The tier limit has been successfully updated.',
        variant: 'default'
      });
      setIsUpdatingTier(null);
    }
  }, [isTierLimitSuccess, toast]);
  useEffect(() => {
    if (isEmergencyWithdrawSuccess) {
      toast({
        title: 'Emergency Withdrawal Executed',
        description: 'Contract funds have been withdrawn to admin address. Remember to unpause the contract when ready.',
        variant: 'destructive'
      });
      refetchContractBalance();
      refetchAccumulatedFees();
    }
  }, [isEmergencyWithdrawSuccess, toast, refetchContractBalance, refetchAccumulatedFees]);
  useEffect(() => {
    if (isAdminDepositSuccess) {
      toast({
        title: 'Admin Deposit Successful',
        description: `Successfully deposited ${depositAmount} ${SYMBOL} to the contract.`,
        variant: 'default'
      });
      setDepositAmount('');
      refetchContractBalance();
    }
  }, [isAdminDepositSuccess, toast, depositAmount, refetchContractBalance]);
  useEffect(() => {
    if (isWithdrawFeesSuccess) {
      toast({
        title: 'Fees Withdrawn Successfully',
        description: 'All accumulated fees have been withdrawn to your address.',
        variant: 'default'
      });
      refetchAccumulatedFees();
      refetchContractBalance();
    }
  }, [isWithdrawFeesSuccess, toast, refetchAccumulatedFees, refetchContractBalance]);
  const handlePauseContract = async () => {
    if (!isConnected || !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only the contract owner can perform this action.',
        variant: 'destructive'
      });
      return;
    }
    if (!contractAddress) return;
    try {
      if (isPaused) {
        setIsUnpausing(true);
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: REMITTANCE_ABI,
          functionName: 'unpause',
          chainId: CHAIN_ID
        });
        setUnpauseHash(hash);
      } else {
        setIsPausing(true);
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: REMITTANCE_ABI,
          functionName: 'pause',
          chainId: CHAIN_ID
        });
        setPauseHash(hash);
      }
    } catch (error) {
      console.error('Pause/Unpause error:', error);
      setIsPausing(false);
      setIsUnpausing(false);
    }
  };
  const handleEmergencyPause = async () => {
    if (!contractAddress || !isConnected || !isAdmin) return;
    try {
      setIsPausing(true);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'pause',
        chainId: CHAIN_ID
      });
      setPauseHash(hash);
    } catch (error) {
      console.error('Emergency pause error:', error);
      setIsPausing(false);
    }
  };
  const handleUpdateTierLimit = async (tierId: number) => {
    if (!contractAddress || !isConnected || !isAdmin) return;
    const limitValue = tierLimits[tierId];
    if (!limitValue || isNaN(Number(limitValue))) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid numeric limit.',
        variant: 'destructive'
      });
      return;
    }
    setIsUpdatingTier(tierId);
    setIsSettingTierLimit(true);
    try {
      const limitInWei = BigInt(Math.floor(Number(limitValue) * 1e18));
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'setTierLimit',
        args: [tierId, limitInWei],
        chainId: CHAIN_ID
      });
      setSetTierLimitHash(hash);
    } catch (error) {
      console.error('Update tier limit error:', error);
      setIsSettingTierLimit(false);
      setIsUpdatingTier(null);
    }
  };
  const handleEmergencyWithdraw = async () => {
    if (!contractAddress || !isConnected || !isAdmin) return;
    if (!isPaused) {
      toast({
        title: 'Contract Must Be Paused',
        description: 'The contract must be paused before emergency withdrawal can be executed.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setIsEmergencyWithdrawing(true);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'emergencyWithdraw',
        chainId: CHAIN_ID
      });
      setEmergencyWithdrawHash(hash);
    } catch (error) {
      console.error('Emergency withdraw error:', error);
      setIsEmergencyWithdrawing(false);
    }
  };
  const handleAdminDeposit = async () => {
    if (!contractAddress || !isConnected || !isAdmin) return;
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid deposit amount greater than 0.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setIsAdminDepositing(true);
      const depositValue = parseEther(depositAmount);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'adminDeposit',
        value: depositValue,
        chainId: CHAIN_ID
      });
      setAdminDepositHash(hash);
    } catch (error) {
      console.error('Admin deposit error:', error);
      setIsAdminDepositing(false);
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid numeric amount.',
        variant: 'destructive'
      });
    }
  };
  const handleWithdrawFees = async () => {
    if (!contractAddress || !isConnected || !isAdmin) return;
    const feesAmount = accumulatedFees ? Number(accumulatedFees) : 0;
    if (feesAmount === 0) {
      toast({
        title: 'No Fees Available',
        description: 'There are no accumulated fees to withdraw.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setIsWithdrawingFees(true);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'withdrawFees',
        chainId: CHAIN_ID
      });
      setWithdrawFeesHash(hash);
    } catch (error) {
      console.error('Withdraw fees error:', error);
      setIsWithdrawingFees(false);
    }
  };
  const handleTierLimitChange = (tierId: number, value: string) => {
    setTierLimits((prev) => ({ ...prev, [tierId]: value }));
  };
  if (!isConnected) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">System settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Contract and tier configuration</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <Shield className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">Connect your wallet to access settings</p>
        </div>
      </div>
    );
  }
  if (isOwnerLoading) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">System settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Contract and tier configuration</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Checking admin privileges…</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">System settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Contract and tier configuration</p>
        </header>
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-center">
          <XCircle className="mb-4 h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-muted-foreground">You don’t have admin privileges for this contract</p>
        </div>
      </div>
    );
  }
  const formattedContractBalance = isContractBalanceLoading ? '…' : formatEthValue(contractBalance as bigint | undefined);
  const formattedAccumulatedFees = isAccumulatedFeesLoading ? '…' : formatEthValue(accumulatedFees as bigint | undefined);
  const hasAccumulatedFees = accumulatedFees && Number(accumulatedFees) > 0;
  const emergencyPauseDisabled = Boolean(isPaused) || Boolean(isPausedLoading);
  const emergencyWithdrawDisabled = !Boolean(isPaused) || Boolean(isPausedLoading);
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-8">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">System settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Contract status, tier limits, and funds</p>
      </header>

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Contract status</Label>
              <div className="flex flex-wrap items-center gap-2">
                {isPausedLoading ? (
                  <Badge variant="secondary" className="text-xs">Loading…</Badge>
                ) : (
                  <Badge variant={isPaused ? 'destructive' : 'default'} className="text-xs">{isPaused ? 'Paused' : 'Active'}</Badge>
                )}
                <ConfirmationModal
                  trigger={
                    <Button size="sm" variant="outline" className="cursor-pointer" disabled={isPausing || isUnpausing || isPauseConfirming || isUnpauseConfirming || isPausedLoading}>
                      {isPausing || isUnpausing || isPauseConfirming || isUnpauseConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                  }
                  title={isPaused ? 'Resume contract' : 'Pause contract'}
                  description={isPaused ? 'Resume the contract so transactions can continue.' : 'Pause the contract to stop all transactions until resumed.'}
                  confirmText={isPaused ? 'Resume' : 'Pause'}
                  onConfirm={handlePauseContract}
                  variant={isPaused ? 'default' : 'destructive'}
                  icon={isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                />
              </div>
            </div>
            <Separator className="bg-border" />
            <div className="min-w-0 space-y-3">
              <Label className="text-sm text-muted-foreground">Tier limits (daily)</Label>
              {TIERS.map((tier) => (
                <div key={tier.id} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 items-center gap-2 sm:w-32">
                    <span className="text-sm font-medium text-foreground">{tier.name}</span>
                    <span className="text-xs text-muted-foreground">{tier.label}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 gap-2">
                    <Input
                      placeholder="Limit"
                      className="min-w-0 flex-1"
                      type="number"
                      value={tierLimits[tier.id] || ''}
                      onChange={(e) => handleTierLimitChange(tier.id, e.target.value)}
                      disabled={isUpdatingTier === tier.id || isSettingTierLimit || isTierLimitConfirming}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer shrink-0"
                      onClick={() => handleUpdateTierLimit(tier.id)}
                      disabled={isUpdatingTier === tier.id || isSettingTierLimit || isTierLimitConfirming || !tierLimits[tier.id] || isNaN(Number(tierLimits[tier.id]))}
                    >
                      {isUpdatingTier === tier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Funds</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-5">
            <div className="min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-3">
              <div className="flex min-w-0 justify-between gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">Balance</span>
                <span className="min-w-0 truncate font-mono font-medium tabular-nums text-foreground text-right">
                  {isContractBalanceLoading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : `${formattedContractBalance} ${SYMBOL}`}
                </span>
              </div>
              <div className="mt-2 flex min-w-0 justify-between gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">Fees</span>
                <span className={`min-w-0 truncate text-right font-mono tabular-nums ${hasAccumulatedFees ? 'font-medium text-success' : 'text-foreground'}`}>
                  {isAccumulatedFeesLoading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : `${formattedAccumulatedFees} ${SYMBOL}`}
                </span>
              </div>
            </div>
            <Separator className="bg-border" />
            <div className="min-w-0 space-y-2">
              <Label className="text-sm text-muted-foreground">Deposit ({SYMBOL})</Label>
              <div className="flex min-w-0 gap-2">
                <Input placeholder="0" type="number" step="0.001" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} disabled={isAdminDepositing || isAdminDepositConfirming} className="min-w-0 flex-1" />
                <ConfirmationModal
                  trigger={
                    <Button variant="outline" size="sm" className="cursor-pointer shrink-0" disabled={isAdminDepositing || isAdminDepositConfirming || !depositAmount || Number(depositAmount) <= 0}>
                      {isAdminDepositing || isAdminDepositConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-2 h-4 w-4" />}
                      Deposit
                    </Button>
                  }
                  title="Deposit to contract"
                  description={`Deposit ${depositAmount} ${SYMBOL} to the contract?`}
                  confirmText="Deposit"
                  onConfirm={handleAdminDeposit}
                  icon={<Wallet className="h-5 w-5" />}
                />
              </div>
            </div>
            <ConfirmationModal
              trigger={
                <Button variant="outline" size="sm" className="w-full min-w-0 cursor-pointer truncate" disabled={isWithdrawingFees || isWithdrawFeesConfirming || !hasAccumulatedFees || isAccumulatedFeesLoading}>
                  {isWithdrawingFees || isWithdrawFeesConfirming ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <ArrowUpFromLine className="mr-2 h-4 w-4 shrink-0" />}
                  <span className="truncate">{!hasAccumulatedFees ? 'No fees' : isAccumulatedFeesLoading ? 'Loading…' : `Withdraw fees (${formattedAccumulatedFees})`}</span>
                </Button>
              }
              title="Withdraw fees"
              description={`Withdraw ${formattedAccumulatedFees} ${SYMBOL} in fees to your address?`}
              confirmText="Withdraw"
              onConfirm={handleWithdrawFees}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden border-border shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex min-w-0 items-center gap-2 text-base font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">Emergency</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="mb-3 text-xs text-muted-foreground">Requires contract paused. Type &quot;EMERGENCY&quot; to confirm.</p>
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
              <EmergencyConfirmationModal
                trigger={
                  <Button variant="destructive" size="sm" className="w-full cursor-pointer" disabled={isPausing || isPauseConfirming || isPaused || isPausedLoading}>
                    {isPausing || isPauseConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                    {isPausedLoading ? 'Loading…' : isPaused ? 'Already paused' : 'Emergency pause'}
                  </Button>
                }
                title="Emergency pause"
                description="Halt all contract operations. You can resume later from Configuration."
                onConfirm={handleEmergencyPause}
                disabled={emergencyPauseDisabled}
              />
              <EmergencyConfirmationModal
                trigger={
                  <Button variant="destructive" size="sm" className="w-full cursor-pointer" disabled={isEmergencyWithdrawing || isEmergencyWithdrawConfirming || !isPaused || isPausedLoading}>
                    {isEmergencyWithdrawing || isEmergencyWithdrawConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                    {!isPaused ? 'Pause contract first' : 'Emergency withdraw'}
                  </Button>
                }
                title="Emergency withdraw"
                description="Withdraw all contract funds to admin. Contract must be paused. Unpause afterwards to resume."
                onConfirm={handleEmergencyWithdraw}
                disabled={emergencyWithdrawDisabled}
              />
            </div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="grid min-w-0 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
              <div className="flex min-w-0 justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Contract</span>
                <span className="min-w-0 truncate font-mono text-foreground" title={contractAddress}>{contractAddress}</span>
              </div>
              <div className="flex min-w-0 justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Owner</span>
                <span className="min-w-0 truncate font-mono text-foreground">
                  {contractOwner ? `${contractOwner.toString().slice(0, 6)}…${contractOwner.toString().slice(-4)}` : '…'}
                </span>
              </div>
              <div className="flex min-w-0 justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Status</span>
                <span className={`shrink-0 ${isPaused ? 'text-destructive' : 'text-success'}`}>{isPausedLoading ? '…' : isPaused ? 'Paused' : 'Active'}</span>
              </div>
              <div className="flex min-w-0 justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Balance</span>
                <span className="min-w-0 truncate font-mono text-foreground">{formattedContractBalance} {SYMBOL}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
