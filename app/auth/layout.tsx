import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'

// Auth pages used to be a dead-end — no Navbar, no back-to-home affordance.
// Users who tapped a home-page CTA into /auth/signin could only get out via
// the browser back button, and iPhone Safari's back button hides when the
// toolbar auto-hides on scroll. Two fixes here:
//   • A small "Home" pill in the top-left of the auth screen, always
//     visible, obvious tap target.
//   • The ForexMastery logo/brand is now a Link to `/` too, matching the
//     universal pattern of "logo = home".
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F1E] px-4">
      {/* Back-to-home pill — sits above the safe area, tap target ≥44px. */}
      <div className="max-w-md mx-auto pt-4 sm:pt-6">
        <Link
          href="/"
          aria-label="Back to home"
          className="inline-flex items-center gap-1.5 min-h-11 px-3 -mx-3 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md mx-auto pb-8">
        {/* Logo / Brand — clickable, goes home. Matches the "logo = home"
            convention users already reach for when they want to bail out. */}
        <div className="text-center mb-8 mt-6 sm:mt-10">
          <Link
            href="/"
            aria-label="Forex Mastery — home"
            className="inline-flex items-center gap-2 group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center group-hover:brightness-110 transition">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Forex<span className="text-emerald-400">Mastery</span>
            </span>
          </Link>
          <p className="text-sm text-gray-500 mt-2">Professional Forex Trading Education</p>
        </div>

        {children}
      </div>
    </div>
  )
}
