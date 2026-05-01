'use client'

import { FileCheck2, ImageIcon } from 'lucide-react'
import type { WorklogMediaAttachment, WorklogMediaPhotoStatus } from '@/lib/worklog-media'

type PhotoSheetWizardProps = {
  attachments: WorklogMediaAttachment[]
  onUpdatePhoto: (
    id: string,
    patch: Pick<WorklogMediaAttachment, 'photoStatus' | 'displayStatus'>
  ) => void
}

const STATUS_OPTIONS: Array<{ value: WorklogMediaPhotoStatus; label: string }> = [
  { value: 'before_repair', label: '보수전' },
  { value: 'after_repair', label: '보수후' },
  { value: 'receipt', label: '영수증' },
  { value: 'other', label: '기타' },
]

function getDefaultLabel(status: WorklogMediaPhotoStatus): string {
  return STATUS_OPTIONS.find(option => option.value === status)?.label ?? '보수후'
}

export function PhotoSheetWizard({ attachments, onUpdatePhoto }: PhotoSheetWizardProps) {
  const photos = attachments.filter(attachment => attachment.kind === 'photo')

  if (photos.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-4 text-center text-sm text-[var(--color-text-secondary)]">
        사진을 첨부하면 사진대지 Wizard가 표시됩니다.
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
          <FileCheck2 className="h-5 w-5" strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--color-navy)]">사진대지 Wizard</div>
          <p className="mt-1 text-sm leading-5 text-[var(--color-text-secondary)]">
            사진 상태와 표시명을 정리하면 저장 후 사진대지가 자동 생성됩니다.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {photos.map((photo, index) => {
          const status = photo.photoStatus ?? 'after_repair'
          return (
            <div key={photo.id} className="grid gap-3 rounded-xl bg-[var(--color-bg)] p-3 sm:grid-cols-[56px_1fr]">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white">
                {photo.previewUrl ? (
                  <img src={photo.previewUrl} alt={photo.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                  {index + 1}. {photo.name}
                </div>
                <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <select
                    value={status}
                    onChange={event => {
                      const nextStatus = event.target.value as WorklogMediaPhotoStatus
                      onUpdatePhoto(photo.id, {
                        photoStatus: nextStatus,
                        displayStatus: photo.displayStatus || getDefaultLabel(nextStatus),
                      })
                    }}
                    className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={photo.displayStatus ?? getDefaultLabel(status)}
                    onChange={event => onUpdatePhoto(photo.id, { photoStatus: status, displayStatus: event.target.value })}
                    placeholder="사진대지 표시명"
                    className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
