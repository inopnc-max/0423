'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Save, Trash2, Loader2 } from 'lucide-react'
import type {
  ProductionReferenceOption,
  ProductionEntryUpdateInput,
  ProductionRecentEntry,
} from '@/lib/production/productionRecords'
import type { ProductionEntryType } from '@/lib/production/productionRecords'

const fieldClassName =
  'w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] focus:ring-2 focus:ring-[var(--active-role-color)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

interface FormValues {
  workDate: string
  entryType: ProductionEntryType
  siteId: string
  productId: string
  quantity: string
  amount: string
  memo: string
}

interface ProductionEntryEditModalProps {
  entry: ProductionRecentEntry
  sites: ProductionReferenceOption[]
  products: ProductionReferenceOption[]
  currentUserId: string
  onSave: (id: string, input: ProductionEntryUpdateInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export function ProductionEntryEditModal({
  entry,
  sites,
  products,
  currentUserId,
  onSave,
  onDelete,
  onClose,
}: ProductionEntryEditModalProps) {
  const [values, setValues] = useState<FormValues>({
    workDate: entry.workDate,
    entryType: entry.type as ProductionEntryType,
    siteId: '',
    productId: '',
    quantity: String(entry.quantity),
    amount: String(entry.amount),
    memo: entry.memo ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const matchedSite = sites.find(s => s.name === entry.siteName)
    if (matchedSite) {
      setValues(prev => ({ ...prev, siteId: matchedSite.id }))
    }
  }, [sites, entry.siteName])

  useEffect(() => {
    const matchedProduct = products.find(p => p.name === entry.productName)
    if (matchedProduct) {
      setValues(prev => ({ ...prev, productId: matchedProduct.id }))
    }
  }, [products, entry.productName])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleChange = useCallback((field: keyof FormValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setSaveError(null)
    setDeleteError(null)
  }, [])

  const validate = useCallback((): string | null => {
    if (!values.workDate) return '작업일을 선택해주세요.'
    if (!values.entryType) return '구분을 선택해주세요.'
    if (values.entryType !== '운송비' && !values.productId) return '품목을 선택해주세요.'
    const qty = Number(values.quantity)
    if (!values.quantity || isNaN(qty) || qty <= 0) return '수량은 0보다 큰 숫자로 입력해주세요.'
    return null
  }, [values])

  const handleSave = useCallback(async () => {
    setSaveError(null)

    const validationError = validate()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)

    try {
      const selectedProduct = products.find(p => p.id === values.productId)

      const input: ProductionEntryUpdateInput = {
        workDate: values.workDate,
        productionType: values.entryType,
        productId: selectedProduct?.id ?? null,
        productName: selectedProduct?.name ?? values.productId,
        quantity: Number(values.quantity),
        unit: entry.unit || '개',
        amount: values.amount ? Number(values.amount) : undefined,
        siteId: values.siteId || null,
        memo: values.memo || null,
        createdBy: currentUserId,
      }

      await onSave(entry.id, input)
      onClose()
    } catch (err) {
      console.error('[ProductionEntryEditModal] save failed:', err)
      setSaveError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [validate, values, products, entry, onSave, onClose, currentUserId])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setDeleteError(null)
    setDeleting(true)

    try {
      await onDelete(entry.id)
      onClose()
    } catch (err) {
      console.error('[ProductionEntryEditModal] delete failed:', err)
      setDeleteError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }, [confirmDelete, entry.id, onDelete, onClose])

  const selectedProducts = useMemo(() => {
    if (values.entryType !== '판매') return products
    return products
  }, [values.entryType, products])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-text)]">생산 내역 수정</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
          >
            <X className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClassName}>
                작업일
                <input
                  type="date"
                  className={fieldClassName}
                  value={values.workDate}
                  onChange={e => handleChange('workDate', e.target.value)}
                />
              </label>

              <label className={labelClassName}>
                구분
                <select
                  className={fieldClassName}
                  value={values.entryType}
                  onChange={e => {
                    handleChange('entryType', e.target.value as ProductionEntryType)
                    handleChange('productId', '')
                  }}
                >
                  <option value="생산">생산</option>
                  <option value="판매">판매</option>
                  <option value="자체사용">자체사용</option>
                  <option value="운송비">운송비</option>
                </select>
              </label>

              <label className={labelClassName}>
                현장
                <select
                  className={fieldClassName}
                  value={values.siteId}
                  onChange={e => handleChange('siteId', e.target.value)}
                >
                  <option value="">현장 선택</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </label>

              <label className={labelClassName}>
                {values.entryType === '판매' ? '거래처' : '품목'}
                {values.entryType === '판매' ? (
                  <input
                    type="text"
                    className={fieldClassName}
                    placeholder="거래처명을 입력해주세요"
                    value={values.productId}
                    onChange={e => handleChange('productId', e.target.value)}
                  />
                ) : (
                  <select
                    className={fieldClassName}
                    value={values.productId}
                    onChange={e => handleChange('productId', e.target.value)}
                  >
                    <option value="">품목 선택</option>
                    {selectedProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </label>

              <label className={labelClassName}>
                수량
                <input
                  type="number"
                  className={fieldClassName}
                  placeholder="0"
                  min="0"
                  value={values.quantity}
                  onChange={e => handleChange('quantity', e.target.value)}
                />
              </label>

              <label className={labelClassName}>
                금액
                <input
                  type="number"
                  className={fieldClassName}
                  placeholder="0"
                  min="0"
                  value={values.amount}
                  onChange={e => handleChange('amount', e.target.value)}
                />
              </label>
            </div>

            <label className={labelClassName}>
              메모
              <textarea
                className={`${fieldClassName} min-h-24 resize-y`}
                placeholder="작업 메모, 비고, 특이사항을 정리합니다."
                value={values.memo}
                onChange={e => handleChange('memo', e.target.value)}
              />
            </label>
          </div>

          {(saveError || deleteError) && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{saveError || deleteError}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60'
                : 'border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60'
            }`}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                삭제 중...
              </>
            ) : confirmDelete ? (
              <>
                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                삭제 확인
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                삭제
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" strokeWidth={1.9} />
                  저장
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
