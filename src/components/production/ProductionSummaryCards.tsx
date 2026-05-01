import { Building2, PackageCheck, PackageSearch, ReceiptText, Truck } from 'lucide-react'
import type { ProductionDashboardSummary } from '@/lib/production/productionRecords'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value * 1000) / 1000)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value)
}

export function ProductionSummaryCards({
  summary,
}: {
  summary: ProductionDashboardSummary
}) {
  const cards = [
    {
      label: '생산 수량',
      value: formatNumber(summary.productionQuantity),
      icon: PackageCheck,
      className: 'bg-blue-50 text-blue-700',
    },
    {
      label: '판매 수량',
      value: formatNumber(summary.salesQuantity),
      icon: ReceiptText,
      className: 'bg-green-50 text-green-700',
    },
    {
      label: '자체사용',
      value: formatNumber(summary.selfUseQuantity),
      icon: Building2,
      className: 'bg-amber-50 text-amber-700',
    },
    {
      label: '운송비',
      value: formatCurrency(summary.transportAmount),
      icon: Truck,
      className: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: '활성 품목',
      value: formatNumber(summary.activeProducts),
      icon: PackageSearch,
      className: 'bg-violet-50 text-violet-700',
    },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, className }) => (
        <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${className}`}>
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">{value}</p>
        </div>
      ))}
    </section>
  )
}
