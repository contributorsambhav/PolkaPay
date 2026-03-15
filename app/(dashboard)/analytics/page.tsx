'use client';

import { NetworkActivityWidget } from '@/components/analytics/network-activity-widget';
import { TransactionAnalytics } from '@/components/analytics/transaction-analytics';
import { PageContainer } from '@/components/ui/page-container';

export default function AnalyticsPage() {
  return (
    <PageContainer
      title="Analytics"
      description="Explore live remittance analytics, transaction performance, and your personal network activity."
    >
      <NetworkActivityWidget />
      <section className="mt-4">
        <TransactionAnalytics />
      </section>
    </PageContainer>
  );
}
