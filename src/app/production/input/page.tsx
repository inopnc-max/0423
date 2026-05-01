'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Database, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  loadProducts,
  loadSites,
  saveProductionEntry,
  PRODUCTION_TYPE_OPTIONS,
  type ProductionType,
} from '@/lib/production-management'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] focus:ring-2 focus:ring-[var(--active-role-color)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-secondary)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

interface FormState {
  workDate: string
  siteId: string
  productionType: ProductionType
  productId: string
  productName: string
  quantity: string
  unit: string
  unitPrice: string
  amount: string
  notes: string
}

const INITIAL_FORM: FormState = {
  workDate: new Date().toISOString().slice(0, 10),
  siteId: '',
  productionType: '생산',
  productId: '',
  productName: '',
  quantity: '',
  unit: 'EA',
  unitPrice: '0',
  amount: '',
  notes: '',
}

export default function ProductionInputPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [products, setProducts] = useState<Array<{ id: string; name: string; code: string; unit: string; unitPrice: number }>>([])
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [loadedProducts, loadedSites] = await Promise.all([
          loadProducts(),
          loadSites(),
        ])
        setProducts(loadedProducts)
        setSites(loadedSites)
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [])

  const handleProductChange = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setForm(prev => ({
        ...prev,
        productId,
        productName: product.name,
        unit: product.unit,
        unitPrice: product.unitPrice.toString(),
      }))
    }
  }, [products])

  const calculateAmount = useCallback((quantity: string, unitPrice: string) => {
    const qty = parseFloat(quantity) || 0
    const price = parseFloat(unitPrice) || 0
    return (qty * price).toString()
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!form.productName) {
      setMessage({ type: 'error', text: '품목을 선택해주세요.' })
      return
    }

    if (!form.quantity || parseFloat(form.quantity) <= 0) {
      setMessage({ type: 'error', text: '수량을 입력해주세요.' })
      return
    }

    const amount = parseFloat(form.amount) || 0

    setSaving(true)
    try {
      const result = await saveProductionEntry({
        productName: form.productName,
        productionType: form.productionType,
        quantity: parseFloat(form.quantity),
        workDate: form.workDate,
        unit: form.unit,
        amount,
        siteId: form.siteId || null,
        notes: form.notes,
      })

      if (result.ok) {
        setMessage({ type: 'success', text: result.message })
        setForm(prev => ({ ...prev, quantity: '', amount: '', notes: '' }))
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } finally {
      setSaving(false)
    }
  }, [form])

  useEffect(() => {
    const amt = calculateAmount(form.quantity, form.unitPrice)
    if (amt !== form.amount) {
      setForm(prev => ({ ...prev, amount: amt }))
    }
  }, [form.quantity, form.unitPrice, calculateAmount, form.amount])

  const showMessage = message && (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
      message.type === 'success'
        ? 'bg-green-50 text-green-700'
        : 'bg-red-50 text-red-700'
    }`}>
      {message.type === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />
      }
      <span>{message.text}</span>
    </div>
  )

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <ClipboardList className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Input
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 입력</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산, 판매, 자체사용, 운송비 내역을 입력하는 화면입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
          <h2 className="text-base font-semibold text-[var(--color-text)]">생산 입력 폼</h2>
        </div>

        {showMessage}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClassName}>
              작업일
              <input
                type="date"
                className={fieldClassName}
                value={form.workDate}
                onChange={e => setForm(prev => ({ ...prev, workDate: e.target.value }))}
              />
            </label>

            <label className={labelClassName}>
              현장
              <select
                className={fieldClassName}
                value={form.siteId}
                onChange={e => setForm(prev => ({ ...prev, siteId: e.target.value }))}
                disabled={loading}
              >
                <option value="">현장 선택</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </label>

            <label className={labelClassName}>
              구분
              <select
                className={fieldClassName}
                value={form.productionType}
                onChange={e => setForm(prev => ({ ...prev, productionType: e.target.value as ProductionType }))}
              >
                {PRODUCTION_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            <label className={labelClassName}>
              품목명 *
              <select
                className={fieldClassName}
                value={form.productId}
                onChange={e => handleProductChange(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">품목 선택</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClassName}>
              수량 *
              <input
                type="number"
                className={fieldClassName}
                placeholder="0"
                min="0"
                step="0.001"
                value={form.quantity}
                onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </label>

            <label className={labelClassName}>
              단위
              <input
                type="text"
                className={fieldClassName}
                value={form.unit}
                onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
              />
            </label>

            <label className={labelClassName}>
              단가
              <input
                type="number"
                className={fieldClassName}
                placeholder="0"
                min="0"
                value={form.unitPrice}
                onChange={e => setForm(prev => ({ ...prev, unitPrice: e.target.value }))}
              />
            </label>

            <label className={labelClassName}>
              금액
              <input
                type="number"
                className={`${fieldClassName} bg-[var(--color-bg)]`}
                placeholder="0"
                value={form.amount}
                readOnly
              />
            </label>
          </div>

          <label className={labelClassName}>
            메모
            <textarea
              className={`${fieldClassName} min-h-28 resize-y`}
              placeholder="작업 메모, 비고, 특이사항 등을 정리합니다."
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-navy-hover)] disabled:opacity-60 md:w-auto"
          >
            <Save className="h-4 w-4" strokeWidth={1.9} />
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>
      </section>

      {loading && (
        <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-center text-sm text-[var(--color-text-secondary)]">
          데이터를 불러오는 중...
        </section>
      )}
    </div>
  )
}
