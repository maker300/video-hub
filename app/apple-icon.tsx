// Apple touch icon — 180×180 PNG served at /apple-icon.
//
// iOS Safari requires a real PNG for its "Add to Home Screen" tile; SVG
// icons in the manifest are ignored by iOS. Generating with ImageResponse
// keeps the design in sync with app/icon.svg — same colours, same shape.
// If icon.svg is ever redesigned, this file only needs its colours tweaked
// to match, not a re-export from a design tool.

import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: '#080e1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 40,   // iOS rounds anyway, but this shows correctly in PWA install prompts on Android too
        }}
      >
        <svg
          width="120" height="120"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polyline
            points="6,22 12,15 17,19 26,10"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <polyline
            points="21,10 26,10 26,15"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
