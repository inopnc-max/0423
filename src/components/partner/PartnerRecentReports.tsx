'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileCheck2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/routes'
import {
  getPartnerDocumentStatusLabel,
  isPartnerReportDocument,
} from '@/lib/documents/partnerDocuments'

interface PartnerReportRow {
  id: string
  site_id: string | null
  title: string
  category: string | null
  source_type: string | null
  approval_status: string | null
  locked_at: string | null
  created_at: string
}

export function PartnerRecentReports({ siteId }: { siteId?: string | null }) {
  const [reports, setReports] = useState<PartnerReportRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      try {
        let query = createClient()
          .from('documents')
          .select('id, site_id, title, category, source_type, approval_status, locked_at, created_at')
          .or('approval_status.eq.approved,locked_at.not.is.null')
          .order('created_at', { ascending: false })
          .limit(12)

        if (siteId) {
          query = query.eq('site_id', siteId)
        }

        const { data } = await query
        if (!cancelled) {
          setReports(((data as PartnerReportRow[] | null) ?? []).filter(isPartnerReportDocument).slice(0, 3))
        }
      } catch {
        if (!cancelled) setReports([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReports()
    return () => {
      cancelled = true
    }
  }, [siteId])

  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm text-[var(--color-text-secondary)]">보고서를 확인하는 중입니다.</div>
      </section>
    )
  }

  if (reports.length === 0) return null

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[var(--color-navy)]">최근 보고서</h2>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">승인완료 또는 최종본만 표시됩니다.</p>
        </div>
        <Link href={ROUTES.documents} className="text-sm font-semibold text-[var(--color-accent)]">
          전체
        </Link>
      </div>

      <div className="space-y-2">
        {reports.map(report => (
          <Link
            key={report.id}
            href={ROUTES.documents}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-3 transition hover:border-[var(--color-accent)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)]">
              <FileCheck2 className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{report.title}</span>
              <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                {[report.category, getPartnerDocumentStatusLabel(report)].filter(Boolean).join(' · ')}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
