// Dev harness: samples one scene across its entrance so the transition can be
// checked as stills (slide / zoom should be visibly mid-move at +4 and +10).
import React from 'react'
import { AbsoluteFill } from 'remotion'
import { LessonVideo } from './compositions/LessonVideo'
import { lessonCues } from './LessonReal'

export const TransStrip: React.FC<{ lessonIdx: number; cueIdx: number }> = ({ lessonIdx, cueIdx }) => {
  const { cues, title, moduleTitle, lesson, module } = lessonCues(lessonIdx)
  const cue = cues[cueIdx]
  const offsets = [0, 5, 11, 20, 60]
  return (
    <AbsoluteFill style={{ background: '#05080f', padding: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {offsets.map(o => (
          <div key={o} style={{ border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ font: '600 10px Inter, sans-serif', color: '#94a3b8', padding: '3px 6px', background: '#0b1220' }}>+{o}f</div>
            <div style={{ position: 'relative', width: '100%', height: 144, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.2)', transformOrigin: 'top left', width: 1280, height: 720 }}>
                <LessonVideo lessonTitle={title} moduleTitle={moduleTitle}
                  moduleNumber={(module as any).moduleNumber ?? 1}
                  lessonNumber={(lesson as any).lessonNumber ?? 1}
                  cuePoints={cues} frameOverride={cue.startFrame + o} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
