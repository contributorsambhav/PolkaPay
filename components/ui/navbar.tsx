'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartBarIcon,
  SealCheckIcon,
  SquaresFourIcon,
  SignOutIcon,
  ShieldIcon,
  WalletIcon,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useDisconnect } from 'wagmi';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LANDING_NAV_ITEMS } from '@/lib/nav-config';
import { toast } from 'sonner';

const LANDING_ICONS = {
  '/user': SquaresFourIcon,
  '/admin': ShieldIcon,
  '/contract': WalletIcon,
  '/kyc': SealCheckIcon,
  '/analytics': ChartBarIcon,
} as Record<string, React.ComponentType<{ className?: string; size?: number }>>;

function formatAddress(addr: string | undefined) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, toggleMode } = useAuth();
  const { disconnect } = useDisconnect();

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isUserMode = user.mode === 'user';
  const activeRole = isUserMode ? 'User' : 'Admin';
  
  const items = isAdmin && !isUserMode ? LANDING_NAV_ITEMS.admin : LANDING_NAV_ITEMS.user;
  const isDashboardArea =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/user') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/contract') ||
    pathname.startsWith('/kyc');

  const handleModeToggle = () => {
    const nextMode = user.mode === 'admin' ? 'user' : 'admin';
    toggleMode();
    toast.success(`Switched to ${nextMode === 'admin' ? 'Admin' : 'User'} Mode`);
    router.push(nextMode === 'admin' ? '/admin' : '/user');
  };

  const handleLogout = async () => {
    try {
      if (user.isConnected) {
        await disconnect();
      }
    } catch {
      // ignore disconnect failures, still clear local auth
    } finally {
      logout();
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {isDashboardArea && (
            <SidebarTrigger className="shrink-0" />
          )}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">
                PolkaPay
              </span>
              <span className="text-sm font-semibold text-foreground leading-tight">
                {activeRole} Console
              </span>
            </div>
          </div>
        </div>

        {!isDashboardArea && (
          <nav className="hidden md:flex items-center gap-1 rounded-lg bg-muted/80 p-1">
            {items.map((item) => {
              const Icon = LANDING_ICONS[item.href] ?? WalletIcon;
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'rounded-md px-3 text-xs font-medium',
                    !isActive && 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" size={14} />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-3">
          {isAdmin && (
            <Button
              onClick={handleModeToggle}
              variant="outline"
              size="sm"
              className="hidden sm:flex h-8 gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <SquaresFourIcon className="h-3.5 w-3.5" size={14} />
              Switch to {isUserMode ? 'Admin' : 'User'} Mode
            </Button>
          )}
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="font-mono text-xs text-foreground tabular-nums">
              {formatAddress(user.address)}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isUserMode ? 'User' : isAdmin ? 'Admin' : 'User'}
            </span>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <SignOutIcon className="h-4 w-4 shrink-0" size={16} />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {!isDashboardArea && (
        <nav className="flex md:hidden border-t border-border bg-muted/30">
          <div className="mx-auto flex max-w-7xl flex-1 items-center justify-between gap-1 px-4 py-2 sm:px-6 lg:px-8">
            {items.map((item) => {
              const Icon = LANDING_ICONS[item.href] ?? WalletIcon;
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'flex-1 flex-col gap-0.5 rounded-md py-2 text-[11px] font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4 shrink-0" size={16} />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}

