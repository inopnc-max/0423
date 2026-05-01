import Link from 'next/link'
import { BarChart3, ClipboardList, History } from 'lucide-react'

const WORKFLOW_LINKS = [
  {
    href: '/production/input',
    label: '입력',
    description: '생산, 판매, 자체사용, 운송비 정보를 정리합니다.',
    icon: ClipboardList,
  },
  {
    href: '/production/logs',
    label: '내역',
    description: '입력된 생산관리 기록을 기간별로 확인합니다.',
    icon: History,
  },
  {
    href: '/production/summary',
    label: '요약',
    description: '품목별 수량과 금액 흐름을 점검합니다.',
    icon: BarChart3,
  },
]

export function ProductionWorkflowPanel() {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[var(--color-text)]">생산관리 흐름</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {WORKFLOW_LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-[var(--color-border)] p-4 transition hover:border-[var(--active-role-color)] hover:bg-[var(--color-bg)]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-bg)] text-[var(--active-role-color)]">
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </div>
            <div className="font-semibold text-[var(--color-text)]">{label}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
