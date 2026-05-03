'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Save, Send, X } from 'lucide-react'
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
  previewKind?: 'image' | 'pdf'
  initialMarks?: DrawingMarkupMark[]
  draftSource?: WorklogDrawingMarkupDraftSource
  disabled?: boolean
  readOnly?: boolean
  onPreviewMarksChange?: (marks: DrawingMarkupMark[]) => void
  onDraftSaved?: (record: DrawingMarkupRecord) => void
  onClose?: () => void
}

function formatRecordTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function WorklogDrawingMarkupPreviewEditor({
  pageNo,
  imageUrl,
  imageAlt,
  previewKind = 'image',
  initialMarks = [],
  draftSource,
  disabled = false,
  readOnly = false,
  onPreviewMarksChange,
  onDraftSaved,
  onClose,
}: WorklogDrawingMarkupPreviewEditorProps) {
  const { loadBySource, saveDraft, submitForReview, loading, saving, submitting, error } = useDrawingMarkupSave()
  const [activeTool, setActiveTool] = useState<DrawingMarkingTool>('select')
  const [marks, setMarks] = useState<DrawingMarkupMark[]>(() => [...initialMarks])
  const [savedRecord, setSavedRecord] = useState<DrawingMarkupRecord | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [loadMessage, setLoadMessage] = useState<string | null>(null)
  const hasDraftSource = Boolean(draftSource?.siteId && draftSource.attachmentId)
  const recordLocksEditing = Boolean(
    savedRecord?.lockedAt ||
    savedRecord?.status === 'locked' ||
    savedRecord?.status === 'pending' ||
    savedRecord?.status === 'approved' ||
    savedRecord?.approvalStatus === 'pending' ||
    savedRecord?.approvalStatus === 'approved'
  )
  const isLocked = disabled || readOnly || recordLocksEditing
  const canSaveDraft = hasDraftSource && !isLocked && !loading && !saving && !submitting
  const canSubmitForReview = Boolean(
    savedRecord?.id &&
    savedRecord.status === 'draft' &&
    savedRecord.approvalStatus === 'draft' &&
    !disabled &&
    !readOnly &&
    !loading &&
    !saving &&
    !submitting
  )

  useEffect(() => {
    if (hasDraftSource) return

    setMarks([...initialMarks])
    setSavedRecord(null)
    setSaveMessage(null)
    setLoadMessage(null)
  }, [hasDraftSource, initialMarks])

  useEffect(() => {
    if (!draftSource?.siteId || !draftSource.attachmentId) return

    let cancelled = false
    setLoadMessage(null)
    setSaveMessage(null)

    loadBySource({
      siteId: draftSource.siteId,
      worklogId: draftSource.worklogId ?? null,
      attachmentId: draftSource.attachmentId,
      pageNo: draftSource.pageNo ?? pageNo,
    })
      .then(record => {
        if (cancelled) return

        setSavedRecord(record)
        if (record) {
          setMarks([...record.marks])
          onPreviewMarksChange?.(record.marks)
          setLoadMessage('저장된 도면마킹 draft를 불러왔습니다.')
        } else {
          setMarks([...initialMarks])
          setLoadMessage(null)
        }
      })
      .catch(err => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : '저장본을 불러오지 못했습니다.'
        setLoadMessage(`저장본을 불러오지 못했습니다. ${message}`)
        setMarks([...initialMarks])
      })

    return () => {
      cancelled = true
    }
  }, [
    draftSource?.siteId,
    draftSource?.worklogId,
    draftSource?.attachmentId,
    draftSource?.pageNo,
    pageNo,
    initialMarks,
    loadBySource,
    onPreviewMarksChange,
  ])

  const handleMarksChange = (nextMarks: DrawingMarkupMark[]) => {
    setMarks(nextMarks)
    setSaveMessage(null)
    setLoadMessage(null)
    onPreviewMarksChange?.(nextMarks)
  }

  const resetMarks = () => {
    const reset = [...initialMarks]
    setMarks(reset)
    setSavedRecord(null)
    setSaveMessage(null)
    setLoadMessage(null)
    onPreviewMarksChange?.(reset)
  }

  const handleSaveDraft = async () => {
    if (!draftSource?.siteId || !draftSource.attachmentId || isLocked) return

    setSaveMessage(null)
    setLoadMessage(null)
    try {
      const record = await saveDraft({
        ...draftSource,
        pageNo: draftSource.pageNo ?? pageNo,
        marks,
      })

      setSavedRecord(record)
      setSaveMessage('임시저장 완료')
      onDraftSaved?.(record)
    } catch {
      // The hook owns the user-facing error message.
    }
  }

  const handleSubmitForReview = async () => {
    if (!savedRecord?.id || !canSubmitForReview) return

    setSaveMessage(null)
    setLoadMessage(null)
    try {
      const record = await submitForReview(savedRecord.id)
      setSavedRecord(record)
      setSaveMessage('승인요청 완료')
      onDraftSaved?.(record)
    } catch {
      // The hook owns the user-facing error message.
    }
  }

  const statusLabel = savedRecord
    ? `${savedRecord.status} / ${savedRecord.approvalStatus}`
    : hasDraftSource
      ? 'draft 저장 전'
      : '미리보기 전용'
  const guideText = readOnly || recordLocksEditing
    ? '읽기 전용 도면마킹입니다. pending, approved, locked 상태는 draft 저장으로 덮어쓸 수 없습니다.'
    : hasDraftSource
      ? '도면마킹 draft를 임시저장할 수 있습니다. 저장본이 있으면 자동으로 불러옵니다.'
      : '미리보기 전용 편집입니다. 저장하려면 작업일지 도면 첨부에서 다시 열어주세요.'
  const savedAtText = savedRecord ? formatRecordTime(savedRecord.updatedAt) : null

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {guideText}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-2">
        <span className="mr-auto text-sm font-semibold text-[var(--color-text)]">
          도면 {pageNo} · {marks.length}개 마킹
        </span>

        <button
          type="button"
          aria-label="임시저장"
          title="임시저장"
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
          aria-label="승인요청"
          title="승인요청"
          onClick={() => {
            void handleSubmitForReview()
          }}
          disabled={!canSubmitForReview}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
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

      <div className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-xs text-[var(--color-text-secondary)]">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>상태: {statusLabel}</span>
          <span>마킹: {marks.length}개</span>
          {savedAtText && <span>저장 시각: {savedAtText}</span>}
          {loading && <span>저장본 확인 중</span>}
          {saving && <span>임시저장 중</span>}
          {submitting && <span>승인요청 중</span>}
        </div>
      </div>

      {(saveMessage || loadMessage || error) && (
        <div
          className={
            error
              ? 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
              : loadMessage
                ? 'rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700'
                : 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
          }
        >
          {error ?? saveMessage ?? loadMessage}
        </div>
      )}

      <DrawingMarkingOverlay
        imageUrl={imageUrl}
        imageAlt={imageAlt ?? `도면 ${pageNo}`}
        previewKind={previewKind}
        marks={marks}
        activeTool={activeTool}
        onActiveToolChange={setActiveTool}
        onMarksChange={handleMarksChange}
        readOnly={isLocked}
        disabled={disabled}
      />
    </div>
  )
}
