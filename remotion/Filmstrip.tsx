// Dev harness: samples the real lesson video at one frame inside every cue
// and tiles them, so a whole lesson can be reviewed as a single image.
import React from 'react'
import { AbsoluteFill } from 'remotion'
import { LessonVideo } from './compositions/LessonVideo'
import { lessonCues } from './LessonReal'

export const Filmstrip: React.FC<{ lessonIdx: number; from: number; count: number }> = ({
  lessonIdx, from, count,
}) => {
  const { cues, title, moduleTitle, lesson, module } = lessonCues(lessonIdx)
  const slice = cues.slice(from, from + count)

  return (
    <AbsoluteFill style={{ background: '#05080f', padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {slice.map((cue, i) => {
          // Sample ~60% through each cue: past the entrance animation, before
          // the exit fade — i.e. what a viewer actually looks at.
          const at = Math.round(cue.startFrame + (cue.endFrame - cue.startFrame) * 0.6)
          return (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ font: '600 11px Inter, sans-serif', color: '#94a3b8', padding: '4px 8px', background: '#0b1220' }}>
                cue {from + i} · {cue.type} · f{at}
              </div>
              <div style={{ position: 'relative', width: '100%', height: 360, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.5)', transformOrigin: 'top left', width: 1280, height: 720 }}>
                  <LessonVideo
                    lessonTitle={title} moduleTitle={moduleTitle}
                    moduleNumber={(module as any).moduleNumber ?? 1}
                    lessonNumber={(lesson as any).lessonNumber ?? 1}
                    cuePoints={cues}
                    frameOverride={at}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
