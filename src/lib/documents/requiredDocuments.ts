import { createClient } from '@/lib/supabase/client'
import { uploadToStorage } from '@/lib/storage/storage-helper'

export const REQUIRED_DOCUMENT_TYPES = [
  '신분증',
  '통장사본',
  '기초안전교육',
  '건설근로자카드',
  '건강검진',
  '개인정보동의',
  '안전서약',
] as const

export type RequiredDocumentType = (typeof REQUIRED_DOCUMENT_TYPES)[number]
export type RequiredDocumentStatus = 'missing' | 'reviewing' | 'approved' | 'rejected' | 'expired' | 'syncing'

export type RequiredDocumentItem = {
  type: RequiredDocumentType
  status: RequiredDocumentStatus
  title?: string | null
  documentId?: string | null
  fileUrl?: string | null
  fileType?: string | null
  rejectionReason?: string | null
  submittedAt?: string | null
  approvedAt?: string | null
  expiresAt?: string | null
}
export type RequiredDocumentSummary = {
  items: RequiredDocumentItem[]
  counts: Record<RequiredDocumentStatus, number>
  percent: number
}

type RequiredDocumentDbRow = Record<string, unknown>

function normalizeStatus(row?: RequiredDocumentDbRow): RequiredDocumentStatus {
  const raw = String(row?.status ?? row?.approval_status ?? '').toLowerCase()
  if (['approved', 'locked', 'final'].includes(raw)) return 'approved'
  if (['pending', 'reviewing', 'submitted'].includes(raw)) return 'reviewing'
  if (raw === 'rejected') return 'rejected'
  if (raw === 'expired') return 'expired'
  if (['syncing', 'queued'].includes(raw)) return 'syncing'
  return 'missing'
}

function normalizeType(value: unknown): RequiredDocumentType | null {
  if (typeof value !== 'string') return null
  return REQUIRED_DOCUMENT_TYPES.find(type => type === value) ?? null
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function emptySummary(): RequiredDocumentSummary {
  const items = REQUIRED_DOCUMENT_TYPES.map<RequiredDocumentItem>(type => ({
    type,
    status: 'missing',
  }))
  return summarizeRequiredDocuments(items)
}

export function summarizeRequiredDocuments(items: RequiredDocumentItem[]): RequiredDocumentSummary {
  const counts: Record<RequiredDocumentStatus, number> = {
    missing: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    syncing: 0,
  }

  for (const item of items) counts[item.status] += 1

  return {
    items,
    counts,
    percent: Math.round((counts.approved / REQUIRED_DOCUMENT_TYPES.length) * 100),
  }
}

export async function loadRequiredDocuments(workerId: string): Promise<RequiredDocumentSummary> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('worker_required_documents')
      .select('*')
      .eq('worker_id', workerId)

    if (error || !data) return emptySummary()

    const byType = new Map<RequiredDocumentType, RequiredDocumentItem>()
    for (const type of REQUIRED_DOCUMENT_TYPES) {
      byType.set(type, { type, status: 'missing' })
    }

    for (const row of data as RequiredDocumentDbRow[]) {
      const type = normalizeType(row.document_type ?? row.type)
      if (!type) continue
      byType.set(type, {
        type,
        status: normalizeStatus(row),
        title: toText(row.title),
        documentId: toText(row.document_id),
        fileUrl: toText(row.file_url),
        fileType: toText(row.file_type),
        rejectionReason: toText(row.rejection_reason),
        submittedAt: toText(row.submitted_at ?? row.created_at),
        approvedAt: toText(row.approved_at),
        expiresAt: toText(row.expires_at),
      })
    }

    return summarizeRequiredDocuments(Array.from(byType.values()))
  } catch {
    return emptySummary()
  }
}

export type UploadRequiredDocumentInput = {
  workerId: string
  siteId: string
  documentType: RequiredDocumentType
  file: File
}

export type UploadRequiredDocumentResult = {
  ok: boolean
  message: string
}

export async function uploadRequiredDocument(input: UploadRequiredDocumentInput): Promise<UploadRequiredDocumentResult> {
  try {
    const supabase = createClient()
    const now = new Date().toISOString()
    const safeName = input.file.name.replace(/[^\w.\-가-힣]/g, '_')
    const path = `${input.workerId}/required/${input.documentType}/${Date.now()}-${safeName}`

    const uploaded = await uploadToStorage({
      supabase,
      bucket: 'documents',
      path,
      blob: input.file,
      contentType: input.file.type || 'application/octet-stream',
      upsert: false,
    })

    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        site_id: input.siteId,
        category: '안전서류',
        title: `${input.documentType} - ${input.file.name}`,
        file_type: input.file.type || 'file',
        file_size: input.file.size,
        uploaded_by: input.workerId,
        storage_bucket: 'documents',
        storage_path: uploaded.path,
        source_type: 'worker_required_document',
        approval_status: 'pending',
      })
      .select('id')
      .maybeSingle()

    if (documentError || !documentData?.id) {
      return { ok: false, message: '문서 등록 테이블 상태가 준비되지 않아 업로드를 완료하지 못했습니다.' }
    }

    await supabase.from('document_versions').insert({
      document_id: documentData.id,
      version_no: 1,
      storage_bucket: 'documents',
      storage_path: uploaded.path,
      created_by: input.workerId,
      created_at: now,
    })

    await supabase.from('worker_required_documents').upsert({
      worker_id: input.workerId,
      site_id: input.siteId,
      document_type: input.documentType,
      document_id: documentData.id,
      status: 'reviewing',
      file_type: input.file.type || 'file',
      submitted_at: now,
    })

    return { ok: true, message: '필수서류를 제출했습니다.' }
  } catch {
    return { ok: false, message: '필수서류 저장 구조가 아직 준비되지 않았습니다.' }
  }
}
