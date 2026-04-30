'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileCheck2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const REQUIRED_DOCUMENT_TYPES = [
  '신분증',
  '통장사본',
  '기초안전교육',
  '건설근로자카드',
  '건강검진',
  '개인정보동의',
  '안전서약',
] as const

type RequiredDocumentStatus = 'missing' | 'reviewing' | 'approved' | 'rejected' | 'expired' | 'syncing'

interface RequiredDocumentRow {
  document_type?: string | null
  type?: string | null
  status?: string | null
  approval_status?: string | null
}

const STATUS_LABELS: Record<RequiredDocumentStatus, string> = {
  missing: '미제출',
  reviewing: '검토중',
  approved: '승인완료',
  rejected: '반려',
  expired: '만료',
  syncing: '동기화대기',
}

function normalizeStatus(row?: RequiredDocumentRow): RequiredDocumentStatus {
  const raw = (row?.status ?? row?.approval_status ?? '').toLowerCase()
  if (['approved', 'locked', 'final'].includes(raw)) return 'approved'
  if (['pending', 'reviewing', 'submitted'].includes(raw)) return 'reviewing'
  if (['rejected'].includes(raw)) return 'rejected'
  if (['expired'].includes(raw)) return 'expired'
  if (['syncing', 'queued'].includes(raw)) return 'syncing'
  return 'missing'
}

export function RequiredDocumentProgressCard({ userId }: { userId?: string | null }) {
  const [rows, setRows] = useState<RequiredDocumentRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function loadRows() {
      setLoading(true)
      try {
        const { data } = await createClient()
          .from('worker_required_documents')
          .select('document_type, type, status, approval_status')
          .eq('worker_id', userId)

        if (!cancelled) setRows((data as RequiredDocumentRow[] | null) ?? [])
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadRows()
    return () => {
      cancelled = true
    }
  }, [userId])

  const summary = useMemo(() => {
    const byType = new Map<string, RequiredDocumentStatus>()
    for (const type of REQUIRED_DOCUMENT_TYPES) byType.set(type, 'missing')
    for (const row of rows) {
      const type = row.document_type ?? row.type
      if (type && byType.has(type)) byType.set(type, normalizeStatus(row))
    }

    const counts = Array.from(byType.values()).reduce(
      (acc, status) => {
        acc[status] += 1
        return acc
      },
      {
        missing: 0,
        reviewing: 0,
        approved: 0,
        rejected: 0,
        expired: 0,
        syncing: 0,
      } satisfies Record<RequiredDocumentStatus, number>
    )

    return {
      byType,
      counts,
      percent: Math.round((counts.approved / REQUIRED_DOCUMENT_TYPES.length) * 100),
    }
  }, [rows])

  return (
    <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-navy)]">필수서류 진행률</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {loading ? '서류 상태를 확인하는 중입니다.' : `${summary.counts.approved}/${REQUIRED_DOCUMENT_TYPES.length}종 승인완료`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--color-navy)]">{summary.percent}%</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">완료율</div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${summary.percent}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.keys(STATUS_LABELS) as RequiredDocumentStatus[]).map(status => (
          <div key={status} className="rounded-xl bg-[var(--color-bg)] px-3 py-2">
            <div className="text-xs text-[var(--color-text-tertiary)]">{STATUS_LABELS[status]}</div>
            <div className="mt-0.5 font-semibold text-[var(--color-text)]">{summary.counts[status]}건</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from(summary.byType.entries()).map(([type, status]) => (
          <span
            key={type}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              status === 'approved'
                ? 'bg-green-50 text-green-700'
                : status === 'rejected'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
            {type}
          </span>
        ))}
      </div>
    </section>
  )
}

