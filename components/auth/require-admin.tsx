'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface RequireAdminProps {
  children: React.ReactNode;
  user: { address: string; role: string } | null;
  isLoading: boolean;
  LoadingComponent?: React.ReactNode;
}

export function RequireAdmin({
  children,
  user,
  isLoading,
  LoadingComponent,
}: RequireAdminProps) {
  if (isLoading && LoadingComponent) {
    return <>{LoadingComponent}</>;
  }
  if (isLoading) {
    return null;
  }
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-svh min-w-0 items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm font-medium text-destructive">
            Access denied. This area is restricted to admin users.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Go to home</Link>
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
