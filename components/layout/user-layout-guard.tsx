'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingScreen } from '@/components/auth/loading-screen';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/contexts/auth-context';

export function UserLayoutGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const loadingEl = <LoadingScreen />;

  return (
    <RequireAuth user={user} isLoading={isLoading} LoadingComponent={loadingEl}>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
