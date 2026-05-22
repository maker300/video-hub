'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'

export default function PaymentSuccessBanner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShow(true)
      // Clean URL without reload
      router.replace('/analysis', { scroll: false })
    }
  }, [searchParams, router])

  if (!show) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm shadow-lg backdrop-blur">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
        <span className="flex-1 font-medium">Payment successful — your access is now active!</span>
        <button onClick={() => setShow(false)} className="text-emerald-400/60 hover:text-emerald-300 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
