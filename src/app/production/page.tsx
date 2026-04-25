import { Construction } from 'lucide-react'

export default function ProductionPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-navy)]/10">
        <Construction className="h-8 w-8 text-[var(--color-navy)]" strokeWidth={1.5} />
      </div>
      <h1 className="mb-3 text-lg font-semibold text-[var(--color-text)]">생산관리</h1>
      <p className="max-w-xs text-sm text-[var(--color-text-secondary)]">
        해당 화면은 준비 중입니다.
        <br />
        하단 메뉴에서 입력 / 내역 / 요약 중 하나를 선택해 주세요.
      </p>
    </div>
  )
}
