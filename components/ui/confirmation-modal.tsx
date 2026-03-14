'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertTriangle, Crown, Pause, Play, Shield, UserX } from 'lucide-react';

import type React from 'react';

interface ConfirmationModalProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
}
export function ConfirmationModal({ trigger, title, description, confirmText, onConfirm, variant = 'default', icon }: ConfirmationModalProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {icon && <div className={`p-2 rounded-full ${variant === 'destructive' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{icon}</div>}
            <div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function EmergencyConfirmationModal({ trigger, title, description, onConfirm }: { trigger: React.ReactNode; title: string; description: string; onConfirm: () => void }) {
  return <ConfirmationModal trigger={trigger} title={title} description={`${description} This action cannot be undone and requires immediate attention.`} confirmText="Execute Emergency Action" onConfirm={onConfirm} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} />;
}
export function UserActionConfirmationModal({ trigger, action, userAddress, onConfirm }: { trigger: React.ReactNode; action: 'freeze' | 'unfreeze' | 'whitelist' | 'remove-whitelist' | 'change-tier'; userAddress: string; onConfirm: () => void }) {
  const getActionDetails = () => {
    switch (action) {
      case 'freeze':
        return {
          title: 'Freeze User Account',
          description: `Are you sure you want to freeze the account for ${userAddress}? This will prevent them from making any transactions.`,
          confirmText: 'Freeze Account',
          variant: 'destructive' as const,
          icon: <Pause className="h-5 w-5" />
        };
      case 'unfreeze':
        return {
          title: 'Unfreeze User Account',
          description: `Are you sure you want to unfreeze the account for ${userAddress}? This will restore their transaction capabilities.`,
          confirmText: 'Unfreeze Account',
          variant: 'default' as const,
          icon: <Play className="h-5 w-5" />
        };
      case 'whitelist':
        return {
          title: 'Add to Whitelist',
          description: `Are you sure you want to add ${userAddress} to the whitelist? This will grant them special privileges.`,
          confirmText: 'Add to Whitelist',
          variant: 'default' as const,
          icon: <Shield className="h-5 w-5" />
        };
      case 'remove-whitelist':
        return {
          title: 'Remove from Whitelist',
          description: `Are you sure you want to remove ${userAddress} from the whitelist? This will revoke their special privileges.`,
          confirmText: 'Remove from Whitelist',
          variant: 'destructive' as const,
          icon: <UserX className="h-5 w-5" />
        };
      case 'change-tier':
        return {
          title: 'Change User Tier',
          description: `Are you sure you want to change the tier for ${userAddress}? This will affect their daily transaction limits.`,
          confirmText: 'Change Tier',
          variant: 'default' as const,
          icon: <Crown className="h-5 w-5" />
        };
      default:
        return {
          title: 'Unknown Action',
          description: 'This action is not recognized.',
          confirmText: 'Confirm',
          variant: 'default' as const,
          icon: null
        };
    }
  };
  const details = getActionDetails();
  return <ConfirmationModal trigger={trigger} title={details.title} description={details.description} confirmText={details.confirmText} onConfirm={onConfirm} variant={details.variant} icon={details.icon} />;
}
