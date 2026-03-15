'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartLineUpIcon,
  SealCheckIcon,
  HouseIcon,
  GearIcon,
  ShieldIcon,
  TrendUpIcon,
  UsersIcon,
} from '@phosphor-icons/react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ADMIN_NAV_ITEMS } from '@/lib/nav-config';
import { useSidebar } from '@/components/ui/sidebar';

const ICON_MAP = {
  overview: ChartLineUpIcon,
  kyc: SealCheckIcon,
  users: UsersIcon,
  transactions: TrendUpIcon,
  settings: GearIcon,
} as Record<string, React.ComponentType<{ className?: string; size?: number }>>;

const FALLBACK_ICON = ChartLineUpIcon;

export function AdminSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="data-[slot=sidebar-menu-button]:px-3 data-[slot=sidebar-menu-button]:py-2.5">
              <Link href="/admin" onClick={closeMobile} className="flex items-center gap-3">
                <ShieldIcon className="h-5 w-5 text-sidebar-primary" size={20} />
                <span className="font-semibold text-sidebar-foreground">Admin Console</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.id] ?? FALLBACK_ICON;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.href} onClick={closeMobile}>
                    <Icon className="h-4 w-4 shrink-0" size={16} />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Link href="/" onClick={closeMobile} className="flex items-center gap-3">
                <HouseIcon className="h-4 w-4 shrink-0" size={16} />
                <span>Back to landing</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
