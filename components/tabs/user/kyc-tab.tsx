'use client';

import { KYCRequestForm } from '@/components/kyc/kyc-request-form';
import { KYCStatusCard } from '@/components/kyc/kyc-status-card';
export function KYCTab() {
  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <h2 className="text-xl font-semibold tracking-tight">KYC</h2>
      <div className="grid grid-cols-1 gap-6">
        <KYCStatusCard />
        <KYCRequestForm />
      </div>
    </div>
  );
}
