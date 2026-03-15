'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface RequireAuthProps {
  children: React.ReactNode;
  user: { address: string } | null;
  isLoading: boolean;
  LoadingComponent?: React.ReactNode;
}

export function RequireAuth({
  children,
  user,
  isLoading,
  LoadingComponent,
}: RequireAuthProps) {
  if (isLoading && LoadingComponent) {
    return <>{LoadingComponent}</>;
  }
  if (isLoading) {
    return null;
  }
  if (!user) {
    return (
      <div className="flex min-h-svh min-w-0 items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-muted-foreground">
            Please connect your wallet to access this page.
          </p>
          <Button asChild variant="default">
            <Link href="/">Go to home</Link>
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
