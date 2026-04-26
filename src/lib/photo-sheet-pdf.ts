/**
 * Photo sheet PDF generation helpers.
 *
 * This module provides browser-based PDF generation for PhotoSheetDraft data.
 * - Uses html2canvas for Korean text rendering (browser-safe)
 * - Uses jsPDF for PDF generation
 * - Downloads PDF directly in browser
 * - Uses signed URLs for image insertion
 * - No Storage upload
 * - No DB save
 */

import type { PhotoSheetDraft } from './photo-sheet-mapping'
import { createClient } from './supabase/client'
import { createSignedPreviewUrl } from './storage/storage-helper'

/**
 * Sanitize filename by removing/replacing invalid characters.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

/**
 * Download photo sheet as PDF using browser rendering for Korean text support.
 *
 * This approach:
 * 1. Creates a temporary HTML container with Korean text
 * 2. Renders it using browser fonts (Korean-safe)
 * 3. Captures with html2canvas
 * 4. Inserts as image into jsPDF
 * 5. Handles multi-page if content exceeds one page
 *
 * @param input.draft - PhotoSheetDraft data to generate PDF from
 * @returns Promise that resolves when download starts
 *
 * @example
 * await downloadPhotoSheetPdf({ draft })
 */
export async function downloadPhotoSheetPdf(input: {
  draft: PhotoSheetDraft
}): Promise<void> {
  const { draft } = input

  // A4 dimensions in mm
  const pageWidth = 210
  const pageHeight = 297
  const dpi = 96
  const mmToPx = dpi / 25.4
  const scale = 2 // high quality

  // Calculate container size in pixels
  const containerWidthPx = Math.floor(pageWidth * mmToPx * scale)
  const pageHeightPx = Math.floor(pageHeight * mmToPx * scale)
  const contentPadding = 40 * scale

  // Prepare image dataURLs for photo items (non-blocking failures)
  const imageDataUrls = await prepareItemImageDataUrls(draft.items)

  // Build HTML content with image areas
  const itemHtml = draft.items.map((item, i) => {
    const pathPreview = item.storagePath.length > 50
      ? '...' + item.storagePath.slice(-47)
      : item.storagePath

    // Determine image display
    let imageArea = ''
    const hasImage = item.storageBucket === 'photos' && item.storagePath
    if (hasImage) {
      const dataUrl = imageDataUrls[item.id]
      if (dataUrl) {
        imageArea = `<img class="item-image" src="${escapeHtml(dataUrl)}" alt="${escapeHtml(item.caption || item.fileName)}" />`
      } else {
        imageArea = `<div class="item-image-error">이미지 불러오기 실패</div>`
      }
    } else {
      imageArea = `<div class="item-image-none">이미지 없음</div>`
    }

    return `
      <div class="item">
        ${hasImage ? `<div class="item-image-wrapper">${imageArea}</div>` : ''}
        <div class="item-header">${i + 1}. ${escapeHtml(item.title || '-')}</div>
        <div class="item-row">설명: ${escapeHtml(item.caption || '-')}</div>
        <div class="item-row">파일: ${escapeHtml(item.fileName || '-')}</div>
        <div class="item-row">상태: ${escapeHtml(item.statusLabel || item.status || '-')}</div>
        <div class="item-path">path: ${escapeHtml(pathPreview)}</div>
      </div>
    `
  }).join('')

  const htmlContent = `
    <div class="container" style="width: ${containerWidthPx}px; font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;">
      <h1 class="title">${escapeHtml(draft.title || '사진대지')}</h1>
      <div class="meta">
        <div>현장 ID: ${escapeHtml(draft.siteId || '-')}</div>
        <div>작업일: ${escapeHtml(draft.workDate || '-')}</div>
        <div>항목 수: ${draft.items.length}건</div>
      </div>
      <div class="divider"></div>
      ${draft.items.length === 0 ? '<div class="empty">사진대지 항목이 없습니다.</div>' : itemHtml}
      <div class="footer">생성일: ${new Date().toLocaleDateString('ko-KR')}</div>
    </div>
  `

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; }
        .container {
          padding: 40px;
          background: white;
          color: #1a1a1a;
          font-size: 14px;
          line-height: 1.6;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 16px;
          color: #1a1a1a;
        }
        .meta {
          margin-bottom: 12px;
          font-size: 13px;
          color: #666;
        }
        .meta div { margin-bottom: 4px; }
        .divider {
          height: 1px;
          background: #e5e5e5;
          margin: 12px 0;
        }
        .item {
          background: #f9f9f9;
          border-radius: 4px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .item-header {
          font-weight: bold;
          font-size: 15px;
          margin-bottom: 8px;
          color: #1a1a1a;
        }
        .item-row {
          font-size: 13px;
          color: #666;
          margin-bottom: 4px;
        }
        .item-path {
          font-size: 11px;
          color: #999;
          margin-top: 4px;
          word-break: break-all;
        }
        .item-image-wrapper {
          margin-bottom: 12px;
        }
        .item-image {
          max-width: 100%;
          max-height: 200px;
          object-fit: contain;
          border-radius: 4px;
        }
        .item-image-error {
          padding: 16px;
          background: #fff3f3;
          border: 1px solid #ffcdd2;
          border-radius: 4px;
          color: #c62828;
          font-size: 13px;
          text-align: center;
        }
        .item-image-none {
          padding: 16px;
          background: #f5f5f5;
          border: 1px dashed #ccc;
          border-radius: 4px;
          color: #999;
          font-size: 13px;
          text-align: center;
        }
        .empty {
          text-align: center;
          color: #999;
          padding: 40px;
          font-style: italic;
        }
        .footer {
          text-align: right;
          font-size: 11px;
          color: #999;
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `

  // Create temporary iframe/container for rendering
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Cannot access iframe document')

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    // Wait for fonts to load
    if (iframeDoc.fonts?.ready) {
      await iframeDoc.fonts.ready
    } else {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Get the container element
    const container = iframeDoc.querySelector('.container') as HTMLElement
    if (!container) throw new Error('Container not found')

    // Calculate total height needed
    const totalHeightPx = container.scrollHeight
    const numPages = Math.ceil(totalHeightPx / pageHeightPx)

    // Import jsPDF
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    // Use html2canvas to capture
    const html2canvas = (await import('html2canvas')).default

    for (let page = 0; page < numPages; page++) {
      if (page > 0) {
        doc.addPage()
      }

      // Calculate scroll position for this page
      const scrollY = page * pageHeightPx

      // Capture this page portion
      const canvas = await html2canvas(container, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowHeight: totalHeightPx,
        height: pageHeightPx,
        y: scrollY,
        x: 0,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight)
    }

    // Download
    const safeSiteId = sanitizeFilename(draft.siteId || 'unknown')
    const safeDate = sanitizeFilename(draft.workDate || 'unknown')
    const filename = `photo-sheet-${safeSiteId}-${safeDate}.pdf`
    doc.save(filename)

  } finally {
    // Cleanup
    document.body.removeChild(iframe)
  }
}

/**
 * Fetch and convert a URL to a data URL (for embedding images in PDF).
 */
async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn('[photo-sheet-pdf] fetch failed:', response.status, url)
      return null
    }
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (result && result.startsWith('data:')) {
          resolve(result)
        } else {
          reject(new Error('Invalid data URL'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn('[photo-sheet-pdf] fetch error:', err)
    return null
  }
}

/**
 * Prepare image dataURLs for draft items that have photos.
 * Returns a map of item.id -> dataURL (or null if failed).
 * Failures are non-fatal - individual items will show "이미지 불러오기 실패".
 */
async function prepareItemImageDataUrls(
  items: PhotoSheetDraft['items']
): Promise<Record<string, string | null>> {
  const photoItems = items.filter(
    (item) => item.storageBucket === 'photos' && item.storagePath
  )

  if (photoItems.length === 0) {
    return {}
  }

  const supabase = createClient()
  const result: Record<string, string | null> = {}

  for (const item of photoItems) {
    const signedUrl = await createSignedPreviewUrl({
      supabase,
      bucket: item.storageBucket,
      path: item.storagePath,
      expiresIn: 3600,
    })

    if (!signedUrl) {
      result[item.id] = null
      continue
    }

    const dataUrl = await fetchAsDataUrl(signedUrl)
    result[item.id] = dataUrl
  }

  return result
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
