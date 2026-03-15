'use client';

import { UserDashboard } from '@/components/dashboard/user-dashboard';
import { USER_SECTIONS, type UserSection } from '@/lib/nav-config';

export default function UserSectionPage({ params }: { params: { section: string } }) {
  const section = (USER_SECTIONS.includes(params.section as UserSection)
    ? params.section
    : 'overview') as UserSection;
  return <UserDashboard initialTab={section} />;
}
