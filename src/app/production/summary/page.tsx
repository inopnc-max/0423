'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, CalendarRange, FileSpreadsheet, PackageSearch, Rows3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  loadProductionSummary,
  loadProducts,
  loadProductionEntries,
  PRODUCTION_TYPE_LABELS,
  type ProductionEntry,
  type ProductionSummary,
} from '@/lib/production-management'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-secondary)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

interface KpiCard {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export default function ProductionSummaryPage() {
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    productName: '',
  })

  const [products, setProducts] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [summary, setSummary] = useState<ProductionSummary | null>(null)
  const [recentEntries, setRecentEntries] = useState<ProductionEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [loadedSummary, loadedProducts, loadedEntries] = await Promise.all([
        loadProductionSummary({
          startDate: filters.startDate,
          endDate: filters.endDate,
          productName: filters.productName || undefined,
        }),
        loadProducts(),
        loadProductionEntries({
          startDate: filters.startDate,
          endDate: filters.endDate,
          productName: filters.productName || undefined,
          limit: 10,
        }),
      ])

      setSummary(loadedSummary)
      setProducts(loadedProducts)
      setRecentEntries(loadedEntries)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const kpiCards: KpiCard[] = [
    {
      label: '생산 수량',
      value: summary?.totalProductionQuantity ?? 0,
      trend: 'neutral',
    },
    {
      label: '판매 수량',
      value: summary?.totalSaleQuantity ?? 0,
      trend: summary && summary.totalSaleQuantity > 0 ? 'up' : 'neutral',
      trendValue: summary ? `${summary.totalSaleAmount.toLocaleString('ko-KR')}원` : undefined,
    },
    {
      label: '자체사용 수량',
      value: summary?.totalSelfUseQuantity ?? 0,
      trend: 'neutral',
    },
    {
      label: '재고조정 건수',
      value: summary?.stockAdjustmentCount ?? 0,
      trend: summary && summary.stockAdjustmentCount > 0 ? 'down' : 'neutral',
    },
    {
      label: '운송비',
      value: summary?.totalTransportCost?.toLocaleString('ko-KR') ?? 0,
      trend: summary && summary.totalTransportCost > 0 ? 'down' : 'neutral',
    },
  ]

  const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'neutral' }) => {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-500" />
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    return <Minus className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
  }

  const groupedByProduct = recentEntries.reduce((acc, entry) => {
    const key = entry.productName
    if (!acc[key]) {
      acc[key] = {
        productName: entry.productName,
        totalQuantity: 0,
        totalAmount: 0,
        entries: [],
      }
    }
    acc[key].totalQuantity += entry.quantity
    acc[key].totalAmount += entry.amount
    acc[key].entries.push(entry)
    return acc
  }, {} as Record<string, { productName: string; totalQuantity: number; totalAmount: number; entries: ProductionEntry[] }>)

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <BarChart3 className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Summary
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 요약</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산, 판매, 자체사용, 운송비, 재고조정 흐름을 기간별로 요약하는 화면입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-text)]">요약 기준</h2>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-xl bg-[var(--color-primary-strong)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
          >
            조회
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClassName}>
            기간
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                className={fieldClassName}
                value={filters.startDate}
                onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <input
                type="date"
                className={fieldClassName}
                value={filters.endDate}
                onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </label>

          <label className={labelClassName}>
            품목
            <select
              className={fieldClassName}
              value={filters.productName}
              onChange={e => setFilters(prev => ({ ...prev, productName: e.target.value }))}
            >
              <option value="">전체 품목</option>
              {products.map(product => (
                <option key={product.id} value={product.name}>
                  {product.name} ({product.code})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
          데이터를 불러오는 중...
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Rows3 className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
              <h2 className="text-base font-semibold text-[var(--color-text)]">요약 지표</h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">{card.label}</p>
                    <TrendIcon trend={card.trend} />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">{card.value}</p>
                  {card.trendValue && (
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{card.trendValue}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
              <h2 className="text-base font-semibold text-[var(--color-text)]">제품별 이동 요약</h2>
            </div>

            {Object.keys(groupedByProduct).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5">
                <p className="text-sm font-semibold text-[var(--color-text)]">아직 집계 데이터가 없습니다.</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  기간과 품목을 선택하여 조회를 눌러주세요.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                      <th className="px-3 py-2 text-left font-semibold text-[var(--color-text-secondary)]">품목명</th>
                      <th className="px-3 py-2 text-right font-semibold text-[var(--color-text-secondary)]">총 수량</th>
                      <th className="px-3 py-2 text-right font-semibold text-[var(--color-text-secondary)]">총 금액</th>
                      <th className="px-3 py-2 text-center font-semibold text-[var(--color-text-secondary)]">건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(groupedByProduct).map((group) => (
                      <tr key={group.productName} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]">
                        <td className="px-3 py-2.5">
                        <div className="font-medium text-[var(--color-text)]">{group.productName}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[var(--color-text)]">
                          {group.totalQuantity.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--color-text)]">
                          {group.totalAmount.toLocaleString('ko-KR')}원
                        </td>
                        <td className="px-3 py-2.5 text-center text-[var(--color-text-secondary)]">
                          {group.entries.length}건
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
              <h2 className="text-base font-semibold text-[var(--color-text)]">월마감 및 보고서 안내</h2>
            </div>

            <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>엑셀/PDF 출력 기능은 별도 PR에서 추가 예정입니다.</p>
              <p>월말 재고 마감 기능은 재고 원장 테이블 연동 후 진행합니다.</p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
