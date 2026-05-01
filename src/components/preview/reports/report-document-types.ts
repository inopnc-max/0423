/**
 * Shared report document types for PreviewCenter renderer components.
 * These define renderer input data structures (NOT database schemas).
 */

import type { ReportPreviewKind, ReportPreviewStatus } from './report-preview-types'

/* ─── Worklog Report ─────────────────────────────────────────── */

export type WorklogReportWorkerEntry = {
  name: string
  count: number
}

export type WorklogReportMaterialEntry = {
  name: string
  quantity: number
}

export type WorklogReportMediaAttachment = {
  id: string
  kind: 'photo' | 'drawing' | 'document'
  name: string
  mimeType: string
  previewUrl?: string | null
  storageBucket?: string | null
  storagePath?: string | null
}

export type WorklogReportMediaInfo = {
  attachments: WorklogReportMediaAttachment[]
}

export type WorklogReportDocument = {
  id: string
  siteId: string
  siteName?: string
  workDate: string
  title: string
  status: ReportPreviewStatus
  workerArray: WorklogReportWorkerEntry[]
  taskTags: string[]
  materialItems: WorklogReportMaterialEntry[]
  mediaInfo: WorklogReportMediaInfo
  approvedAt?: string | null
  rejectedReason?: string | null
  createdAt?: string
}

/* ─── Salary Statement ───────────────────────────────────────── */

export type SalaryStatementEntry = {
  label: string
  value: string | number
  isBold?: boolean
}

export type SalaryStatementSection = {
  title: string
  items: SalaryStatementEntry[]
}

export type SalaryStatementDocument = {
  id: string
  siteId: string
  siteName?: string
  workerName: string
  workerId: string
  workMonth: string
  title: string
  status: ReportPreviewStatus
  /** 공수달력 mode sections */
  sections: SalaryStatementSection[]
  /** Total mandays for the month */
  totalMandays: number
  /** Total pay amount */
  totalPay: number
  createdAt?: string
}

/* ─── Confirmation Form ──────────────────────────────────────── */

export type ConfirmationCustomField = {
  label: string
  value: string
}

export type ConfirmationSignature = {
  id: string
  label: string
  signerName?: string
  signaturePath?: string
  signatureDataUrl?: string
  signedAt?: string
}

export type ConfirmationFormInputData = {
  basicInfo: {
    projectName?: string
    siteName?: string
    writerName?: string
    companyName?: string
    contact?: string
    writtenDate?: string
  }
  content: {
    subject?: string
    body?: string
    notes?: string
  }
  customFields?: ConfirmationCustomField[]
  signatures?: ConfirmationSignature[]
}

export type ConfirmationFormDocument = {
  id: string
  siteId: string
  siteName?: string
  workDate?: string
  title: string
  status: ReportPreviewStatus
  inputData: ConfirmationFormInputData
  formType: 'confirmation' | 'work_confirmation' | 'custom'
  documentNo?: string
  createdAt?: string
}

/* ─── Issue Report ───────────────────────────────────────────── */

export type IssueReportPhotoItem = {
  id: string
  caption?: string
  fileName: string
  statusLabel?: string
  storageBucket?: string | null
  storagePath?: string | null
}

export type IssueReportDocument = {
  id: string
  siteId: string
  siteName?: string
  workDate?: string
  title: string
  status: ReportPreviewStatus
  description?: string
  beforePhotos: IssueReportPhotoItem[]
  afterPhotos: IssueReportPhotoItem[]
  otherPhotos: IssueReportPhotoItem[]
  createdAt?: string
  updatedAt?: string
}

/* ─── PreviewCenter Payload (for openPreview bridge) ──────────── */

export type ReportDocument =
  | WorklogReportDocument
  | SalaryStatementDocument
  | ConfirmationFormDocument
  | IssueReportDocument
