import type { SupabaseClient } from '@supabase/supabase-js'
import type { DrawingMarkupMark } from '@/lib/types/drawing-markup'

export type DrawingMarkupStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'locked' | 'archived'
export type DrawingMarkupApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface DrawingMarkupRecord {
  id: string
  siteId: string
  worklogId: string | null
  attachmentId: string
  pageNo: number
  originalPath: string | null
  markedPath: string | null
  marks: DrawingMarkupMark[]
  status: DrawingMarkupStatus
  approvalStatus: DrawingMarkupApprovalStatus
  approvedBy: string | null
  approvedAt: string | null
  rejectedBy: string | null
  rejectedAt: string | null
  lockedBy: string | null
  lockedAt: string | null
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface DrawingMarkupReviewQueueItem extends DrawingMarkupRecord {
  siteName: string | null
  workDate: string | null
  requesterName: string | null
  attachmentName: string | null
}

interface DrawingMarkupRow {
  id: string
  site_id: string
  worklog_id: string | null
  attachment_id: string
  page_no: number
  original_path: string | null
  marked_path: string | null
  markup_json: unknown
  status: DrawingMarkupStatus
  approval_status: DrawingMarkupApprovalStatus
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  locked_by: string | null
  locked_at: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

interface DrawingMarkupReviewQueueRow extends DrawingMarkupRow {
  site?: { name?: string | null } | Array<{ name?: string | null }> | null
  worklog?: {
    work_date?: string | null
    media_info?: unknown
  } | Array<{
    work_date?: string | null
    media_info?: unknown
  }> | null
  creator?: { name?: string | null } | Array<{ name?: string | null }> | null
}

export interface DrawingMarkupSourceKey {
  siteId: string
  worklogId?: string | null
  attachmentId: string
  pageNo?: number
}

export interface SaveDrawingMarkupDraftInput extends DrawingMarkupSourceKey {
  marks: DrawingMarkupMark[]
  originalPath?: string | null
  createdBy: string
}

export interface SubmitDrawingMarkupForReviewInput {
  id: string
}

export interface ListDrawingMarkupReviewQueueInput {
  status?: DrawingMarkupStatus
  approvalStatus?: DrawingMarkupApprovalStatus
  siteId?: string | null
  limit?: number
}

const DRAWING_MARKUP_SELECT = `
  id,
  site_id,
  worklog_id,
  attachment_id,
  page_no,
  original_path,
  marked_path,
  markup_json,
  status,
  approval_status,
  approved_by,
  approved_at,
  rejected_by,
  rejected_at,
  locked_by,
  locked_at,
  created_by,
  updated_by,
  created_at,
  updated_at
`

const DRAWING_MARKUP_REVIEW_QUEUE_SELECT = `
  ${DRAWING_MARKUP_SELECT},
  site:sites!drawing_markups_site_id_fkey(name),
  worklog:daily_logs!drawing_markups_worklog_id_fkey(work_date, media_info),
  creator:workers!drawing_markups_created_by_fkey(name)
`

function normalizePageNo(pageNo?: number): number {
  return Math.max(1, Math.trunc(pageNo ?? 1))
}

function normalizeMarks(value: unknown): DrawingMarkupMark[] {
  return Array.isArray(value) ? (value as DrawingMarkupMark[]) : []
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function getAttachmentName(mediaInfo: unknown, attachmentId: string): string | null {
  if (!mediaInfo || typeof mediaInfo !== 'object') return null

  const attachments = (mediaInfo as { attachments?: unknown }).attachments
  if (!Array.isArray(attachments)) return null

  const match = attachments.find(item => {
    if (!item || typeof item !== 'object') return false
    return (item as { id?: unknown }).id === attachmentId
  })

  if (!match || typeof match !== 'object') return null

  const name = (match as { name?: unknown; fileName?: unknown }).name
    ?? (match as { fileName?: unknown }).fileName

  return typeof name === 'string' && name.trim() ? name : null
}

function toDrawingMarkupRecord(row: DrawingMarkupRow): DrawingMarkupRecord {
  return {
    id: row.id,
    siteId: row.site_id,
    worklogId: row.worklog_id,
    attachmentId: row.attachment_id,
    pageNo: row.page_no,
    originalPath: row.original_path,
    markedPath: row.marked_path,
    marks: normalizeMarks(row.markup_json),
    status: row.status,
    approvalStatus: row.approval_status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    lockedBy: row.locked_by,
    lockedAt: row.locked_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDrawingMarkupReviewQueueItem(row: DrawingMarkupReviewQueueRow): DrawingMarkupReviewQueueItem {
  const site = firstRelation(row.site)
  const worklog = firstRelation(row.worklog)
  const creator = firstRelation(row.creator)

  return {
    ...toDrawingMarkupRecord(row),
    siteName: site?.name ?? null,
    workDate: worklog?.work_date ?? null,
    requesterName: creator?.name ?? null,
    attachmentName: getAttachmentName(worklog?.media_info, row.attachment_id),
  }
}

function assertEditable(record: DrawingMarkupRecord): void {
  if (record.lockedAt || record.status === 'locked') {
    throw new Error('Locked drawing markup cannot be modified')
  }
  if (record.approvalStatus === 'pending' || record.status === 'pending') {
    throw new Error('Pending drawing markup cannot be modified by draft save')
  }
  if (record.approvalStatus === 'approved' || record.status === 'approved') {
    throw new Error('Approved drawing markup cannot be modified by draft save')
  }
}

export async function getDrawingMarkupBySource(
  supabase: SupabaseClient,
  source: DrawingMarkupSourceKey
): Promise<DrawingMarkupRecord | null> {
  let query = supabase
    .from('drawing_markups')
    .select(DRAWING_MARKUP_SELECT)
    .eq('site_id', source.siteId)
    .eq('attachment_id', source.attachmentId)
    .eq('page_no', normalizePageNo(source.pageNo))
    .neq('status', 'archived')
    .limit(1)

  query = source.worklogId ? query.eq('worklog_id', source.worklogId) : query.is('worklog_id', null)

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? toDrawingMarkupRecord(data as DrawingMarkupRow) : null
}

export async function listDrawingMarkupsByWorklog(
  supabase: SupabaseClient,
  input: { siteId: string; worklogId: string }
): Promise<DrawingMarkupRecord[]> {
  const { data, error } = await supabase
    .from('drawing_markups')
    .select(DRAWING_MARKUP_SELECT)
    .eq('site_id', input.siteId)
    .eq('worklog_id', input.worklogId)
    .neq('status', 'archived')
    .order('page_no', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(row => toDrawingMarkupRecord(row as DrawingMarkupRow))
}

export async function listDrawingMarkupReviewQueue(
  supabase: SupabaseClient,
  input: ListDrawingMarkupReviewQueueInput = {}
): Promise<DrawingMarkupReviewQueueItem[]> {
  let query = supabase
    .from('drawing_markups')
    .select(DRAWING_MARKUP_REVIEW_QUEUE_SELECT)
    .eq('status', input.status ?? 'pending')
    .eq('approval_status', input.approvalStatus ?? 'pending')
    .order('updated_at', { ascending: false })
    .limit(input.limit ?? 50)

  if (input.siteId) {
    query = query.eq('site_id', input.siteId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(row => toDrawingMarkupReviewQueueItem(row as DrawingMarkupReviewQueueRow))
}

export async function saveDrawingMarkupDraft(
  supabase: SupabaseClient,
  input: SaveDrawingMarkupDraftInput
): Promise<DrawingMarkupRecord> {
  const existing = await getDrawingMarkupBySource(supabase, input)

  if (existing) {
    assertEditable(existing)
    if (existing.createdBy !== input.createdBy) {
      throw new Error('Only the draft creator can update this drawing markup draft')
    }

    const { data, error } = await supabase
      .from('drawing_markups')
      .update({
        markup_json: input.marks,
        original_path: input.originalPath ?? existing.originalPath,
        status: 'draft',
        approval_status: 'draft',
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        locked_by: null,
        locked_at: null,
      })
      .eq('id', existing.id)
      .select(DRAWING_MARKUP_SELECT)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return toDrawingMarkupRecord(data as DrawingMarkupRow)
  }

  const { data, error } = await supabase
    .from('drawing_markups')
    .insert({
      site_id: input.siteId,
      worklog_id: input.worklogId ?? null,
      attachment_id: input.attachmentId,
      page_no: normalizePageNo(input.pageNo),
      original_path: input.originalPath ?? null,
      markup_json: input.marks,
      status: 'draft',
      approval_status: 'draft',
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select(DRAWING_MARKUP_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toDrawingMarkupRecord(data as DrawingMarkupRow)
}

export async function submitDrawingMarkupForReview(
  supabase: SupabaseClient,
  input: SubmitDrawingMarkupForReviewInput
): Promise<DrawingMarkupRecord> {
  const { data: current, error: loadError } = await supabase
    .from('drawing_markups')
    .select(DRAWING_MARKUP_SELECT)
    .eq('id', input.id)
    .single()

  if (loadError) {
    throw new Error(loadError.message)
  }

  const currentRecord = toDrawingMarkupRecord(current as DrawingMarkupRow)
  assertEditable(currentRecord)

  const { data, error } = await supabase
    .from('drawing_markups')
    .update({
      status: 'pending',
      approval_status: 'pending',
    })
    .eq('id', input.id)
    .select(DRAWING_MARKUP_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toDrawingMarkupRecord(data as DrawingMarkupRow)
}
