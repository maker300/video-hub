import { redirect } from 'next/navigation'

// Timed access plans were replaced by per-run FM Trader tokens. Kept as a
// redirect rather than deleted: this path is linked from older emails, the ad
// banner, and any bookmark a user still holds.
export default function PlansPage() {
  redirect('/analysis/tokens')
}
