import { generateOgImage, ogSize } from '@/lib/og-generator';

export const alt = 'Admin Console — PolkaPay';
export const size = ogSize;
export const contentType = 'image/png';

export default async function Image() {
  return generateOgImage(
    'Admin Console',
    'Manage KYC queues, user access, system settings, and platform-wide remittance analytics.',
    '/admin',
  );
}

