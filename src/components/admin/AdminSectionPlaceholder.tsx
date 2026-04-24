import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/routes'

interface AdminSectionPlaceholderProps {
  title: string
  description: string
  highlights: string[]
}

export default function AdminSectionPlaceholder({
  title,
  description,
  highlights,
}: AdminSectionPlaceholderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-navy)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--color-navy)]">현재 정리된 범위</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {highlights.map(item => (
            <div key={item} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)]">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[var(--color-navy)]">다음 연결 지점</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              CSV 업로드, 사용자/현장 관리와 이어서 확장할 수 있도록 관리자 동선만 먼저 맞춰두었습니다.
            </p>
          </div>

          <Link
            href={ADMIN_ROUTES.csvUpload}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
          >
            <span>CSV 업로드</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.9} />
          </Link>
        </div>
      </div>
    </div>
  )
}
