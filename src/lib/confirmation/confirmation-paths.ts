/**
 * Confirmation form Storage path helpers.
 *
 * This module generates Storage path strings only.
 * It does NOT upload files, does NOT check bucket policies,
 * and does NOT create signed URLs.
 *
 * Path conventions:
 * - reports bucket: PDF, snapshot, thumbnail
 * - signatures bucket: signature images
 * - daily-log-attachments bucket: PDF attached to a daily log
 */

export type ConfirmationStorageScope = {
  siteId?: string | null
  siteValue?: string | null
  siteName?: string | null
  workDate?: string | null
}

export type ConfirmationStoragePathInput = ConfirmationStorageScope & {
  confirmationFormId: string
}

/**
 * Sanitize a single path segment for safe Storage paths.
 */
function sanitizePathSegment(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/[\\/#?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Sanitize a confirmation form ID segment for use in Storage paths.
 *
 * Falls back to 'confirmation' if the input is empty or becomes empty after sanitization.
 */
function buildConfirmationFormIdSegment(confirmationFormId: string): string {
  return sanitizePathSegment(confirmationFormId) || 'confirmation'
}

/**
 * Build a site-scoped key for confirmation Storage paths.
 *
 * Resolution order: siteId -> siteValue -> siteName -> 'common'
 *
 * @example
 * buildConfirmationSiteKey({ siteId: 'site-123' }) // => 'site-123'
 * buildConfirmationSiteKey({ siteName: '현장 A' })  // => '현장-A'
 * buildConfirmationSiteKey({})                       // => 'common'
 */
export function buildConfirmationSiteKey(scope: ConfirmationStorageScope): string {
  return (
    sanitizePathSegment(scope.siteId) ||
    sanitizePathSegment(scope.siteValue) ||
    sanitizePathSegment(scope.siteName) ||
    'common'
  )
}

/**
 * Build the Storage path for a confirmation PDF.
 *
 * Pattern: reports/{siteKey}/confirmation/{confirmationFormId}.pdf
 *
 * @example
 * buildConfirmationPdfPath({ siteId: 'site-123', workDate: '2024-01-15', confirmationFormId: 'cf-abc' })
 * // => 'reports/site-123/confirmation/cf-abc.pdf'
 */
export function buildConfirmationPdfPath(input: ConfirmationStoragePathInput): string {
  const siteKey = buildConfirmationSiteKey(input)
  const formId = buildConfirmationFormIdSegment(input.confirmationFormId)
  return `reports/${siteKey}/confirmation/${formId}.pdf`
}

/**
 * Build the Storage path for a confirmation form snapshot JSON.
 *
 * Pattern: reports/{siteKey}/confirmation/{confirmationFormId}_snapshot.json
 *
 * @example
 * buildConfirmationSnapshotPath({ siteId: 'site-123', confirmationFormId: 'cf-abc' })
 * // => 'reports/site-123/confirmation/cf-abc_snapshot.json'
 */
export function buildConfirmationSnapshotPath(input: ConfirmationStoragePathInput): string {
  const siteKey = buildConfirmationSiteKey(input)
  const formId = buildConfirmationFormIdSegment(input.confirmationFormId)
  return `reports/${siteKey}/confirmation/${formId}_snapshot.json`
}

/**
 * Build the Storage path for a confirmation form thumbnail image.
 *
 * Pattern: reports/{siteKey}/confirmation/{confirmationFormId}_thumb.webp
 *
 * @example
 * buildConfirmationThumbPath({ siteId: 'site-123', confirmationFormId: 'cf-abc' })
 * // => 'reports/site-123/confirmation/cf-abc_thumb.webp'
 */
export function buildConfirmationThumbPath(input: ConfirmationStoragePathInput): string {
  const siteKey = buildConfirmationSiteKey(input)
  const formId = buildConfirmationFormIdSegment(input.confirmationFormId)
  return `reports/${siteKey}/confirmation/${formId}_thumb.webp`
}

/**
 * Build the Storage path for a signature image.
 *
 * Pattern: signatures/{siteKey}/confirmation/{confirmationFormId}/{signatureId}.png
 *
 * @example
 * buildConfirmationSignaturePath({ siteId: 'site-123', confirmationFormId: 'cf-abc', signatureId: 'sig-1' })
 * // => 'signatures/site-123/confirmation/cf-abc/sig-1.png'
 */
export function buildConfirmationSignaturePath(
  input: ConfirmationStoragePathInput & { signatureId: string },
): string {
  const siteKey = buildConfirmationSiteKey(input)
  const formId = buildConfirmationFormIdSegment(input.confirmationFormId)
  const signatureId = sanitizePathSegment(input.signatureId) || 'signature'
  return `signatures/${siteKey}/confirmation/${formId}/${signatureId}.png`
}

/**
 * Build the Storage path for a confirmation PDF attached to a daily log.
 *
 * Pattern: daily-log-attachments/{siteKey}/{workDate}/confirmation/{confirmationFormId}.pdf
 *
 * @example
 * buildDailyLogConfirmationAttachmentPath({ siteId: 'site-123', workDate: '2024-01-15', confirmationFormId: 'cf-abc' })
 * // => 'daily-log-attachments/site-123/2024-01-15/confirmation/cf-abc.pdf'
 */
export function buildDailyLogConfirmationAttachmentPath(
  input: ConfirmationStoragePathInput,
): string {
  const siteKey = buildConfirmationSiteKey(input)
  const formId = buildConfirmationFormIdSegment(input.confirmationFormId)
  const workDate = sanitizePathSegment(input.workDate) || 'undated'
  return `daily-log-attachments/${siteKey}/${workDate}/confirmation/${formId}.pdf`
}
