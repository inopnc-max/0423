'use client'

import { useMemo, useState } from 'react'
import { Database, Save } from 'lucide-react'
import type { ProductionReferenceOption } from '@/lib/production/productionRecords'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] focus:ring-2 focus:ring-[var(--active-role-color)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

export function ProductionEntryDraftForm({
  sites,
  products,
  clients,
}: {
  sites: ProductionReferenceOption[]
  products: ProductionReferenceOption[]
  clients: ProductionReferenceOption[]
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [entryType, setEntryType] = useState('생산')

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
        <h2 className="text-base font-semibold text-[var(--color-text)]">생산 입력 준비</h2>
      </div>

      <form className="mt-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClassName}>
            작업일
            <input type="date" className={fieldClassName} defaultValue={today} />
          </label>

          <label className={labelClassName}>
            구분
            <select className={fieldClassName} value={entryType} onChange={event => setEntryType(event.target.value)}>
              <option value="생산">생산</option>
              <option value="판매">판매</option>
              <option value="자체사용">자체사용</option>
              <option value="운송비">운송비</option>
            </select>
          </label>

          <label className={labelClassName}>
            현장
            <select className={fieldClassName} defaultValue="">
              <option value="">현장 선택</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </label>

          {entryType === '판매' ? (
            <label className={labelClassName}>
              거래처
              <select className={fieldClassName} defaultValue="">
                <option value="">거래처 선택</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className={labelClassName}>
              품목
              <select className={fieldClassName} defaultValue="">
                <option value="">품목 선택</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className={labelClassName}>
            수량
            <input type="number" className={fieldClassName} placeholder="0" min="0" defaultValue="" />
          </label>

          <label className={labelClassName}>
            금액
            <input type="number" className={fieldClassName} placeholder="0" min="0" defaultValue="" />
          </label>
        </div>

        <label className={labelClassName}>
          메모
          <textarea
            className={`${fieldClassName} min-h-28 resize-y`}
            placeholder="작업 메모, 비고, 특이사항을 정리합니다."
            defaultValue=""
          />
        </label>
      </form>

      <div className="mt-5 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            이번 보강은 입력 UX 구조 정리 범위입니다. 저장 연결은 기존 RLS와 production 테이블 정책 검증 후 별도 PR에서 진행합니다.
          </p>
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white opacity-60 md:w-auto"
          >
            <Save className="h-4 w-4" strokeWidth={1.9} />
            저장 준비 중
          </button>
        </div>
      </div>
    </section>
  )
}
