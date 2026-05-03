'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, Plus, Pencil, ToggleLeft, ToggleRight, Loader2, X } from 'lucide-react'
import {
  getProducts,
  createProduct,
  updateProduct,
  toggleProductActive,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/lib/production/productManagement'
import { createClient } from '@/lib/supabase/client'

const fieldClassName =
  'w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] focus:ring-2 focus:ring-[var(--active-role-color)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

type Tab = 'active' | 'inactive'

interface FormValues {
  name: string
  unit: string
  category: string
  unit_price: string
}

interface ProductModalProps {
  product?: Product | null
  onSave: (input: CreateProductInput | UpdateProductInput) => Promise<void>
  onClose: () => void
}

function ProductModal({ product, onSave, onClose }: ProductModalProps) {
  const isEdit = Boolean(product)

  const [values, setValues] = useState<FormValues>({
    name: product?.name ?? '',
    unit: product?.unit ?? 'EA',
    category: product?.category ?? '',
    unit_price: String(product?.unit_price ?? 0),
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleChange = useCallback((field: keyof FormValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!values.name.trim()) {
      setError('품목명을 입력해주세요.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const input: CreateProductInput | UpdateProductInput = {
        name: values.name.trim(),
        unit: values.unit,
        category: values.category || undefined,
        unit_price: Number(values.unit_price) || 0,
      }

      if (isEdit && product) {
        await updateProduct(createClient(), product.id, input)
      } else {
        await createProduct(createClient(), input as CreateProductInput)
      }

      await onSave(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [values, isEdit, product, onSave, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            {isEdit ? '품목 수정' : '품목 추가'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
          >
            <X className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          <div className="space-y-4">
            <label className={labelClassName}>
              품목명 <span className="text-red-500">*</span>
              <input
                type="text"
                className={fieldClassName}
                value={values.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="예: NPC-5000"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClassName}>
                단위
                <select
                  className={fieldClassName}
                  value={values.unit}
                  onChange={e => handleChange('unit', e.target.value)}
                >
                  <option value="EA">EA</option>
                  <option value="개">개</option>
                  <option value="BOX">BOX</option>
                  <option value="SET">SET</option>
                  <option value="KG">KG</option>
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="M2">M2</option>
                  <option value="M3">M3</option>
                </select>
              </label>

              <label className={labelClassName}>
                단가
                <input
                  type="number"
                  className={fieldClassName}
                  value={values.unit_price}
                  onChange={e => handleChange('unit_price', e.target.value)}
                  min="0"
                />
              </label>
            </div>

            <label className={labelClassName}>
              카테고리
              <input
                type="text"
                className={fieldClassName}
                value={values.category}
                onChange={e => handleChange('category', e.target.value)}
                placeholder="예: 생산품, 자재"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                저장 중...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" strokeWidth={1.9} />
                저장
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ProductRowProps {
  product: Product
  onEdit: (product: Product) => void
  onToggle: (product: Product) => void
  toggling: boolean
}

function ProductRow({ product, onEdit, onToggle, toggling }: ProductRowProps) {
  return (
    <tr className="border-b border-[var(--color-border)] last:border-b-0">
      <td className="px-4 py-3 text-sm text-[var(--color-text)]">{product.code}</td>
      <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">{product.name}</td>
      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{product.category ?? '-'}</td>
      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{product.unit}</td>
      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        {product.unit_price > 0 ? product.unit_price.toLocaleString() : '-'}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(product)}
          disabled={toggling}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            product.active
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {product.active ? (
            <>
              <ToggleRight className="h-4 w-4" strokeWidth={1.9} />
              활성
            </>
          ) : (
            <>
              <ToggleLeft className="h-4 w-4" strokeWidth={1.9} />
              비활성
            </>
          )}
        </button>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onEdit(product)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)]"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
          수정
        </button>
      </td>
    </tr>
  )
}

export default function ProductionProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('active')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts(createClient())
      setProducts(data)
    } catch (err) {
      setError('품목을 불러오지 못했습니다.')
      console.error('[ProductionProductsPage] loadProducts failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const handleAdd = useCallback(() => {
    setEditingProduct(null)
    setShowModal(true)
  }, [])

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product)
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setEditingProduct(null)
  }, [])

  const handleSave = useCallback(async () => {
    await loadProducts()
  }, [loadProducts])

  const handleToggle = useCallback(async (product: Product) => {
    setTogglingId(product.id)
    try {
      await toggleProductActive(createClient(), product.id, !product.active)
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.')
    } finally {
      setTogglingId(null)
    }
  }, [loadProducts])

  const activeProducts = products.filter(p => p.active)
  const inactiveProducts = products.filter(p => !p.active)
  const displayProducts = tab === 'active' ? activeProducts : inactiveProducts

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <Package className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Master
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">품목 관리</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산관리에 사용할 품목 마스터를 관리합니다. 품목을 추가, 수정, 활성화/비활성화할 수 있습니다.
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
            <button
              onClick={() => setTab('active')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'active'
                  ? 'bg-white text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              활성 ({activeProducts.length})
            </button>
            <button
              onClick={() => setTab('inactive')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'inactive'
                  ? 'bg-white text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              비활성 ({inactiveProducts.length})
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={1.9} />
            품목 추가
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {tab === 'active' ? '활성화된 품목이 없습니다.' : '비활성화된 품목이 없습니다.'}
            </p>
            {tab === 'active' && (
              <button
                onClick={handleAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)]"
              >
                <Plus className="h-4 w-4" strokeWidth={1.9} />
                품목 추가
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    코드
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    품목명
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    카테고리
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    단위
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    단가
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    toggling={togglingId === product.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
