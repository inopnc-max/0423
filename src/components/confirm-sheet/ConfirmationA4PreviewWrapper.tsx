'use client'

interface ConfirmationA4PreviewWrapperProps {
  children: React.ReactNode
  title?: string
}

/**
 * A4 preview wrapper for confirmation forms.
 *
 * This wrapper only provides layout/sizing for A4 preview display.
 * It does NOT generate PDFs, upload to Storage, insert documents,
 * or handle downloads.
 */
export function ConfirmationA4PreviewWrapper({
  children,
  title = 'A4 미리보기',
}: ConfirmationA4PreviewWrapperProps) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
      aria-label="확인서 A4 미리보기 영역"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
        <span className="text-xs text-[var(--color-text-secondary)]">
          PDF 저장 전 미리보기
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white p-2">
        <div className="mx-auto w-[794px] max-w-full origin-top">
          {children}
        </div>
      </div>
    </section>
  )
}
