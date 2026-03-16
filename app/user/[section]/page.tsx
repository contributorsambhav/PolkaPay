import * as React from 'react';
import { UserDashboard } from '@/components/dashboard/user-dashboard';
import { USER_SECTIONS, type UserSection } from '@/lib/nav-config';

export default function UserSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: sectionParam } = React.use(params);
  const section = (USER_SECTIONS.includes(sectionParam as UserSection)
    ? sectionParam
    : 'overview') as UserSection;
  return <UserDashboard initialTab={section} />;
}
