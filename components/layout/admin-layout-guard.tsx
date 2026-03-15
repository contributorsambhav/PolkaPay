'use client';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Navbar } from '@/components/ui/navbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
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
        <SidebarProvider>
          <AdminSidebar />
          <SidebarInset className="min-h-svh bg-background">
            <Navbar />
            <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </RequireAdmin>
    </RequireAuth>
  );
}
