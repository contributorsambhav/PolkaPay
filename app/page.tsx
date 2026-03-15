'use client';

import Link from 'next/link';
import {
  ArrowRightIcon,
  ChartBarIcon,
  SealCheckIcon,
  SquaresFourIcon,
  ShieldIcon,
  WalletIcon,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

export default function Page() {
  const { user } = useAuth();

  const primaryPath = user?.mode === 'admin' ? '/admin' : '/user';
  const primaryLabel = user?.mode === 'admin' ? 'Go to Admin Dashboard' : 'Go to User Dashboard';

  return (
    <div className="flex min-h-svh min-w-0 flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-2xl min-w-0 space-y-10">
        <header className="space-y-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-primary" size={14} />
            KYC-enabled remittance on Polkadot
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            RemitPay Operational Console
          </h1>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
            Manage remittances, perform KYC, monitor analytics, and operate the smart contract from
            role-aware dashboards.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
            <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
              <Link href={primaryPath} className="inline-flex items-center justify-center gap-2">
                <SquaresFourIcon className="h-4 w-4 shrink-0" size={16} />
                {primaryLabel}
                <ArrowRightIcon className="h-4 w-4 shrink-0" size={16} />
              </Link>
            </Button>
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:border-border sm:pt-0 sm:pl-4 sm:gap-2">
              <Button asChild variant="outline" size="default" className="shrink-0">
                <Link href="/contract" className="inline-flex items-center gap-2">
                  <WalletIcon className="h-4 w-4 shrink-0" size={16} />
                  Remittance
                </Link>
              </Button>
              <Button asChild variant="outline" size="default" className="shrink-0">
                <Link href="/kyc" className="inline-flex items-center gap-2">
                  <SealCheckIcon className="h-4 w-4 shrink-0" size={16} />
                  KYC Desk
                </Link>
              </Button>
              <Button asChild variant="outline" size="default" className="shrink-0">
                <Link href="/analytics" className="inline-flex items-center gap-2">
                  <ChartBarIcon className="h-4 w-4 shrink-0" size={16} />
                  Analytics
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

