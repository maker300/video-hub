import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import SupportWidget from '@/components/SupportWidget'
import PageTracker from '@/components/PageTracker'
import AdBanner from '@/components/AdBanner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Forex Mastery Course',
  description: 'Professional forex trading education from fundamentals to advanced strategies.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#080e1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#080e1a] text-white antialiased">
        <AuthProvider>
          <PageTracker />
          {children}
          <SupportWidget />
          <AdBanner />
          <div className="w-full bg-[#050a12] border-t border-white/[0.06] py-2 px-4 text-center text-[10px] text-gray-600 leading-relaxed">
            <span className="text-amber-600/80 font-semibold">⚠ Educational purposes only.</span>{' '}
            This platform is not a regulated financial adviser. All market analysis, AI signals, and content are for learning purposes only and do not constitute financial, investment, or trading advice.
            Trading foreign exchange, commodities, and other instruments carries substantial risk of loss. Never risk money you cannot afford to lose.
          </div>
        </AuthProvider>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1357116183925369"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
