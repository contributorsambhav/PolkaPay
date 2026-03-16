import { generateOgImage, ogSize } from '@/lib/og-generator';

export const alt = 'User Console — PolkaPay';
export const size = ogSize;
export const contentType = 'image/png';

export default async function Image() {
  return generateOgImage(
    'User Console',
    'Track balances and limits, send and claim remittances, and manage your KYC profile.',
    '/user',
  );
}

