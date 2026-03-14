import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import type React from 'react';
import { Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Remittance Dashboard - Secure KYC Financial Platform',
  description: 'Professional KYC-enabled remittance platform with user and admin dashboards',
  generator: 'v0.app'
};
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={null}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
