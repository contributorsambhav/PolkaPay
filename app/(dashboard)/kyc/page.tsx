'use client';

import { KYCRequestForm } from '@/components/kyc/kyc-request-form';
import { KYCStatusCard } from '@/components/kyc/kyc-status-card';
import { PageContainer } from '@/components/ui/page-container';

export default function KycPage() {
  return (
    <PageContainer
      title="KYC Verification"
      description="View your current verification status and submit a new KYC request to unlock higher transaction limits."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <KYCRequestForm />
        <KYCStatusCard />
      </div>
    </PageContainer>
  );
}
