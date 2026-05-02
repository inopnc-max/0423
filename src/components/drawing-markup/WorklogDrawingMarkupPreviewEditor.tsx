'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Save, X } from 'lucide-react'
import { useDrawingMarkupSave } from '@/hooks'
import type { DrawingMarkupRecord } from '@/lib/drawing-markup-records'
import type { DrawingMarkupMark } from '@/lib/types/drawing-markup'
import { DrawingMarkingOverlay, type DrawingMarkingTool } from './DrawingMarkingOverlay'

export type WorklogDrawingMarkupDraftSource = {
  siteId: string
  worklogId?: string | null
  attachmentId: string
  pageNo?: number
  originalPath?: string | null
}

export type WorklogDrawingMarkupPreviewEditorProps = {
  pageNo: number
  imageUrl?: string | null
  imageAlt?: string
  initialMarks?: DrawingMarkupMark[]
  draftSource?: WorklogDrawingMarkupDraftSource
  disabled?: boolean
  readOnly?: boolean
  onPreviewMarksChange?: (marks: DrawingMarkupMark[]) => void
  onDraftSaved?: (record: DrawingMarkupRecord) => void
  onClose?: () => void
}

export function WorklogDrawingMarkupPreviewEditor({
  pageNo,
  imageUrl,
  imageAlt,
  initialMarks = [],
  draftSource,
  disabled = false,
  readOnly = false,
  onPreviewMarksChange,
  onDraftSaved,
  onClose,
}: WorklogDrawingMarkupPreviewEditorProps) {
  const { saveDraft, saving, error } = useDrawingMarkupSave()
  const [activeTool, setActiveTool] = useState<DrawingMarkingTool>('select')
  const [marks, setMarks] = useState<DrawingMarkupMark[]>(() => [...initialMarks])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const isLocked = disabled || readOnly
  const canSaveDraft = Boolean(draftSource?.siteId && draftSource.attachmentId) && !isLocked && !saving

  useEffect(() => {
    setMarks([...initialMarks])
    setSaveMessage(null)
  }, [initialMarks])

  const handleMarksChange = (nextMarks: DrawingMarkupMark[]) => {
    setMarks(nextMarks)
    setSaveMessage(null)
    onPreviewMarksChange?.(nextMarks)
  }

  const resetMarks = () => {
    const reset = [...initialMarks]
    setMarks(reset)
    setSaveMessage(null)
    onPreviewMarksChange?.(reset)
  }

  const handleSaveDraft = async () => {
    if (!draftSource?.siteId || !draftSource.attachmentId || isLocked) return

    setSaveMessage(null)
    try {
      const record = await saveDraft({
        ...draftSource,
        pageNo: draftSource.pageNo ?? pageNo,
        marks,
      })

      setSaveMessage('Draft saved')
      onDraftSaved?.(record)
    } catch {
      // The hook owns the user-facing error message.
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        미리보기 전용 편집입니다. 여기서 추가한 마킹은 저장되지 않으며, 저장 기능은 다음 단계에서 지원됩니다.
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-2">
        <span className="mr-auto text-sm font-semibold text-[var(--color-text)]">
          도면 {pageNo} · {marks.length}개 마킹
        </span>

        <button
          type="button"
          aria-label="Save draft"
          title="Save draft"
          onClick={() => {
            void handleSaveDraft()
          }}
          disabled={!canSaveDraft}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label="마킹 초기화"
          title="마킹 초기화"
          onClick={resetMarks}
          disabled={isLocked}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {onClose && (
          <button
            type="button"
            aria-label="닫기"
            title="닫기"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {(saveMessage || error) && (
        <div
          className={
            error
              ? 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
              : 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
          }
        >
          {error ?? saveMessage}
        </div>
      )}

      <DrawingMarkingOverlay
        imageUrl={imageUrl}
        imageAlt={imageAlt ?? `도면 ${pageNo}`}
        marks={marks}
        activeTool={activeTool}
        onActiveToolChange={setActiveTool}
        onMarksChange={handleMarksChange}
        readOnly={readOnly}
        disabled={disabled}
      />
    </div>
  )
}
