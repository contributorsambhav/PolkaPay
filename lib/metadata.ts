import type { Metadata } from 'next';

// TODO: baseUrl should match your deployed domain.
export const baseUrl = new URL('https://polka-pay.vercel.app/');
export const siteOwnerName = 'PolkaPay';
export const siteOwnerHandle = '@polkapay';
export const siteTagline = 'PolkaPay is a KYC-enabled remittance and analytics console on Polkadot Hub Testnet.';

export const siteMetadata: Metadata = {
  metadataBase: baseUrl,
  title: {
    default: `${siteOwnerName} | Operational Console`,
    template: `%s | ${siteOwnerName}`,
  },
  description:
    'PolkaPay is a KYC-enabled remittance and analytics console on Polkadot Hub Testnet, providing secure user and admin dashboards for cross-border transfers, compliance, and on-chain monitoring.',
  authors: [{ name: siteOwnerName, url: baseUrl.toString() }],
  creator: siteOwnerName,
  publisher: siteOwnerName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: baseUrl,
    types: {
      'application/rss+xml': `${baseUrl.toString().replace(/\/$/, '')}/feed.xml`,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: siteOwnerName,
    title: `${siteOwnerName} | Operational Console`,
    description: siteTagline,
    images: [
      {
        url: `${baseUrl.toString().replace(/\/$/, '')}/og/default-og.png`,
        width: 1200,
        height: 630,
        alt: `${siteOwnerName} Operational Console`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteOwnerName} | Operational Console`,
    description: siteTagline,
    creator: siteOwnerHandle,
    site: siteOwnerHandle,
    images: [
      {
        url: `${baseUrl.toString().replace(/\/$/, '')}/og/default-og.png`,
        alt: `${siteOwnerName} Operational Console`,
      },
    ],
  },
  verification: {
    google: 'GOOGLE_SITE_VERIFICATION_TOKEN', // replace with real token
  },
  other: {
    'msvalidate.01': 'BING_SITE_VERIFICATION_TOKEN',
  },
};

// --- JSON-LD Structured Data ---

export const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: siteOwnerName,
  url: baseUrl.toString(),
  sameAs: [
    'https://github.com/contributorsambhav', // replace or extend as needed
  ],
  jobTitle: 'Remittance Platform',
  description: siteTagline,
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteOwnerName,
  url: baseUrl.toString(),
  description: siteTagline,
  publisher: {
    '@type': 'Organization',
    name: siteOwnerName,
  },
};

export const profilePageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  name: `${siteOwnerName} Operational Console`,
  url: baseUrl.toString(),
  about: siteTagline,
};

export const breadcrumbHomeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: baseUrl.toString(),
    },
  ],
};

export const adminConsoleBreadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: baseUrl.toString(),
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Admin Console',
      item: `${baseUrl.toString().replace(/\/$/, '')}/admin`,
    },
  ],
};

export const userConsoleBreadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: baseUrl.toString(),
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'User Console',
      item: `${baseUrl.toString().replace(/\/$/, '')}/user`,
    },
  ],
};

export const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is PolkaPay?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PolkaPay is a KYC-enabled remittance and analytics console built on Polkadot Hub Testnet, providing secure dashboards for admins and users.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who is PolkaPay for?',
      acceptedAnswer: {
        '@type': 'Answer',
          text: 'PolkaPay is designed for operators managing cross-border transfers, compliance teams, and power users who need transparent on-chain remittance analytics.',
      },
    },
  ],
};

export function getAllJsonLdScripts() {
  return [
    personJsonLd,
    websiteJsonLd,
    profilePageJsonLd,
    breadcrumbHomeJsonLd,
    adminConsoleBreadcrumbJsonLd,
    userConsoleBreadcrumbJsonLd,
    faqJsonLd,
  ];
}

