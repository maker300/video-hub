// Minimal service worker — just enough to satisfy Chrome's PWA
// installability requirements without adding an offline layer we haven't
// designed for.
//
// Why so bare-bones:
//   • Chrome requires a service worker with a fetch handler for the
//     Add-to-Home-Screen install prompt to appear on Android.
//   • Offline / precaching is complex to get right for a data-heavy site
//     like this (FM Trader analysis, live prices, calendar) — a naive
//     cache would serve stale prices and confuse users. We opt out for
//     now, but keep the SW in place so we can layer caching in later
//     without users needing to reinstall the PWA.
//
// Strategy:
//   install  → skipWaiting, so a new SW takes over on next page load
//   activate → clients.claim(), so the new SW controls open tabs
//   fetch    → pass through to the network unchanged
//
// Bumping SW_VERSION invalidates any client-side install caches Chrome
// might have kept from a previous version of this file.

const SW_VERSION = '1.0.0'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

// Empty fetch handler is required for Chrome to consider this a
// controlling service worker eligible for the install prompt. We
// deliberately return nothing so every request goes straight to the
// network — no cache-first surprises for time-sensitive data.
self.addEventListener('fetch', () => {})
