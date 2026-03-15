'use client';

import type React from 'react';
import { UserLayoutGuard } from '@/components/layout/user-layout-guard';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <UserLayoutGuard>{children}</UserLayoutGuard>;
}
