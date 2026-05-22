'use client'

interface LessonContentProps {
  content: string
  title: string
}

export default function LessonContent({ content, title }: LessonContentProps) {
  return (
    <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-4 sm:p-6 lg:p-8 overflow-hidden">
      <h2 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">{title}</h2>
      <div
        className="prose-forex max-w-full overflow-x-hidden"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}
