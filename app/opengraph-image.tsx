import { generateOgImage, ogSize } from '@/lib/og-generator';

export const alt = 'PolkaPay Operational Console';
export const size = ogSize;
export const contentType = 'image/png';

export default async function Image() {
  return generateOgImage(
    'PolkaPay Operational Console',
    'KYC-enabled remittance, analytics, and contract controls on Polkadot Hub Testnet.',
    '/',
  );
}

