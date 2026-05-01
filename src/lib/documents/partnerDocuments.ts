export interface PartnerVisibleDocument {
  category: string | null
  source_type: string | null
  approval_status: string | null
  locked_at?: string | null
}

export type PartnerDocumentView = 'all' | 'reports' | 'documents'

const BLOCKED_CATEGORIES = new Set(['안전서류'])
const BLOCKED_SOURCE_TYPES = new Set(['worker_required_document', 'salary_statement'])
const REPORT_SOURCE_TYPES = new Set([
  'photo_sheet',
  'worklog',
  'confirm_sheet',
  'issue_report',
])

export function isPartnerVisibleDocument(doc: PartnerVisibleDocument): boolean {
  if (doc.category && BLOCKED_CATEGORIES.has(doc.category)) return false
  if (doc.source_type && BLOCKED_SOURCE_TYPES.has(doc.source_type)) return false
  return doc.approval_status === 'approved' || Boolean(doc.locked_at)
}

export function isPartnerReportDocument(doc: PartnerVisibleDocument): boolean {
  if (!isPartnerVisibleDocument(doc)) return false
  return Boolean(doc.source_type && REPORT_SOURCE_TYPES.has(doc.source_type))
}

export function filterPartnerDocumentsByView<T extends PartnerVisibleDocument>(
  docs: T[],
  view: PartnerDocumentView
): T[] {
  if (view === 'reports') return docs.filter(isPartnerReportDocument)
  if (view === 'documents') return docs.filter(doc => !isPartnerReportDocument(doc))
  return docs
}

export function getPartnerDocumentStatusLabel(doc: PartnerVisibleDocument): string {
  if (doc.locked_at) return '최종본'
  if (doc.approval_status === 'approved') return '승인완료'
  return '열람가능'
}

export function getPartnerDocumentKindLabel(doc: PartnerVisibleDocument): string {
  if (isPartnerReportDocument(doc)) return '보고서'
  return '문서'
}
