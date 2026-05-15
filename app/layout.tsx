import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Video Hub',
  description: 'Professional promotional video studio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
