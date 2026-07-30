import type { NextConfig } from 'next'

// Content-Security-Policy:
//   default-src 'self'           — only load resources from same origin by default
//   script-src  'self' 'unsafe-inline' 'unsafe-eval' — Next.js requires unsafe-eval for hydration
//   style-src   'self' 'unsafe-inline' — Tailwind inline styles require unsafe-inline
//   img-src     'self' data: blob: https: — images from same origin + data URIs + any HTTPS
//   font-src    'self' — fonts from same origin
//   connect-src 'self' https://api.stripe.com wss: — API calls + Stripe + WebSockets
//   frame-src   https://js.stripe.com https://hooks.stripe.com — Stripe payment iframes
//   object-src  'none' — block Flash/plugins entirely
//   base-uri    'self' — prevent base tag hijacking
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://api.stripe.com wss:",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

const securityHeaders = [
  // Content Security Policy — primary XSS defence
  { key: 'Content-Security-Policy',   value: CSP },
  // Prevent clickjacking — page cannot be embedded in an iframe on another domain
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  // Stop browsers from guessing MIME types (prevents MIME-sniffing attacks)
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  // Don't send the full URL as Referer when navigating to external sites
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  // Restrict powerful browser features to same origin only
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year (only active once deployed on HTTPS)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Basic XSS protection for older browsers
  { key: 'X-XSS-Protection',          value: '1; mode=block' },
]

const nextConfig: NextConfig = {
  // Native node bindings (Rust N-API). Turbopack can't bundle these — must be
  // resolved at runtime via require() on the server. @resvg/resvg-js renders
  // the whiteboard SVGs to PNG in /api/admin/lesson-images.
  serverExternalPackages: ['@resvg/resvg-js'],
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
