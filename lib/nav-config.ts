/**
 * Single source of truth for navigation items.
 * Sidebars and navbar import from here; icons are mapped in the UI layer.
 */

export interface NavItem {
  href: string;
  label: string;
  id: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', href: '/admin', label: 'Overview' },
  { id: 'kyc', href: '/admin/kyc', label: 'KYC Management' },
  { id: 'users', href: '/admin/users', label: 'User Management' },
  { id: 'transactions', href: '/admin/transactions', label: 'Transactions' },
  { id: 'stablecoins', href: '/admin/stablecoins', label: 'Stablecoins' },
  { id: 'settings', href: '/admin/settings', label: 'System Settings' },
];

export const USER_NAV_ITEMS: NavItem[] = [
  { id: 'overview', href: '/user', label: 'Overview' },
  { id: 'transfer', href: '/user/transfer', label: 'Transfer' },
  { id: 'kyc', href: '/user/kyc', label: 'KYC' },
  { id: 'transactions', href: '/user/transactions', label: 'Transactions' },
  { id: 'profile', href: '/user/profile', label: 'Profile' },
];

/** Nav items for navbar when not in dashboard (landing / standalone pages) */
export const LANDING_NAV_ITEMS = {
  user: [
    { href: '/user', label: 'Dashboard' },
    { href: '/analytics', label: 'Analytics' },
  ],
  admin: [
    { href: '/admin', label: 'Admin Hub' },
    { href: '/analytics', label: 'Analytics' },
  ],
} as const;

export const ADMIN_SECTIONS = ['overview', 'kyc', 'users', 'transactions', 'stablecoins', 'settings'] as const;
export const USER_SECTIONS = ['overview', 'transfer', 'kyc', 'transactions', 'profile'] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export type UserSection = (typeof USER_SECTIONS)[number];
