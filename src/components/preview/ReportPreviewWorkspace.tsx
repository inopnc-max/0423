'use client'

import { type ReportPreviewKind, type ReportPreviewStatus } from './reports/report-preview-types'

interface ReportPreviewWorkspaceProps {
  /** Type of report being previewed */
  kind: ReportPreviewKind
  /** Display title for the report */
  title: string
  /** Site name (optional, shown in meta strip) */
  siteName?: string
  /** Site ID (optional, shown in meta strip) */
  siteId?: string
  /** Work date (optional, shown in meta strip) */
  workDate?: string
  /** Report status (shown as badge) */
  status?: ReportPreviewStatus
  /** Child components to render as the report content */
  children: React.ReactNode
}

/**
 * ReportPreviewWorkspace - common layout wrapper for report previews inside PreviewCenter.
 *
 * Provides:
 * - Top meta strip with kind, site info, work date, status badge
 * - Dark background area for the viewer
 * - Centered paper/content area
 * - Responsive: mobile = full width, web = max-w-[794px] centered
 *
 * Note: This component does NOT wrap PreviewCenter. It is used as a child
 * of PreviewCenter to provide consistent report layout.
 */
export function ReportPreviewWorkspace({
  kind,
  title,
  siteName,
  siteId,
  workDate,
  status,
  children,
}: ReportPreviewWorkspaceProps) {
  const statusConfig: Record<ReportPreviewStatus, { label: string; className: string }> = {
    draft: { label: '임시저장', className: 'bg-slate-100 text-slate-600' },
    pending: { label: '승인 대기', className: 'bg-yellow-50 text-yellow-700' },
    approved: { label: '승인', className: 'bg-green-50 text-green-700' },
    locked: { label: '잠김', className: 'bg-red-50 text-red-700' },
    rejected: { label: '반려', className: 'bg-red-50 text-red-700' },
  }

  const kindLabels: Record<ReportPreviewKind, string> = {
    photo_sheet: '사진대지',
    drawing_markup: '도면 마킹',
    issue_report: '이상보고서',
    worklog_report: '작업일지',
    salary_statement: '급여명세서',
    confirm_sheet: '확인서',
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Meta strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm">
        {/* Report kind badge */}
        <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-navy-light)]">
          {kindLabels[kind] ?? kind}
        </span>

        {/* Title */}
        {title && (
          <span className="font-medium text-[var(--color-text-primary)]">{title}</span>
        )}

        {/* Site info */}
        {siteName && (
          <span className="text-[var(--color-text-secondary)]">{siteName}</span>
        )}
        {siteId && (
          <span className="text-xs text-[var(--color-text-tertiary)]">ID: {siteId}</span>
        )}

        {/* Work date */}
        {workDate && (
          <span className="text-[var(--color-text-secondary)]">{workDate}</span>
        )}

        {/* Status badge */}
        {status && statusConfig[status] && (
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig[status].className}`}>
            {statusConfig[status].label}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  )
}
