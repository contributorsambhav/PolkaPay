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
  { id: 'send', href: '/user/send', label: 'Send Money' },
  { id: 'receive', href: '/user/receive', label: 'Receive / Claim' },
  { id: 'stablecoins', href: '/user/stablecoins', label: 'Stablecoins' },
  { id: 'kyc', href: '/user/kyc', label: 'KYC' },
  { id: 'transactions', href: '/user/transactions', label: 'Transactions' },
  { id: 'profile', href: '/user/profile', label: 'Profile' },
  { id: 'analytics', href: '/analytics', label: 'Analytics' },
  { id: 'remittance', href: '/contract', label: 'Remittance' },
];

/** Nav items for navbar when not in dashboard (landing / standalone pages) */
export const LANDING_NAV_ITEMS = {
  user: [
    { href: '/user', label: 'Dashboard' },
    { href: '/contract', label: 'Remittance' },
    { href: '/kyc', label: 'KYC Desk' },
    { href: '/analytics', label: 'Analytics' },
  ],
  admin: [
    { href: '/admin', label: 'Admin Hub' },
    { href: '/contract', label: 'Remittance' },
    { href: '/kyc', label: 'KYC Queue' },
    { href: '/analytics', label: 'Analytics' },
  ],
} as const;

export const ADMIN_SECTIONS = ['overview', 'kyc', 'users', 'transactions', 'stablecoins', 'settings'] as const;
export const USER_SECTIONS = ['overview', 'send', 'receive', 'stablecoins', 'kyc', 'transactions', 'profile'] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export type UserSection = (typeof USER_SECTIONS)[number];
