'use client';

import { UserSidebar } from '@/components/layout/user-sidebar';
import { Navbar } from '@/components/ui/navbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <UserSidebar />
      <SidebarInset className="min-h-svh bg-background">
        <Navbar />
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
