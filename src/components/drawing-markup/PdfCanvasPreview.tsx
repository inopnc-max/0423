'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist'

type PdfCanvasPreviewProps = {
  url: string
  pageNo?: number
  title?: string
}

const PDF_WORKER_SRC = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'

export function PdfCanvasPreview({ url, pageNo = 1, title = 'PDF drawing' }: PdfCanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null

    async function renderPdfPage() {
      const canvas = canvasRef.current
      if (!canvas || !url) return

      setStatus('loading')

      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC

        loadingTask = pdfjs.getDocument(url)
        const pdf = await loadingTask.promise
        if (cancelled) return

        const page = await pdf.getPage(Math.max(1, pageNo))
        if (cancelled) return

        const viewport = page.getViewport({ scale: 1.5 })
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas context is unavailable')

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`

        context.clearRect(0, 0, canvas.width, canvas.height)
        renderTaskRef.current?.cancel?.()
        const renderTask = page.render({ canvasContext: context, viewport })
        renderTaskRef.current = renderTask
        await renderTask.promise

        if (!cancelled) setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void renderPdfPage()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel?.()
      renderTaskRef.current = null
      void loadingTask?.destroy?.()
    }
  }, [pageNo, url])

  return (
    <div className="pointer-events-none flex min-h-[320px] w-full items-center justify-center bg-white">
      {status === 'loading' && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-white text-sm text-[var(--color-text-tertiary)]">
          PDF preview loading...
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center px-4 text-center text-sm text-[var(--color-text-tertiary)]">
          PDF preview is unavailable. You can still draw and save markups.
        </div>
      )}
      <canvas
        ref={canvasRef}
        aria-label={title}
        className={`h-auto max-h-[70vh] w-full max-w-full object-contain ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
