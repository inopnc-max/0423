import { Construction } from 'lucide-react'

export default function ProductionInputPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-navy)]/10">
        <Construction className="h-8 w-8 text-[var(--color-navy)]" strokeWidth={1.5} />
      </div>
      <h1 className="mb-3 text-lg font-semibold text-[var(--color-text)]">생산관리 입력 화면</h1>
      <p className="max-w-xs text-sm text-[var(--color-text-secondary)]">
        해당 화면은 준비 중입니다.
        <br />
        PR 18에서 생산/판매/자체사용/운송비 입력 기능이 연결될 예정입니다.
      </p>
    </div>
  )
}
