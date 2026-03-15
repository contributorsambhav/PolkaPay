'use client';

import { ClaimFundsForm } from '@/components/contract/claim-funds-form';
import { SendMoneyForm } from '@/components/contract/send-money-form';
import { PageContainer } from '@/components/ui/page-container';

export default function ContractPage() {
  return (
    <PageContainer
      title="Remittance"
      description="Send funds to recipients and claim remittances that have been sent to your address."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <SendMoneyForm />
        <ClaimFundsForm />
      </div>
    </PageContainer>
  );
}
