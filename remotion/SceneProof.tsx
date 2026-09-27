// Dev proof sheet — renders nine real lesson cards in a grid so they can be
// eyeballed as an image before shipping:
//
//   npx remotion still SceneProof out.png --props='{"lessonIdx":1,"page":0}'
//
// Not used by the app at runtime; the Next bundle imports the composition
// directly, and only the Remotion CLI reads remotion/Root.tsx.
import React from 'react'
import { AbsoluteFill } from 'remotion'
import { courseModules } from '../lib/courseData'
import { parseHtmlContent, buildNarrationSegments } from '../lib/lessonParser'
import { buildSceneSpecs } from '../lib/lesson-scene-spec'
import { bestDiagram } from '../lib/lesson-visual-match'
import { VARIANT_COUNTS } from './lesson-visuals/visuals'
import { SceneCard } from './lesson-visuals/SceneCard'
import { VB_W, VB_H } from './lesson-visuals/primitives'

export const SceneProof: React.FC<{ lessonIdx: number; page: number }> = ({ lessonIdx, page }) => {
  const flat: { m: any; l: any }[] = []
  for (const m of courseModules) for (const l of m.lessons) flat.push({ m, l })
  const { m, l } = flat[lessonIdx % flat.length]
  const x = l as any
  const segs = buildNarrationSegments(x.title, m.title, parseHtmlContent(x.content ?? ''), x.keyPoints ?? [], x.terms ?? [], x.caution)
  const specs = buildSceneSpecs(segs.map(s => ({ type: s.type, heading: s.heading, body: s.body, meta: s.meta })), bestDiagram, VARIANT_COUNTS)
  const live = specs.map((sp, i) => ({ sp, i })).filter(z => z.sp)
  const slice = live.slice(page * 9, page * 9 + 9)

  return (
    <AbsoluteFill style={{ background: '#080e1a', padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {slice.map(({ sp, i }) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.022)' }}>
            <div style={{ font: '600 11px Inter, sans-serif', color: '#64748b', padding: '5px 9px' }}>
              #{i} · {sp!.layout}{sp!.diagramId ? ` (${sp!.diagramId})` : ''}
            </div>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" style={{ display: 'block' }}>
              <SceneCard spec={sp!} localFrame={120} />
            </svg>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
