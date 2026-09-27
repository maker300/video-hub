// Export composition — the lesson video rendered to a file.
//
// Identical to what the site plays, but driven entirely by props so the render
// script can feed it the real narration timing and audio rather than the
// synthetic timing the dev harness uses.
import React from 'react'
import { LessonVideo } from './compositions/LessonVideo'
import type { SlideCue } from '../lib/lessonParser'

export interface LessonExportProps {
  lessonTitle:  string
  moduleTitle:  string
  moduleNumber: number
  lessonNumber: number
  cuePoints:    SlideCue[]
  /** Path under public/, or an absolute URL. */
  audioUrl?:    string
}

export const LessonExport: React.FC<LessonExportProps> = ({
  lessonTitle, moduleTitle, moduleNumber, lessonNumber, cuePoints, audioUrl,
}) => (
  <LessonVideo
    lessonTitle={lessonTitle}
    moduleTitle={moduleTitle}
    moduleNumber={moduleNumber}
    lessonNumber={lessonNumber}
    cuePoints={cuePoints}
    audioUrl={audioUrl}
  />
)
