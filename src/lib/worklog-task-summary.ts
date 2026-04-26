/**
 * Worklog task summary types and conversion helpers.
 * Converts task_tags into human-readable summary text for various outputs.
 */

export type WorklogTaskSummaryInput = {
  taskTags: string[]
  materialItems?: Array<{ name?: string; quantity?: string; unit?: string }>
}

export type WorklogTaskSummary = {
  taskTags: string[]
  summaryText: string
  shortText: string
  hasTasks: boolean
}

/**
 * Build a human-readable task summary from task tags.
 *
 * Rules:
 * - If taskTags is empty: summaryText = '작업내용 없음', shortText = '작업없음', hasTasks = false
 * - If taskTags has items: summaryText = taskTags joined with ' / '
 * - shortText: show up to 2 items, if 3+ then "외 n건"
 * - hasTasks: true if taskTags has items
 *
 * @param input - Parameters for building the task summary
 * @returns WorklogTaskSummary with formatted text
 */
export function buildWorklogTaskSummary(input: WorklogTaskSummaryInput): WorklogTaskSummary {
  const { taskTags } = input

  if (!taskTags || taskTags.length === 0) {
    return {
      taskTags: [],
      summaryText: '작업내용 없음',
      shortText: '작업없음',
      hasTasks: false,
    }
  }

  const summaryText = taskTags.join(' / ')

  let shortText: string
  if (taskTags.length <= 2) {
    shortText = taskTags.join(' / ')
  } else {
    const remaining = taskTags.length - 2
    shortText = `${taskTags[0]} / ${taskTags[1]} 외 ${remaining}건`
  }

  return {
    taskTags: [...taskTags],
    summaryText,
    shortText,
    hasTasks: true,
  }
}

/**
 * Build caption text for photo sheet from task tags.
 *
 * Rules:
 * - If taskTags has items: use buildWorklogTaskSummary({ taskTags }).summaryText
 * - If taskTags is empty: return '보수후'
 *
 * @param taskTags - Array of task tag strings
 * @returns Caption text suitable for photo sheet
 */
export function buildPhotoSheetCaptionFromTaskTags(taskTags: string[]): string {
  if (!taskTags || taskTags.length === 0) {
    return '보수후'
  }

  return buildWorklogTaskSummary({ taskTags }).summaryText
}
