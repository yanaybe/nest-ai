// TODO [MOBILE]:
// The metadata references manifest: '/manifest.json' but this file doesn't exist.
// Without a valid PWA manifest, the app cannot be "Add to Home Screen" on mobile, which is
// critical for a household app that should live on the phone's home screen.
//
// Required manifest.json content:
// {
//   "name": "Nest — AI Family Assistant",
//   "short_name": "Nest",
//   "description": "The AI operating system for family life",
//   "start_url": "/dashboard",
//   "display": "standalone",
//   "background_color": "#ffffff",
//   "theme_color": "#6366f1",
//   "icons": [
//     { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
//     { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
//   ]
// }
//
// Also create the icon files (192px and 512px PNG versions of the Nest logo).
// Without icons, the PWA won't install properly on iOS or Android.

// TODO [MOBILE]:
// There is no service worker, which means:
// 1. No offline support — any network hiccup shows a blank screen
// 2. No background sync for grocery list changes made offline
// 3. No push notification capability (push requires a service worker)
//
// For a household app used while shopping (often in stores with poor connectivity),
// offline support for the grocery list is a critical feature.
// Use next-pwa or workbox to add a service worker with:
//   - Cache-first strategy for static assets
//   - Network-first strategy for API calls with offline fallback
//   - Background sync queue for mutations made offline

// TODO [PERFORMANCE]:
// Google Fonts (Inter) loads from Google's CDN. This adds an external DNS lookup + connection
// on every page load. Consider self-hosting the font file using `next/font/google` which
// automatically downloads and serves fonts from the same domain (already configured but
// verify that font files are actually bundled). Also add `preload` hints for critical font weights.

// TODO [UX / ACCESSIBILITY]:
// The root layout has no skip-to-content link for screen reader users. Every page starts
// with the sticky header/sidebar, meaning keyboard and screen reader users must tab through
// all navigation items before reaching the main content.
// Add: <a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>
// as the first element in the body, and add id="main-content" to the <main> element
// in the app layout.

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Nest — AI Family Assistant',
    template: '%s · Nest',
  },
  description: 'The AI operating system for family life. Manage groceries, tasks, calendar, expenses, and more — all in one place.',
  keywords: ['family assistant', 'AI assistant', 'household management', 'grocery list', 'family calendar'],
  openGraph: {
    title: 'Nest — AI Family Assistant',
    description: 'The AI operating system for family life',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nest',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
