'use client'

import { useCallback, useMemo, useState } from 'react'
import { Database, Save, Loader2 } from 'lucide-react'
import type { ProductionReferenceOption, ProductionEntrySaveInput } from '@/lib/production/productionRecords'
import type { ProductionEntryType } from '@/lib/production/productionRecords'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] focus:ring-2 focus:ring-[var(--active-role-color)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

interface ProductionEntryDraftFormProps {
  sites: ProductionReferenceOption[]
  products: ProductionReferenceOption[]
  clients: ProductionReferenceOption[]
  onSave: (input: ProductionEntrySaveInput) => Promise<void>
  onSaveSuccess?: () => void
}

interface FormValues {
  workDate: string
  entryType: ProductionEntryType
  siteId: string
  productName: string
  quantity: string
  amount: string
  memo: string
}

export function ProductionEntryDraftForm({
  sites,
  products,
  clients,
  onSave,
  onSaveSuccess,
}: ProductionEntryDraftFormProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [values, setValues] = useState<FormValues>({
    workDate: today,
    entryType: '생산',
    siteId: '',
    productName: '',
    quantity: '',
    amount: '',
    memo: '',
  })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleChange = useCallback((field: keyof FormValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setSaveError(null)
    setSaveSuccess(false)
  }, [])

  const validate = useCallback((): string | null => {
    if (!values.workDate) return '작업일을 선택해주세요.'
    if (!values.entryType) return '구분을 선택해주세요.'
    if (!values.productName) return '품목을 입력해주세요.'
    const qty = Number(values.quantity)
    if (!values.quantity || isNaN(qty) || qty <= 0) return '수량은 0보다 큰 숫자로 입력해주세요.'
    return null
  }, [values])

  const handleSubmit = useCallback(async () => {
    setSaveError(null)
    setSaveSuccess(false)

    const validationError = validate()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)

    try {
      const input: ProductionEntrySaveInput = {
        workDate: values.workDate,
        productionType: values.entryType,
        productName: values.productName,
        quantity: Number(values.quantity),
        unit: '개',
        amount: values.amount ? Number(values.amount) : undefined,
        siteId: values.siteId || undefined,
        memo: values.memo || undefined,
      }

      await onSave(input)

      setSaveSuccess(true)
      setValues({
        workDate: today,
        entryType: '생산',
        siteId: '',
        productName: '',
        quantity: '',
        amount: '',
        memo: '',
      })

      onSaveSuccess?.()
    } catch (err) {
      console.error('[ProductionEntryDraftForm] save failed:', err)
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [validate, values, today, onSave, onSaveSuccess])

  const selectedProducts = useMemo(() => {
    if (values.entryType !== '판매') return products
    return products
  }, [values.entryType, products])

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
        <h2 className="text-base font-semibold text-[var(--color-text)]">생산 입력</h2>
      </div>

      <div className="mt-4 space-y-4">
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
                handleChange('productName', '')
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
                value={values.productName}
                onChange={e => handleChange('productName', e.target.value)}
              />
            ) : (
              <select
                className={fieldClassName}
                value={values.productName}
                onChange={e => handleChange('productName', e.target.value)}
              >
                <option value="">품목 선택</option>
                {selectedProducts.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
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
            className={`${fieldClassName} min-h-28 resize-y`}
            placeholder="작업 메모, 비고, 특이사항을 정리합니다."
            value={values.memo}
            onChange={e => handleChange('memo', e.target.value)}
          />
        </label>
      </div>

      {(saveError || saveSuccess) && (
        <div className={`mt-4 rounded-xl p-4 ${saveSuccess ? 'border border-green-200 bg-green-50' : 'border border-red-200 bg-red-50'}`}>
          <p className={`text-sm ${saveSuccess ? 'text-green-700' : 'text-red-700'}`}>
            {saveSuccess ? '저장이 완료되었습니다.' : saveError}
          </p>
        </div>
      )}

      <div className="mt-5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
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
    </section>
  )
}
