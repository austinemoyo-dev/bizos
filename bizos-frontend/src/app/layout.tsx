import type { Metadata, Viewport } from 'next';
import { DM_Sans, Space_Mono, Syne } from 'next/font/google';
import './globals.css';
import NextTopLoader from 'nextjs-toploader';
import { Providers } from './providers';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0C0D0F' },
    { media: '(prefers-color-scheme: light)', color: '#F2EDE4' },
  ],
};

export const metadata: Metadata = {
  title: 'BizOS — Dash & Co.',
  description: 'Business + Personal Finance Operating System',
  applicationName: 'BizOS',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BizOS',
  },
  formatDetection: { telephone: false },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceMono.variable} ${syne.variable}`}>
      <head>
        {/* iOS full-screen PWA */}
        <meta name="apple-mobile-web-app-capable"            content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style"   content="black-translucent" />
        <meta name="apple-mobile-web-app-title"              content="BizOS" />
        <meta name="mobile-web-app-capable"                  content="yes" />

        {/* Disable iOS auto-detection */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />

        {/* Android / Chrome PWA */}
        <meta name="theme-color"        content="#C8102E" />
        <meta name="msapplication-TileColor" content="#C8102E" />

        {/* Icons */}
        <link rel="apple-touch-icon"  href="/icons/icon-192.png" />
        <link rel="icon"              href="/icons/icon-192.png" type="image/png" />
        <link rel="manifest"          href="/manifest.json" />
      </head>
      <body>
        <NextTopLoader
          color="#C8102E"
          initialPosition={0.08}
          crawlSpeed={200}
          height={2}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px rgba(200,16,46,0.7),0 0 5px rgba(200,16,46,0.4)"
          zIndex={9998}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
