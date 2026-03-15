'use client';

import type React from 'react';
import { AdminLayoutGuard } from '@/components/layout/admin-layout-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutGuard>{children}</AdminLayoutGuard>;
}
