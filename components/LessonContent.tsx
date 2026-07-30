'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { buildTimestampedSegments, fmtTimestamp } from '@/lib/lesson-segments-with-timestamps'
import type { Lesson } from '@/types'

interface LessonContentProps {
  content:      string
  title:        string
  // Optional: pass the full lesson + moduleTitle to render the timestamped
  // script segments under the lesson body. The image pipeline (admin →
  // YouTube Videos) generates one image per segment using these same
  // timestamps as the timeline anchor.
  lesson?:      Lesson
  moduleTitle?: string
}

export default function LessonContent({ content, title, lesson, moduleTitle }: LessonContentProps) {
  // The timestamped script section is an admin-only authoring tool — it drives
  // the YouTube Videos pipeline and isn't relevant to learners.
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const segments = useMemo(() => {
    if (!isAdmin || !lesson || !moduleTitle) return []
    try { return buildTimestampedSegments(lesson, moduleTitle) }
    catch { return [] }
  }, [isAdmin, lesson, moduleTitle])

  return (
    <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4 sm:p-6 lg:p-8 overflow-hidden">
      <h2 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">{title}</h2>
      <div
        className="prose-forex max-w-full overflow-x-hidden"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {isAdmin && segments.length > 0 && (
        <div className="mt-10 pt-6 border-t border-amber-500/30">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Lesson script · timestamps
              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">Admin only</span>
            </h3>
            <span className="text-[10px] text-gray-500">
              {segments.length} segments · estimated {fmtTimestamp(segments[segments.length - 1].endMs)} total
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
            Each line below is what gets spoken during a segment of the video. The timestamp is when that segment plays.
            Forex Mastery YouTube videos use these same timestamps to drop the matching AI-generated images on the timeline.
          </p>
          <ol className="space-y-2">
            {segments.map(seg => (
              <li
                key={seg.segmentIndex}
                className="flex gap-3 items-start text-sm leading-relaxed"
              >
                <span className="shrink-0 font-mono tabular-nums text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 mt-0.5">
                  {fmtTimestamp(seg.startMs)}
                </span>
                <span className="text-gray-300">{seg.spokenText}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
