import Image from 'next/image'
import { LESSON_IMAGE_MAP } from '@/lib/lessonImageMap'

interface LessonIllustrationProps {
  compositionId: string
  alt: string
  caption?: string
}

export const LessonIllustration: React.FC<LessonIllustrationProps> = ({
  compositionId,
  alt,
  caption,
}) => {
  const src = LESSON_IMAGE_MAP[compositionId]

  if (!src) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-500">
        Illustration not yet generated — run:{' '}
        <code className="ml-1 text-emerald-400">node scripts/render-stills.mjs</code>
      </div>
    )
  }

  return (
    <figure className="my-6 mx-0">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={675}
        className="w-full h-auto rounded-xl block"
        priority={false}
      />
      {caption && (
        <figcaption className="text-xs text-gray-500 text-center pt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
