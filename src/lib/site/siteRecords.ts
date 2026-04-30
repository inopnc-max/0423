import { createClient } from '@/lib/supabase/client'

export type ApprovedDailyLogRow = {
  id: string
  site_id?: string | null
  work_date?: string | null
  status?: string | null
  worker_array?: unknown
  task_tags?: unknown
  material_items?: unknown
  media_info?: unknown
  site_info?: unknown
  approved_at?: string | null
  approved_by?: string | null
  created_at?: string | null
}

export type IssueReportRow = Record<string, unknown> & {
  id?: string
  site_id?: string | null
  title?: string | null
  report_title?: string | null
  subject?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export const APPROVED_DAILY_LOG_STATUSES = ['approved', 'locked', 'final'] as const
export const VISIBLE_ISSUE_REPORT_STATUSES = ['approved', 'shared', 'closed'] as const

export async function loadApprovedDailyLogs(siteId: string): Promise<ApprovedDailyLogRow[]> {
  try {
    const { data, error } = await createClient()
      .from('daily_logs')
      .select('*')
      .eq('site_id', siteId)
      .in('status', [...APPROVED_DAILY_LOG_STATUSES])
      .order('work_date', { ascending: false })
      .limit(10)

    if (error) return []
    return (data as ApprovedDailyLogRow[] | null) ?? []
  } catch {
    return []
  }
}

export async function loadIssueReports(siteId: string): Promise<IssueReportRow[]> {
  try {
    const { data, error } = await createClient()
      .from('issue_reports')
      .select('*')
      .eq('site_id', siteId)
      .in('status', [...VISIBLE_ISSUE_REPORT_STATUSES])
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) return []
    return (data as IssueReportRow[] | null) ?? []
  } catch {
    return []
  }
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function summarizeDailyLogTasks(value: unknown) {
  const tasks = asArray(value)
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        return typeof record.name === 'string'
          ? record.name
          : typeof record.summaryText === 'string'
            ? record.summaryText
            : ''
      }
      return ''
    })
    .filter(Boolean)

  return tasks.slice(0, 3).join(', ') || '작업내용 없음'
}

export function countDailyLogMedia(mediaInfo: unknown) {
  if (!mediaInfo || typeof mediaInfo !== 'object') return { photos: 0, documents: 0 }
  const record = mediaInfo as Record<string, unknown>
  const attachments = asArray(record.attachments)
  return attachments.reduce<{ photos: number; documents: number }>(
    (acc, item) => {
      if (!item || typeof item !== 'object') return acc
      const kind = (item as Record<string, unknown>).kind
      if (kind === 'photo') acc.photos += 1
      else acc.documents += 1
      return acc
    },
    { photos: 0, documents: 0 }
  )
}

export function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

export function getIssueReportTitle(row: IssueReportRow) {
  return textValue(row.title, textValue(row.report_title, textValue(row.subject, '조치보고서')))
}

export function getIssueReportPhotoCount(row: IssueReportRow) {
  const direct = Number(row.photo_count ?? row.photos_count ?? row.attachment_count)
  if (Number.isFinite(direct) && direct > 0) return direct
  const photos = row.photos ?? row.attachments ?? row.items
  return Array.isArray(photos) ? photos.length : 0
}

