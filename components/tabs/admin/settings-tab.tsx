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
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) || '0x3fcac36FD5415e50ECA49e2B45F6B4D8893f029d';
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
      <div onClick={() => setIsOpen(true)}>{trigger}</div>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {icon}
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{description}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={variant}
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
      <div onClick={() => !disabled && setIsOpen(true)}>{trigger}</div>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-red-600">{title}</h3>
            </div>
            <p className="text-gray-600 mb-4">{description}</p>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-red-600 font-medium">Type "EMERGENCY" to confirm this action:</p>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type EMERGENCY" className="mt-2" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!isConfirmValid}
                onClick={() => {
                  onConfirm();
                  setIsOpen(false);
                  setConfirmText('');
                }}
              >
                Execute Emergency Action
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
  const [tierLimits, setTierLimits] = useState<Record<number, string>>({});
  const [isUpdatingTier, setIsUpdatingTier] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const CORRECT_CHAIN_ID = 420420417;

  const {
    data: isPaused,
    isLoading: isPausedLoading,
    refetch: refetchPausedStatus
  } = useReadContract({
    account: address,
    address: CONTRACT_ADDRESS,
    abi: REMITTANCE_ABI,
    functionName: 'paused',
    chainId: CORRECT_CHAIN_ID
  });
  const { data: contractOwner, isLoading: isOwnerLoading } = useReadContract({
    account: address,
    address: CONTRACT_ADDRESS,
    abi: REMITTANCE_ABI,
    functionName: 'owner',
    chainId: CORRECT_CHAIN_ID
  });
  const {
    data: contractBalance,
    isLoading: isContractBalanceLoading,
    refetch: refetchContractBalance
  } = useReadContract({
    account: address,
    address: CONTRACT_ADDRESS,
    abi: REMITTANCE_ABI,
    functionName: 'getContractBalance',
    chainId: CORRECT_CHAIN_ID
  });
  const {
    data: accumulatedFees,
    isLoading: isAccumulatedFeesLoading,
    refetch: refetchAccumulatedFees
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getAccumulatedFees',
    chainId: CORRECT_CHAIN_ID
  });
  const { data: tier1Limit } = useReadContract({
    address: CONTRACT_ADDRESS,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [1],
    chainId: CORRECT_CHAIN_ID
  });
  const { data: tier2Limit } = useReadContract({
    account: address,
    address: CONTRACT_ADDRESS,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [2],
    chainId: CORRECT_CHAIN_ID
  });
  const { data: tier3Limit } = useReadContract({
    account: address,
    address: CONTRACT_ADDRESS,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [3],
    chainId: CORRECT_CHAIN_ID
  });
  const { data: tier4Limit } = useReadContract({
    account: address,
    address: CONTRACT_ADDRESS,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [4],
    chainId: CORRECT_CHAIN_ID
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
    const limits = [tier1Limit, tier2Limit, tier3Limit, tier4Limit];
    const newTierLimits: Record<number, string> = {};
    limits.forEach((limit, index) => {
      if (limit) {
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
    try {
      if (isPaused) {
        setIsUnpausing(true);
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: REMITTANCE_ABI,
          functionName: 'unpause',
          chainId: CORRECT_CHAIN_ID
        });
        setUnpauseHash(hash);
      } else {
        setIsPausing(true);
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: REMITTANCE_ABI,
          functionName: 'pause',
          chainId: CORRECT_CHAIN_ID
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
    if (!isConnected || !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only the contract owner can perform this action.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setIsPausing(true);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REMITTANCE_ABI,
        functionName: 'pause',
        chainId: CORRECT_CHAIN_ID
      });
      setPauseHash(hash);
    } catch (error) {
      console.error('Emergency pause error:', error);
      setIsPausing(false);
    }
  };
  const handleUpdateTierLimit = async (tierId: number) => {
    if (!isConnected || !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only the contract owner can perform this action.',
        variant: 'destructive'
      });
      return;
    }
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
        address: CONTRACT_ADDRESS,
        abi: REMITTANCE_ABI,
        functionName: 'setTierLimit',
        args: [tierId, limitInWei],
        chainId: CORRECT_CHAIN_ID
      });
      setSetTierLimitHash(hash);
    } catch (error) {
      console.error('Update tier limit error:', error);
      setIsSettingTierLimit(false);
      setIsUpdatingTier(null);
    }
  };
  const handleEmergencyWithdraw = async () => {
    if (!isConnected || !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only the contract owner can perform this action.',
        variant: 'destructive'
      });
      return;
    }
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
        address: CONTRACT_ADDRESS,
        abi: REMITTANCE_ABI,
        functionName: 'emergencyWithdraw',
        chainId: CORRECT_CHAIN_ID
      });
      setEmergencyWithdrawHash(hash);
    } catch (error) {
      console.error('Emergency withdraw error:', error);
      setIsEmergencyWithdrawing(false);
    }
  };
  const handleAdminDeposit = async () => {
    if (!isConnected || !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only the contract owner can perform this action.',
        variant: 'destructive'
      });
      return;
    }
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
        address: CONTRACT_ADDRESS,
        abi: REMITTANCE_ABI,
        functionName: 'adminDeposit',
        value: depositValue,
        chainId: CORRECT_CHAIN_ID
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
    if (!isConnected || !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only the contract owner can perform this action.',
        variant: 'destructive'
      });
      return;
    }
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
        address: CONTRACT_ADDRESS,
        abi: REMITTANCE_ABI,
        functionName: 'withdrawFees',
        chainId: CORRECT_CHAIN_ID
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
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900">Wallet Not Connected</h3>
          <p className="text-gray-500">Please connect your wallet to access admin settings.</p>
        </div>
      </div>
    );
  }
  if (isOwnerLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-gray-400 mx-auto animate-spin" />
          <h3 className="text-lg font-medium text-gray-900">Loading...</h3>
          <p className="text-gray-500">Checking admin privileges...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-500">You don't have administrator privileges for this contract.</p>
        </div>
      </div>
    );
  }
  const formattedContractBalance = isContractBalanceLoading ? 'Loading...' : formatEthValue(contractBalance);
  const formattedAccumulatedFees = isAccumulatedFeesLoading ? 'Loading...' : formatEthValue(accumulatedFees);
  const hasAccumulatedFees = accumulatedFees && Number(accumulatedFees) > 0;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* System Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contract Status</Label>
            <div className="flex items-center gap-2">
              {isPausedLoading ? <Badge className="bg-gray-100 text-gray-800 border-gray-200">Loading...</Badge> : <Badge className={isPaused ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}>{isPaused ? 'PAUSED' : 'ACTIVE'}</Badge>}
              <ConfirmationModal
                trigger={
                  <Button size="sm" variant="outline" disabled={isPausing || isUnpausing || isPauseConfirming || isUnpauseConfirming || isPausedLoading}>
                    {isPausing || isUnpausing || isPauseConfirming || isUnpauseConfirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume Contract' : 'Pause Contract'}
                  </Button>
                }
                title={isPaused ? 'Resume Smart Contract' : 'Pause Smart Contract'}
                description={isPaused ? 'Are you sure you want to resume the smart contract? This will allow all transactions to continue normally.' : 'Are you sure you want to pause the smart contract? This will stop all transactions system-wide until manually resumed.'}
                confirmText={isPaused ? 'Resume Contract' : 'Pause Contract'}
                onConfirm={handlePauseContract}
                variant={isPaused ? 'default' : 'destructive'}
                icon={isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Tier Limits Configuration
            </h4>
            {TIERS.map((tier) => (
              <div key={tier.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-16 font-medium">{tier.name}</Label>
                  <Badge variant="outline" className="text-xs">
                    {tier.label}
                  </Badge>
                  <span className="text-xs text-gray-500">({tier.description})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Daily limit in USD" className="flex-1" type="number" value={tierLimits[tier.id] || ''} onChange={(e) => handleTierLimitChange(tier.id, e.target.value)} disabled={isUpdatingTier === tier.id || isSettingTierLimit || isTierLimitConfirming} />
                  <Button size="sm" variant="outline" onClick={() => handleUpdateTierLimit(tier.id)} disabled={isUpdatingTier === tier.id || isSettingTierLimit || isTierLimitConfirming || !tierLimits[tier.id] || isNaN(Number(tierLimits[tier.id]))}>
                    {isUpdatingTier === tier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Financial Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Financial Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Contract Financials</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Contract Balance:</span>
                <span className="font-medium font-mono">
                  {isContractBalanceLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `${formattedContractBalance} ${SYMBOL}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Accumulated Fees:</span>
                <span className={`font-medium font-mono ${hasAccumulatedFees ? 'text-green-700' : ''}`}>
                  {isAccumulatedFeesLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `${formattedAccumulatedFees} ${SYMBOL}`
                  )}
                </span>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Admin Deposit
            </h4>
            <div className="space-y-2">
              <Label>Deposit Amount (${SYMBOL})</Label>
              <div className="flex items-center gap-2">
                <Input placeholder="0.0" type="number" step="0.001" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} disabled={isAdminDepositing || isAdminDepositConfirming} />
                <ConfirmationModal
                  trigger={
                    <Button variant="outline" disabled={isAdminDepositing || isAdminDepositConfirming || !depositAmount || Number(depositAmount) <= 0}>
                      {isAdminDepositing || isAdminDepositConfirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 mr-2" />}
                      Deposit
                    </Button>
                  }
                  title="Admin Deposit"
                  description={`Are you sure you want to deposit ${depositAmount} ${SYMBOL} to the contract? This will increase the contract's balance.`}
                  confirmText="Deposit Funds"
                  onConfirm={handleAdminDeposit}
                  icon={<Wallet className="h-5 w-5" />}
                />
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Fee Management
            </h4>
            <ConfirmationModal
              trigger={
                <Button variant="outline" className="w-full" disabled={isWithdrawingFees || isWithdrawFeesConfirming || !hasAccumulatedFees || isAccumulatedFeesLoading}>
                  {isWithdrawingFees || isWithdrawFeesConfirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4 mr-2" />}
                  {!hasAccumulatedFees ? 'No Fees to Withdraw' : isAccumulatedFeesLoading ? 'Loading...' : `Withdraw ${formattedAccumulatedFees} ${SYMBOL}`}
                </Button>
              }
              title="Withdraw Accumulated Fees"
              description={`Are you sure you want to withdraw ${formattedAccumulatedFees} ${SYMBOL} in accumulated fees? This will transfer all fees to your admin address.`}
              confirmText="Withdraw Fees"
              onConfirm={handleWithdrawFees}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>
        </CardContent>
      </Card>
      {/* Emergency Controls Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Emergency Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EmergencyConfirmationModal
                trigger={
                  <Button variant="destructive" size="sm" className="w-full" disabled={isPausing || isPauseConfirming || isPaused || isPausedLoading}>
                    {isPausing || isPauseConfirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    {isPausedLoading ? 'Loading...' : isPaused ? 'Contract Already Paused' : 'Emergency Pause All Operations'}
                  </Button>
                }
                title="Emergency Pause All Operations"
                description="This will immediately halt all contract operations including transactions, KYC processing, and user interactions. You can resume operations later using the unpause function."
                onConfirm={handleEmergencyPause}
                disabled={isPaused || isPausedLoading}
              />
              <EmergencyConfirmationModal
                trigger={
                  <Button variant="destructive" size="sm" className="w-full" disabled={isEmergencyWithdrawing || isEmergencyWithdrawConfirming || !isPaused || isPausedLoading}>
                    {isEmergencyWithdrawing || isEmergencyWithdrawConfirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    {isPausedLoading ? 'Loading...' : !isPaused ? 'Contract Must Be Paused First' : 'Emergency Withdraw Funds'}
                  </Button>
                }
                title="Emergency Withdraw Funds"
                description="This will withdraw all contract funds to the admin address. The contract must be paused first. Use only in critical security situations. Remember to unpause the contract afterwards if you want to resume operations."
                onConfirm={handleEmergencyWithdraw}
                disabled={!isPaused || isPausedLoading}
              />
            </div>
            <p className="text-xs text-red-600 mt-2">Emergency withdrawal requires the contract to be paused first. These actions require typing "EMERGENCY" to confirm.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Contract Information</h4>
            <div className="space-y-1 text-xs text-blue-700">
              <p>
                <strong>Contract:</strong> <span className="font-mono">{CONTRACT_ADDRESS}</span>
              </p>
              <p>
                <strong>Owner:</strong>{' '}
                <span className="font-mono">
                  {isOwnerLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : contractOwner ? (
                    `${contractOwner.toString().slice(0, 6)}...${contractOwner.toString().slice(-4)}`
                  ) : (
                    'Error loading'
                  )}
                </span>
              </p>
              <p>
                <strong>Status:</strong> <span className={`font-medium ${isPausedLoading ? 'text-gray-600' : isPaused ? 'text-red-600' : 'text-green-600'}`}>{isPausedLoading ? 'Loading...' : isPaused ? 'Paused' : 'Active'}</span>
              </p>
              <p>
                <strong>Balance:</strong>{' '}
                <span className="font-mono">
                  {isContractBalanceLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `${formattedContractBalance} ${SYMBOL}`
                  )}
                </span>
              </p>
              <p>
                <strong>Accumulated Fees:</strong>{' '}
                <span className={`font-mono ${hasAccumulatedFees ? 'text-green-600' : ''}`}>
                  {isAccumulatedFeesLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `${formattedAccumulatedFees} ${SYMBOL}`
                  )}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
