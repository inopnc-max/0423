/**
 * Report preview types for PreviewCenter workspace components.
 * These types are used for rendering different kinds of report previews
 * within the PreviewCenter container.
 */

/**
 * Supported report preview kinds.
 * - photo_sheet: A4 2x3 photo sheet document
 * - drawing_markup: Drawing with overlay markup (future)
 * - issue_report: Issue/incident report (future)
 * - worklog_report: Worklog summary report (future)
 * - salary_statement: Salary/payroll statement (future)
 * - confirm_sheet: Confirmation document sheet (future)
 */
export type ReportPreviewKind =
  | 'photo_sheet'
  | 'drawing_markup'
  | 'issue_report'
  | 'worklog_report'
  | 'salary_statement'
  | 'confirm_sheet'

/**
 * Document status for display in the preview header.
 */
export type ReportPreviewStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'locked'
  | 'rejected'

/**
 * Common base props shared by all report preview components.
 */
export interface ReportPreviewBaseProps {
  /** Current status of the report */
  status?: ReportPreviewStatus
  /** If true, the preview is read-only (no edit actions) */
  readonly?: boolean
}
