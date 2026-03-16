import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type React from 'react';
import { Suspense } from 'react';

import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { getAllJsonLdScripts, siteMetadata } from '@/lib/metadata';

export const metadata = siteMetadata;

const jsonLdScripts = getAllJsonLdScripts();

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {jsonLdScripts.map((schema, index) => (
          <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} min-w-0 overflow-x-hidden antialiased`}>
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
