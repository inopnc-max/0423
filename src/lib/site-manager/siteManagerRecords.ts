import { createClient } from '@/lib/supabase/client'

export type SiteManagerWorklogStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type SiteManagerLog = {
  id: string
  siteId: string
  siteName: string
  workDate: string
  userId: string
  workerName: string
  status: SiteManagerWorklogStatus
  workerCount: number
  totalManDay: number
  rejectionReason: string | null
  createdAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
}

export type SiteManagerWorker = {
  id: string
  name: string
  email: string
  company: string
  phone: string | null
  role: string
  siteIds: string[]
  todayStatus: SiteManagerWorklogStatus | 'missing'
  todayManDay: number
  hasRejectedLog: boolean
}

export type SiteManagerSummary = {
  draft: number
  pending: number
  approved: number
  rejected: number
  todayTotal: number
  todayManDay: number
  todayWorkers: number
}

type DbLogRow = {
  id: string
  site_id: string
  work_date: string
  user_id: string
  status: SiteManagerWorklogStatus
  worker_array?: unknown
  rejection_reason?: string | null
  created_at?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  site?: { name?: string | null } | Array<{ name?: string | null }> | null
  worker?: { name?: string | null } | Array<{ name?: string | null }> | null
}

type DbWorkerRow = {
  id: string
  name: string
  email: string
  company: string
  phone: string | null
  role: string
  site_ids?: string[] | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function readWorkerCount(workerArray: unknown): number {
  return Array.isArray(workerArray) ? workerArray.length : 0
}

function readManDay(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  const row = value as Record<string, unknown>
  const raw = row.count ?? row.man ?? row.manDay ?? row.man_day
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

function readTotalManDay(workerArray: unknown): number {
  if (!Array.isArray(workerArray)) return 0
  return workerArray.reduce((sum, item) => sum + readManDay(item), 0)
}

function mapLog(row: DbLogRow): SiteManagerLog {
  const site = firstRelation(row.site)
  const worker = firstRelation(row.worker)
  return {
    id: row.id,
    siteId: row.site_id,
    siteName: site?.name ?? '미지정 현장',
    workDate: row.work_date,
    userId: row.user_id,
    workerName: worker?.name ?? row.user_id.slice(0, 8),
    status: row.status,
    workerCount: readWorkerCount(row.worker_array),
    totalManDay: readTotalManDay(row.worker_array),
    rejectionReason: row.rejection_reason ?? null,
    createdAt: row.created_at ?? null,
    approvedAt: row.approved_at ?? null,
    rejectedAt: row.rejected_at ?? null,
  }
}

export function summarizeSiteManagerLogs(logs: SiteManagerLog[], today: string): SiteManagerSummary {
  const summary: SiteManagerSummary = {
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    todayTotal: 0,
    todayManDay: 0,
    todayWorkers: 0,
  }

  for (const log of logs) {
    summary[log.status] += 1
    if (log.workDate === today) {
      summary.todayTotal += 1
      summary.todayManDay += log.totalManDay
      summary.todayWorkers += log.workerCount
    }
  }

  return summary
}

export async function loadSiteManagerLogs(params: {
  siteId?: string | null
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<SiteManagerLog[]> {
  try {
    let query = createClient()
      .from('daily_logs')
      .select(`
        id, site_id, work_date, user_id, status, worker_array,
        rejection_reason, created_at, approved_at, rejected_at,
        site:sites(name),
        worker:workers(name)
      `)
      .order('work_date', { ascending: false })
      .limit(params.limit ?? 100)

    if (params.siteId) query = query.eq('site_id', params.siteId)
    if (params.startDate) query = query.gte('work_date', params.startDate)
    if (params.endDate) query = query.lte('work_date', params.endDate)

    const { data, error } = await query
    if (error || !data) return []
    return (data as DbLogRow[]).map(mapLog)
  } catch {
    return []
  }
}

export async function loadSiteManagerWorkers(params: {
  siteId?: string | null
  today: string
}): Promise<SiteManagerWorker[]> {
  try {
    const supabase = createClient()
    const [{ data: workersData }, logs] = await Promise.all([
      supabase
        .from('workers')
        .select('id, name, email, company, phone, role, site_ids')
        .eq('role', 'worker')
        .order('name')
        .limit(200),
      loadSiteManagerLogs({
        siteId: params.siteId,
        startDate: params.today,
        endDate: params.today,
        limit: 200,
      }),
    ])

    const todayByUser = new Map(logs.map(log => [log.userId, log]))
    const rows = ((workersData ?? []) as DbWorkerRow[]).filter(worker => {
      if (!params.siteId) return true
      return (worker.site_ids ?? []).includes(params.siteId)
    })

    return rows.map(worker => {
      const todayLog = todayByUser.get(worker.id)
      return {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        company: worker.company,
        phone: worker.phone,
        role: worker.role,
        siteIds: worker.site_ids ?? [],
        todayStatus: todayLog?.status ?? 'missing',
        todayManDay: todayLog?.totalManDay ?? 0,
        hasRejectedLog: logs.some(log => log.userId === worker.id && log.status === 'rejected'),
      }
    })
  } catch {
    return []
  }
}

export async function saveSiteManagerAttendance(input: {
  managerId: string
  managerName: string
  siteId: string
  siteName?: string | null
  workDate: string
  manDay: number
  memo?: string
}): Promise<{ ok: boolean; message: string }> {
  try {
    if (input.manDay < 0 || input.manDay > 3.5) {
      return { ok: false, message: '공수는 0부터 3.5 사이로 입력해주세요.' }
    }

    const supabase = createClient()
    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id, status, worker_array')
      .eq('site_id', input.siteId)
      .eq('work_date', input.workDate)
      .maybeSingle()

    const workerItem = {
      id: input.managerId,
      name: input.managerName,
      count: input.manDay,
      memo: input.memo?.trim() || undefined,
      role: 'site_manager',
    }

    if (existing?.id) {
      if (existing.status === 'approved' || existing.status === 'pending') {
        return { ok: false, message: '승인요청 또는 승인완료 일지는 출역을 수정할 수 없습니다.' }
      }

      const current = Array.isArray(existing.worker_array) ? existing.worker_array : []
      const withoutMe = current.filter(item => {
        if (!item || typeof item !== 'object') return true
        const row = item as Record<string, unknown>
        return row.id !== input.managerId && row.name !== input.managerName
      })

      const { error } = await supabase
        .from('daily_logs')
        .update({ worker_array: [...withoutMe, workerItem] })
        .eq('id', existing.id)

      return error
        ? { ok: false, message: '내 출역 저장에 실패했습니다.' }
        : { ok: true, message: '내 출역을 저장했습니다.' }
    }

    const { error } = await supabase.from('daily_logs').insert({
      site_id: input.siteId,
      work_date: input.workDate,
      user_id: input.managerId,
      site_info: { name: input.siteName ?? '' },
      worker_array: [workerItem],
      task_tags: [],
      material_items: [],
      media_info: {},
      status: 'draft',
    })

    return error
      ? { ok: false, message: '내 출역 저장에 실패했습니다.' }
      : { ok: true, message: '내 출역을 저장했습니다.' }
  } catch {
    return { ok: false, message: '내 출역 저장 중 오류가 발생했습니다.' }
  }
}

export async function approveSiteManagerLog(input: {
  logId: string
  managerId: string
}): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await createClient()
      .from('daily_logs')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: input.managerId,
      })
      .eq('id', input.logId)
      .eq('status', 'pending')

    return error
      ? { ok: false, message: '승인 처리에 실패했습니다.' }
      : { ok: true, message: '승인 처리했습니다.' }
  } catch {
    return { ok: false, message: '승인 처리 중 오류가 발생했습니다.' }
  }
}

export async function rejectSiteManagerLog(input: {
  logId: string
  workerId: string
  managerId: string
  reason: string
}): Promise<{ ok: boolean; message: string }> {
  const reason = input.reason.trim()
  if (!reason) return { ok: false, message: '반려 사유를 입력해주세요.' }

  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('daily_logs')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        rejected_by: input.managerId,
      })
      .eq('id', input.logId)
      .eq('status', 'pending')

    if (error) return { ok: false, message: '반려 처리에 실패했습니다.' }

    await supabase.from('notifications').insert({
      user_id: input.workerId,
      type: 'rejection',
      title: '일지가 반려되었습니다',
      body: reason,
      href: '/worklog',
    })

    return { ok: true, message: '반려 처리했습니다.' }
  } catch {
    return { ok: false, message: '반려 처리 중 오류가 발생했습니다.' }
  }
}
