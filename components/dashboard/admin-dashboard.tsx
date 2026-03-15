'use client';

import { usePathname, useRouter } from 'next/navigation';

import { AdminKYCManagement } from '@/components/kyc/admin-kyc-management';
import { OverviewTab } from '@/components/tabs/admin/overview-tab';
import { SettingsTab } from '@/components/tabs/admin/settings-tab';
import { TransactionAnalytics } from '@/components/analytics/transaction-analytics';
import { UsersTab } from '@/components/tabs/admin/users-tab';
import { useAuth } from '@/contexts/auth-context';
import { ADMIN_NAV_ITEMS, type AdminSection } from '@/lib/nav-config';

export function AdminDashboard({ initialTab = 'overview' }: { initialTab?: AdminSection }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const handleTabChange = (tab: AdminSection) => {
    const item = ADMIN_NAV_ITEMS.find((n) => n.id === tab);
    router.push(item ? item.href : '/admin');
  };

  const currentTab: AdminSection = (() => {
    const base = pathname.replace(/^\/admin\/?/, '') || 'overview';
    return (ADMIN_NAV_ITEMS.some((n) => n.id === base) ? base : initialTab) as AdminSection;
  })();

  const sectionMap: Record<AdminSection, React.ReactNode> = {
    overview: <OverviewTab onTabChange={(tab) => handleTabChange(tab as AdminSection)} />,
    kyc: <AdminKYCManagement />,
    users: <UsersTab />,
    transactions: <TransactionAnalytics />,
    settings: <SettingsTab />,
  };

  const content = sectionMap[currentTab] ?? sectionMap.overview;

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-6">
      {content}
    </div>
  );
}
