import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role } from '@/lib/roles'

export interface AdminDashboardSummary {
  totalUsers: number
  totalSites: number
  pendingLogs: number
  draftLogs: number
  pendingPhotoSheets: number
  lockedPhotoSheets: number
  approvedDocuments: number
}

export interface AdminRoleCount {
  role: Role | string
  count: number
}

export interface AdminApprovalQueueItem {
  id: string
  type: 'worklog' | 'photo_sheet'
  title: string
  subtitle: string
  status: string
  href: string
  createdAt: string | null
}

export interface AdminDashboardRecords {
  summary: AdminDashboardSummary
  roleCounts: AdminRoleCount[]
  approvalQueue: AdminApprovalQueueItem[]
}

interface CountResponse {
  count: number | null
}

interface WorkerRoleRow {
  role?: string | null
}

interface PendingWorklogRow {
  id: string
  site_id: string
  work_date: string
  status: string | null
  created_at: string | null
  site?: { name?: string | null } | Array<{ name?: string | null }> | null
  worker?: { name?: string | null } | Array<{ name?: string | null }> | null
}

interface PendingPhotoSheetRow {
  id: string
  title: string
  site_id: string
  approval_status: string | null
  created_at: string | null
  site?: { name?: string | null } | Array<{ name?: string | null }> | null
}

function countOf(response: CountResponse): number {
  return response.count ?? 0
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function buildRoleCounts(rows: WorkerRoleRow[] | null): AdminRoleCount[] {
  const byRole = new Map<string, number>()
  for (const row of rows ?? []) {
    const role = row.role || 'unknown'
    byRole.set(role, (byRole.get(role) ?? 0) + 1)
  }

  return Array.from(byRole.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
}

function mapPendingWorklog(row: PendingWorklogRow): AdminApprovalQueueItem {
  const site = firstRelation(row.site)
  const worker = firstRelation(row.worker)

  return {
    id: row.id,
    type: 'worklog',
    title: `${site?.name ?? '현장 미지정'} 작업일지`,
    subtitle: [worker?.name ?? '작성자 미지정', row.work_date].filter(Boolean).join(' · '),
    status: row.status ?? 'pending',
    href: '/admin/worklogs',
    createdAt: row.created_at,
  }
}

function mapPendingPhotoSheet(row: PendingPhotoSheetRow): AdminApprovalQueueItem {
  const site = firstRelation(row.site)

  return {
    id: row.id,
    type: 'photo_sheet',
    title: row.title,
    subtitle: [site?.name ?? '현장 미지정', formatDate(row.created_at)].filter(Boolean).join(' · '),
    status: row.approval_status ?? 'pending',
    href: '/admin/documents',
    createdAt: row.created_at,
  }
}

export async function getAdminDashboardRecords(
  supabase: SupabaseClient
): Promise<AdminDashboardRecords> {
  const [
    usersResponse,
    sitesResponse,
    pendingLogsResponse,
    draftLogsResponse,
    pendingPhotoSheetsResponse,
    lockedPhotoSheetsResponse,
    approvedDocumentsResponse,
    roleRowsResponse,
    pendingWorklogsResponse,
    pendingPhotoSheetRowsResponse,
  ] = await Promise.all([
    supabase.from('workers').select('id', { count: 'exact', head: true }),
    supabase.from('sites').select('id', { count: 'exact', head: true }),
    supabase.from('daily_logs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('daily_logs').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('source_type', 'photo_sheet')
      .eq('approval_status', 'pending'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('source_type', 'photo_sheet')
      .not('locked_at', 'is', null),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    supabase.from('workers').select('role'),
    supabase
      .from('daily_logs')
      .select('id, site_id, work_date, status, created_at, site:sites(name), worker:workers(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('documents')
      .select('id, title, site_id, approval_status, created_at, site:sites(name)')
      .eq('source_type', 'photo_sheet')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const approvalQueue = [
    ...(((pendingWorklogsResponse.data as PendingWorklogRow[] | null) ?? []).map(mapPendingWorklog)),
    ...(((pendingPhotoSheetRowsResponse.data as PendingPhotoSheetRow[] | null) ?? []).map(mapPendingPhotoSheet)),
  ]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 6)

  return {
    summary: {
      totalUsers: countOf(usersResponse),
      totalSites: countOf(sitesResponse),
      pendingLogs: countOf(pendingLogsResponse),
      draftLogs: countOf(draftLogsResponse),
      pendingPhotoSheets: countOf(pendingPhotoSheetsResponse),
      lockedPhotoSheets: countOf(lockedPhotoSheetsResponse),
      approvedDocuments: countOf(approvedDocumentsResponse),
    },
    roleCounts: buildRoleCounts((roleRowsResponse.data as WorkerRoleRow[] | null) ?? []),
    approvalQueue,
  }
}
