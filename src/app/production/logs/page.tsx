'use client'

import { useState, useMemo, useCallback } from 'react'
import { History, ListFilter } from 'lucide-react'
import { ProductionRecentEntries } from '@/components/production/ProductionRecentEntries'
import { ProductionEntryEditModal } from '@/components/production/ProductionEntryEditModal'
import { useProductionDashboard } from '@/hooks/production/useProductionDashboard'
import type { ProductionEntryType, ProductionRecentEntry, ProductionEntryUpdateInput } from '@/lib/production/productionRecords'
import { deleteProductionEntry } from '@/lib/production/productionRecords'
import { createClient } from '@/lib/supabase/client'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

const PRODUCTION_TYPES: { value: ProductionEntryType | ''; label: string }[] = [
  { value: '', label: '전체 구분' },
  { value: '생산', label: '생산' },
  { value: '판매', label: '판매' },
  { value: '자체사용', label: '자체사용' },
  { value: '운송비', label: '운송비' },
]

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  return {
    startDate: thirtyDaysAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  }
}

export default function ProductionLogsPage() {
  const { records, loading, error, reload, updateEntry, currentUserId } = useProductionDashboard()
  const { startDate, endDate, setStartDate, setEndDate } = useStateFilterDates()
  const [selectedType, setSelectedType] = useState<ProductionEntryType | ''>('')
  const [editingEntry, setEditingEntry] = useState<ProductionRecentEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<ProductionRecentEntry | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    if (!records?.recentEntries) return []

    return records.recentEntries.filter(entry => {
      const entryDate = entry.workDate

      const withinDateRange =
        (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate)

      const matchesType = !selectedType || entry.type === selectedType

      return withinDateRange && matchesType
    })
  }, [records?.recentEntries, startDate, endDate, selectedType])

  const handleEdit = useCallback((entry: ProductionRecentEntry) => {
    setEditingEntry(entry)
    setActionError(null)
  }, [])

  const handleDelete = useCallback((entry: ProductionRecentEntry) => {
    setDeletingEntry(entry)
    setConfirmDeleteId(entry.id)
    setActionError(null)
  }, [])

  const handleSave = useCallback(async (_id: string, input: ProductionEntryUpdateInput) => {
    try {
      const result = await updateEntry(_id, input)
      await reload()
      return result
    } catch (err) {
      throw err
    }
  }, [updateEntry, reload])

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingEntry) return
    try {
      await deleteProductionEntry(createClient(), deletingEntry.id)
      setDeletingEntry(null)
      setConfirmDeleteId(null)
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      setConfirmDeleteId(null)
    }
  }, [deletingEntry, reload])

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
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 내역</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산관리 입력 내역을 확인합니다. 필터 조건으로 기간과 구분을 선택하여 검색할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-text)]">조회 조건</h2>
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
            {filteredEntries.length}건
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClassName}>
            기간
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                className={fieldClassName}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className={fieldClassName}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </label>

          <label className={labelClassName}>
            구분
            <select
              className={fieldClassName}
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as ProductionEntryType | '')}
            >
              {PRODUCTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <ProductionRecentEntries
        entries={filteredEntries}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {editingEntry && records && currentUserId && (
        <ProductionEntryEditModal
          entry={editingEntry}
          sites={records.sites}
          products={records.products}
          currentUserId={currentUserId}
          onSave={handleSave}
          onDelete={async (id) => {
            setEditingEntry(null)
            await deleteProductionEntry(createClient(), id)
            await reload()
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {deletingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setDeletingEntry(null); setConfirmDeleteId(null) } }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[var(--color-text)]">삭제 확인</h3>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              다음 내역을 삭제하시겠습니까?<br />
              <span className="font-semibold text-[var(--color-text)]">{deletingEntry.productName}</span> ({deletingEntry.workDate})
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => { setDeletingEntry(null); setConfirmDeleteId(null) }}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)]"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function useStateFilterDates() {
  const [dates] = useState(getDefaultDateRange)
  const [startDate, setStartDate] = useState(dates.startDate)
  const [endDate, setEndDate] = useState(dates.endDate)
  return { startDate, endDate, setStartDate, setEndDate }
}
