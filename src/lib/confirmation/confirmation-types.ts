/**
 * Confirmation form types for A4 PDF save/share feature.
 *
 * This module defines types only — no Supabase calls, no Storage operations,
 * no PDF generation, no documents insert.
 *
 * Core premise:
 * - A confirmation form is an INDEPENDENT input document, NOT an auto-generated report.
 * - It does NOT auto-map worklog content.
 * - It does NOT auto-attach photos from photo sheets.
 * - It does NOT auto-merge drawings or issue reports.
 * - It is a standalone A4 PDF output with save/share capability.
 */

export type ConfirmationFormType =
  | 'confirmation'
  | 'work_confirmation'
  | 'custom'

export type ConfirmationFormStatus =
  | 'draft'
  | 'saved'
  | 'shared'
  | 'locked'
  | 'archived'

export type ConfirmationPdfOrientation =
  | 'portrait'
  | 'landscape'

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

export type ConfirmationForm = {
  id: string
  siteId?: string
  siteValue?: string
  siteName?: string
  workDate?: string
  title: string
  documentNo?: string
  formType: ConfirmationFormType
  status: ConfirmationFormStatus
  inputData: ConfirmationFormInputData
  pdfDocumentId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ConfirmationFormSnapshot = {
  reportType: 'confirmation_form'
  confirmationFormId: string
  siteId?: string
  siteValue?: string
  siteName?: string
  workDate?: string
  generatedAt: string
  generatedBy: string
  sourceHash: string
  inputData: ConfirmationFormInputData
  pdfOptions: {
    pageSize: 'A4'
    orientation: ConfirmationPdfOrientation
    marginMm: number
    includePageNumber: boolean
  }
}

export type BuildConfirmationSnapshotParams = {
  form: ConfirmationForm
  generatedBy: string
  sourceHash: string
  pdfOptions?: Partial<ConfirmationFormSnapshot['pdfOptions']>
}

/**
 * Build a confirmation form snapshot object.
 *
 * This function does NOT:
 * - Generate a PDF
 * - Upload to Storage
 * - Insert a documents row
 *
 * It only constructs a serializable snapshot object from the given params.
 * The `sourceHash` must be provided externally (e.g., computed from inputData).
 */
export function buildConfirmationFormSnapshot(
  params: BuildConfirmationSnapshotParams,
): ConfirmationFormSnapshot {
  return {
    reportType: 'confirmation_form',
    confirmationFormId: params.form.id,
    siteId: params.form.siteId,
    siteValue: params.form.siteValue,
    siteName: params.form.siteName,
    workDate: params.form.workDate,
    generatedAt: new Date().toISOString(),
    generatedBy: params.generatedBy,
    sourceHash: params.sourceHash,
    inputData: params.form.inputData,
    pdfOptions: {
      pageSize: 'A4',
      orientation: params.pdfOptions?.orientation ?? 'portrait',
      marginMm: params.pdfOptions?.marginMm ?? 10,
      includePageNumber: params.pdfOptions?.includePageNumber ?? true,
    },
  }
}
