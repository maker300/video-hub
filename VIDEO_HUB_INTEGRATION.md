# Video Hub Integration

How to pull approved Forex Mastery lesson images + manifest into the Video Hub
project's Remotion timeline.

## 1. Approve manifests

In the Forex Mastery admin → **YouTube Videos** tab, for each lesson:

1. Generate images (Whiteboard preset is default — no Google API required).
2. Approve the images you want included.
3. Click **Build manifest** on the Video Manifest panel — Claude assigns each
   segment to a whiteboard image, photoreal image, motion graphic, or title slide.
4. Click **Approve for Video Hub** to publish.

Only manifests with `status === 'approved'` are visible to the public API.

## 2. Set env vars in Video Hub

```bash
FM_API_BASE=https://forexmastery.org
FM_API_KEY=<same value as FM_SCRIPT_API_KEY in the Vercel project>
```

## 3. List approved lessons

```bash
curl -s "$FM_API_BASE/api/lesson-videos" \
     -H "x-api-key: $FM_API_KEY" \
     | jq '.lessons[] | { lessonId, title, segmentCount, totalDurationMs }'
```

Or with the query-param fallback (handy for browser tabs):
```
https://forexmastery.org/api/lesson-videos?key=<FM_API_KEY>
```

## 4. Fetch one lesson's full manifest

```bash
curl -s "$FM_API_BASE/api/lesson-videos?lessonId=lesson-1-1" \
     -H "x-api-key: $FM_API_KEY" \
     | jq
```

Response shape:
```json
{
  "baseUrl":  "https://forexmastery.org",
  "manifest": {
    "lessonId":        "lesson-1-1",
    "title":           "What Is the Forex Market",
    "totalDurationMs": 240000,
    "brandPalette":    { "primary": "#0d1b2a", "accent": "#10b981", ... },
    "segments": [
      {
        "segmentIndex": 0,
        "startMs":      0,
        "durationMs":   5400,
        "spokenText":   "Welcome to this lesson…",
        "asset": {
          "type":     "whiteboard",
          "imageId":  "cl…",
          "imageUrl": "/api/lesson-images/cl…/file"
        },
        "rationale": "Hand-drawn welcome scene."
      }
    ]
  },
  "updatedAt": "2026-…"
}
```

## 5. Render the video in Remotion

Two options.

### Option A — One-shot CLI render (easiest)

From inside this repo (or a Video Hub clone of it):
```bash
FM_API_BASE=https://forexmastery.org \
FM_API_KEY=your-key \
node scripts/render-lesson-video.mjs lesson-1-1 out/lesson-1-1.mp4
```

The script fetches the manifest, writes input props to a temp file, and runs
`npx remotion render LessonVideoFromManifest out/...` with the props attached.
Output is a 1920×1080 H.264 MP4 at 30fps.

### Option B — Mount the composition in your own Remotion project

Copy these files into Video Hub:
- `remotion/compositions/LessonVideoFromManifest.tsx`
- `remotion/stills/**` (the 25 catalog components — already there if you've
  cloned this repo)

Register it in your Video Hub `Root.tsx`:
```tsx
import { LessonVideoFromManifest } from './compositions/LessonVideoFromManifest'

<Composition
  id="LessonVideoFromManifest"
  component={LessonVideoFromManifest}
  fps={30}
  width={1920}
  height={1080}
  durationInFrames={1}   // overridden by calculateMetadata
  defaultProps={{ manifest, baseUrl, apiKey, fps: 30 }}
  calculateMetadata={({ props }) => ({
    durationInFrames: Math.round((props.manifest.totalDurationMs / 1000) * 30),
    props,
  })}
/>
```

Open Remotion Studio (`npx remotion studio`) and edit the timeline as needed —
trim sequences, swap clips, re-order, add transitions, etc.

## 6. Edit on the timeline

Once mounted, you can edit normally inside Remotion Studio:

- **Trim a segment**: change its `durationMs` in the manifest before passing
  in, OR wrap the `<Sequence>` in your composition with a tighter `durationInFrames`.
- **Replace an asset**: edit the manifest JSON's `asset.componentName` or
  `asset.imageId` and re-render. The whole manifest is JSON — pass an edited
  copy as input props.
- **Re-order**: change the `startMs` values and let the composition place
  them in the new order.
- **Add a new clip**: insert a new `SegmentPlan` into the array; if it
  references an image you haven't generated yet, generate + approve it in the
  Forex Mastery admin first.
- **Audio / narration**: drop `<Audio>` elements alongside the video sequences
  in your own composition wrapper.

## 7. Auth notes

- JSON endpoints accept either `x-api-key` header or `?key=` query param.
- Image-bytes endpoint (`/api/lesson-images/[id]/file`) accepts both too —
  Remotion's `<Img>` uses the query-param form automatically.
- Only **approved** manifests and images are returned via the public API.
  Drafts stay hidden.
- The same `FM_SCRIPT_API_KEY` already used by trade-scripts gates these
  endpoints.

## 8. Available endpoints

| Endpoint | Returns | Auth |
|---|---|---|
| `GET /api/lesson-videos` | All approved lesson summaries | `x-api-key` or `?key=` |
| `GET /api/lesson-videos?lessonId=X` | Full manifest for one lesson | `x-api-key` or `?key=` |
| `GET /api/lesson-images?lessonId=X` | Approved images for one lesson | `x-api-key` or `?key=` |
| `GET /api/lesson-images/[id]/file` | PNG bytes for one image | `x-api-key` or `?key=` |

## 9. Catalog of motion graphics

See `lib/remotion-catalog.ts` for the full list of 25 motion graphics Claude
can pick from when building manifests. Each entry has a `name` (matches the
Remotion component name) + a topic description.
