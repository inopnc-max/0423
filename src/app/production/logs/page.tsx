'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock3, History, ListFilter, SearchX, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import {
  loadProductionEntries,
  deleteProductionEntry,
  PRODUCTION_TYPE_LABELS,
  type ProductionEntry,
} from '@/lib/production-management'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-secondary)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

const ITEMS_PER_PAGE = 20

export default function ProductionLogsPage() {
  const [entries, setEntries] = useState<ProductionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    productionType: '',
    search: '',
  })

  const [page, setPage] = useState(1)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadProductionEntries({
        startDate: filters.startDate,
        endDate: filters.endDate,
        productionType: filters.productionType as ProductionEntry['productionType'] | undefined,
      })

      const filtered = filters.search
        ? data.filter(e =>
            e.productName.toLowerCase().includes(filters.search.toLowerCase())
          )
        : data

      setEntries(filtered)
      setTotalCount(filtered.length)
      setPage(1)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return

    const result = await deleteProductionEntry(id)
    if (result.ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
      setTotalCount(prev => prev - 1)
    } else {
      alert(result.message)
    }
  }, [])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const paginatedEntries = entries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <History className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Logs
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 이력</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산, 판매, 자체사용, 운송비, 재고조정 내역을 확인하는 화면입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-text)]">조회 조건</h2>
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
            {totalCount}건
          </span>
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
            구분
            <select
              className={fieldClassName}
              value={filters.productionType}
              onChange={e => setFilters(prev => ({ ...prev, productionType: e.target.value }))}
            >
              <option value="">전체 구분</option>
              {Object.entries(PRODUCTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className={labelClassName}>
            품목명 검색
            <input
              type="text"
              className={fieldClassName}
              placeholder="품목명 또는 코드 검색"
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="mt-4 rounded-xl bg-[var(--color-primary-strong)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
        >
          조회
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-text)]">이력 리스트</h2>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
            데이터를 불러오는 중...
          </div>
        ) : paginatedEntries.length === 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-8">
            <SearchX className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                조회 결과가 없습니다.
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                조건을 변경하여 다시 조회해주세요.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                    <th className="px-3 py-2 text-left font-semibold text-[var(--color-text-secondary)]">일자</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--color-text-secondary)]">구분</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--color-text-secondary)]">품목명</th>
                    <th className="px-3 py-2 text-right font-semibold text-[var(--color-text-secondary)]">수량</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--color-text-secondary)]">단위</th>
                    <th className="px-3 py-2 text-right font-semibold text-[var(--color-text-secondary)]">금액</th>
                    <th className="px-3 py-2 text-center font-semibold text-[var(--color-text-secondary)]">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map(entry => (
                    <tr key={entry.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]">
                      <td className="px-3 py-2.5 text-[var(--color-text)]">{entry.workDate}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs font-medium">
                          {PRODUCTION_TYPE_LABELS[entry.productionType]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--color-text)] font-medium">
                        {entry.productName}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[var(--color-text)]">
                        {entry.quantity.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--color-text)]">{entry.unit}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--color-text)]">
                        {entry.amount.toLocaleString('ko-KR')}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-500"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[var(--color-border)] p-2 hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[var(--color-border)] p-2 hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
