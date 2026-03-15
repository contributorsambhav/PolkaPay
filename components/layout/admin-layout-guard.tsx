'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingScreen } from '@/components/auth/loading-screen';
import { RequireAdmin } from '@/components/auth/require-admin';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/contexts/auth-context';

export function AdminLayoutGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const loadingEl = <LoadingScreen />;

  return (
    <RequireAuth user={user} isLoading={isLoading} LoadingComponent={loadingEl}>
      <RequireAdmin user={user} isLoading={false} LoadingComponent={loadingEl}>
        <DashboardShell>{children}</DashboardShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
