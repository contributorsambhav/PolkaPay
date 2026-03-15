'use client';

import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { ADMIN_SECTIONS, type AdminSection } from '@/lib/nav-config';

export default function AdminSectionPage({ params }: { params: { section: string } }) {
  const section = (ADMIN_SECTIONS.includes(params.section as AdminSection)
    ? params.section
    : 'overview') as AdminSection;
  return <AdminDashboard initialTab={section} />;
}
