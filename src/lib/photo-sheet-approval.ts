import { notifyPhotoSheetStatus } from '@/lib/notifications/navNoticeGenerator'
import { createClient } from '@/lib/supabase/client'

interface PhotoSheetDocumentRecord {
  id: string
  site_id: string
  title: string
  uploaded_by: string | null
  source_type: string | null
  source_id: string | null
  category: string | null
  approval_status: string | null
  locked_at: string | null
}

export interface ApprovePhotoSheetDocumentInput {
  documentId: string
  actorId: string
}

export interface ApprovePhotoSheetDocumentResult {
  documentId: string
  approvedAt: string
  actorId: string
}

function isPhotoSheetDocument(doc: PhotoSheetDocumentRecord): boolean {
  return doc.source_type === 'photo_sheet' || doc.category === '사진대지'
}

function resolvePhotoSheetWorkDate(doc: PhotoSheetDocumentRecord): string {
  const sourceId = doc.source_id ?? ''
  const parts = sourceId.split(':')
  return parts.length >= 3 ? parts[2] : ''
}

export async function approvePhotoSheetDocumentAndLock(
  input: ApprovePhotoSheetDocumentInput
): Promise<ApprovePhotoSheetDocumentResult> {
  if (!input.actorId) {
    throw new Error('Approval actor is required')
  }

  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('id, site_id, title, uploaded_by, source_type, source_id, category, approval_status, locked_at')
    .eq('id', input.documentId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to load photo sheet document: ${fetchError.message}`)
  }

  const doc = existing as PhotoSheetDocumentRecord
  if (!isPhotoSheetDocument(doc)) {
    throw new Error('Only photo sheet documents can be approved here')
  }

  const approvedAt = doc.locked_at ?? new Date().toISOString()

  if (doc.approval_status !== 'approved' || !doc.locked_at) {
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        approval_status: 'approved',
        approved_at: approvedAt,
        approved_by: input.actorId,
        locked_at: approvedAt,
        locked_by: input.actorId,
      })
      .eq('id', input.documentId)

    if (updateError) {
      throw new Error(`Failed to approve photo sheet document: ${updateError.message}`)
    }
  }

  try {
    await supabase.from('document_audit_logs').insert({
      document_id: input.documentId,
      action: 'approve',
      actor_id: input.actorId,
      reason: 'photo_sheet_approval_lock',
    })
  } catch (error) {
    console.warn('[photoSheetApproval] failed to write approval audit:', error)
  }

  if (doc.uploaded_by) {
    try {
      await notifyPhotoSheetStatus({
        userId: doc.uploaded_by,
        siteId: doc.site_id,
        workDate: resolvePhotoSheetWorkDate(doc),
        documentId: input.documentId,
        action: 'approved',
      })
    } catch (error) {
      console.warn('[photoSheetApproval] failed to create approval notice:', error)
    }
  }

  return {
    documentId: input.documentId,
    approvedAt,
    actorId: input.actorId,
  }
}
