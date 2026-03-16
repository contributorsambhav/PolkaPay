'use client';

import { usePathname, useRouter } from 'next/navigation';
import { KYCTab, OverviewTab, ProfileTab, TransactionsTab, TransferTab } from '@/components/tabs/user';
import { useAuth } from '@/contexts/auth-context';
import { USER_NAV_ITEMS, type UserSection } from '@/lib/nav-config';

export function UserDashboard({ initialTab = 'overview' }: { initialTab?: UserSection }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  if (!user) return null;

  const handleTabChange = (tabId: UserSection) => {
    const item = USER_NAV_ITEMS.find((n) => n.id === tabId);
    router.push(item ? item.href : '/user');
  };

  const currentTab: UserSection = (() => {
    const base = pathname.replace(/^\/user\/?/, '') || 'overview';
    return (USER_NAV_ITEMS.some((n) => n.id === base) ? base : initialTab) as UserSection;
  })();

  const sectionMap: Record<UserSection, React.ReactNode> = {
    overview: <OverviewTab onTabChange={(tab) => handleTabChange(tab as UserSection)} />,
    transfer: <TransferTab />,
    kyc: <KYCTab />,
    transactions: <TransactionsTab />,
    profile: <ProfileTab />,
  };

  const content = sectionMap[currentTab] ?? sectionMap.overview;

  return <div className="space-y-6">{content}</div>;
}
