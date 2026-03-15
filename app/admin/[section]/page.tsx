import * as React from 'react';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { ADMIN_SECTIONS, type AdminSection } from '@/lib/nav-config';

export default function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: sectionParam } = React.use(params);
  const section = (ADMIN_SECTIONS.includes(sectionParam as AdminSection)
    ? sectionParam
    : 'overview') as AdminSection;
  return <AdminDashboard initialTab={section} />;
}
