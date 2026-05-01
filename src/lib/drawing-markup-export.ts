/**
 * Drawing markup PDF/CSV export utilities.
 *
 * This module provides export functionality for DrawingMarkupPreviewDocument:
 * - PDF export using jsPDF + html2canvas (browser-based, Korean text support)
 * - CSV export for area calculations
 */

import type { DrawingMarkupPreviewDocument, DrawingMarkupPreviewPage, DrawingMarkupMark } from '@/components/preview/reports/drawing-markup-preview-types'
import { calculatePolygonArea } from '@/components/preview/reports/drawing-markup-preview-types'

export interface DrawingMarkupExportOptions {
  /** Document to export */
  document: DrawingMarkupPreviewDocument
  /** Scale factor for area display (e.g., 10000 for m²) */
  areaScaleFactor?: number
  /** Unit label for area (e.g., 'm²') */
  areaUnit?: string
  /** Include page images in PDF */
  includeImages?: boolean
}

/**
 * Calculate total area for a single page.
 */
export function calculatePageTotalArea(
  marks: DrawingMarkupMark[],
  scaleFactor: number = 1
): number {
  let total = 0
  for (const mark of marks) {
    if (mark.type === 'polygon-area') {
      const area = calculatePolygonArea(mark.points)
      if (area.isValid) {
        total += area.normalizedArea * scaleFactor
      }
    }
  }
  return total
}

/**
 * Generate CSV content from drawing markup document.
 *
 * @param options - Export options including document and area settings
 * @returns CSV string content
 *
 * @example
 * const csv = generateDrawingMarkupCsv({ document, areaUnit: 'm²' })
 * downloadCsv(csv, 'drawing-areas.csv')
 */
export function generateDrawingMarkupCsv(options: DrawingMarkupExportOptions): string {
  const { document, areaScaleFactor = 1, areaUnit = 'units²' } = options

  const rows: string[][] = [
    ['문서 제목', '현장명', '작업일', '페이지', '마킹 타입', '면적', `면적 (${areaUnit})`],
  ]

  for (const page of document.pages) {
    const pageMarks = page.marks ?? []
    let polygonCount = 0
    let brushCount = 0

    for (const mark of pageMarks) {
      if (mark.type === 'polygon-area') {
        polygonCount++
        const area = calculatePolygonArea(mark.points)
        const scaledArea = area.isValid ? (area.normalizedArea * areaScaleFactor).toFixed(4) : '-'

        rows.push([
          document.title,
          document.siteName ?? '',
          document.workDate ?? '',
          page.title,
          '면적',
          area.isValid ? area.rawArea.toFixed(4) : '-',
          scaledArea,
        ])
      } else if (mark.type === 'brush') {
        brushCount++
        rows.push([
          document.title,
          document.siteName ?? '',
          document.workDate ?? '',
          page.title,
          '브러시',
          '-',
          '-',
        ])
      }
    }

    if (pageMarks.length === 0) {
      rows.push([
        document.title,
        document.siteName ?? '',
        document.workDate ?? '',
        page.title,
        '없음',
        '-',
        '-',
      ])
    }
  }

  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

/**
 * Generate summary CSV with totals per page.
 *
 * @param options - Export options
 * @returns CSV string with summary statistics
 */
export function generateDrawingMarkupSummaryCsv(options: DrawingMarkupExportOptions): string {
  const { document, areaScaleFactor = 1, areaUnit = 'units²' } = options

  const header = ['문서 제목', '현장명', '작업일', '페이지', '면적 객체 수', `총 면적 (${areaUnit})`]
  const rows: string[][] = [header]

  let grandTotal = 0
  let totalPolygonCount = 0

  for (const page of document.pages) {
    const pageMarks = page.marks ?? []
    let pageTotal = 0
    let polygonCount = 0

    for (const mark of pageMarks) {
      if (mark.type === 'polygon-area') {
        polygonCount++
        totalPolygonCount++
        const area = calculatePolygonArea(mark.points)
        if (area.isValid) {
          const scaled = area.normalizedArea * areaScaleFactor
          pageTotal += scaled
          grandTotal += scaled
        }
      }
    }

    rows.push([
      document.title,
      document.siteName ?? '',
      document.workDate ?? '',
      page.title,
      polygonCount.toString(),
      polygonCount > 0 ? pageTotal.toFixed(4) : '-',
    ])
  }

  rows.push([
    '합계',
    '',
    '',
    `${document.pages.length} 페이지`,
    totalPolygonCount.toString(),
    totalPolygonCount > 0 ? grandTotal.toFixed(4) : '-',
  ])

  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

/**
 * Download CSV content as a file.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Build filename for drawing markup export.
 */
export function buildDrawingMarkupExportFilename(
  document: DrawingMarkupPreviewDocument,
  extension: 'csv' | 'pdf'
): string {
  const sitePart = document.siteName ? `-${document.siteName.replace(/\s+/g, '_')}` : ''
  const datePart = document.workDate ? `-${document.workDate}` : ''
  const timestamp = new Date().toISOString().slice(0, 10)
  return `drawing-markup${sitePart}${datePart}-${timestamp}.${extension}`
}

/**
 * Create drawing markup PDF blob using browser rendering.
 *
 * @param options - Export options including document
 * @returns Promise that resolves to PDF Blob
 */
export async function createDrawingMarkupPdfBlob(
  options: DrawingMarkupExportOptions
): Promise<Blob> {
  const { document, areaScaleFactor = 1, areaUnit = 'units²' } = options

  const pageWidth = 210
  const pageHeight = 297
  const dpi = 96
  const mmToPx = dpi / 25.4
  const scale = 2

  const containerWidthPx = Math.floor(pageWidth * mmToPx * scale)
  const pageHeightPx = Math.floor(pageHeight * mmToPx * scale)

  let grandTotal = 0
  let totalPolygonCount = 0

  const pageSummaries = document.pages.map(page => {
    const pageMarks = page.marks ?? []
    let pageTotal = 0
    let polygonCount = 0
    let brushCount = 0

    for (const mark of pageMarks) {
      if (mark.type === 'polygon-area') {
        polygonCount++
        totalPolygonCount++
        const area = calculatePolygonArea(mark.points)
        if (area.isValid) {
          const scaled = area.normalizedArea * areaScaleFactor
          pageTotal += scaled
          grandTotal += scaled
        }
      } else if (mark.type === 'brush') {
        brushCount++
      }
    }

    return {
      page,
      polygonCount,
      brushCount,
      pageTotal,
    }
  })

  const totalPages = pageSummaries.length + 1
  const summaryHeight = Math.max(200, (totalPolygonCount * 40 + 150) * scale)

  const htmlContent = `
    <div class="container" style="width: ${containerWidthPx}px; font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;">
      <h1 class="title">${escapeHtml(document.title || '도면마킹 보고서')}</h1>
      <div class="meta">
        <div>현장: ${escapeHtml(document.siteName || '-')}</div>
        <div>작업일: ${escapeHtml(document.workDate || '-')}</div>
        <div>생성일: ${new Date().toLocaleDateString('ko-KR')}</div>
      </div>

      <h2 class="section-title">페이지별 면적 요약</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>페이지</th>
            <th>면적 객체</th>
            <th>브러시</th>
            <th>총 면적 (${escapeHtml(areaUnit)})</th>
          </tr>
        </thead>
        <tbody>
          ${pageSummaries.map(s => `
            <tr>
              <td>${escapeHtml(s.page.title)}</td>
              <td>${s.polygonCount}건</td>
              <td>${s.brushCount}건</td>
              <td>${s.polygonCount > 0 ? s.pageTotal.toFixed(4) : '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>합계</td>
            <td>${totalPolygonCount}건</td>
            <td>-</td>
            <td>${totalPolygonCount > 0 ? grandTotal.toFixed(4) : '-'}</td>
          </tr>
        </tbody>
      </table>

      <h2 class="section-title">상세 내역</h2>
      ${pageSummaries.map((s, idx) => `
        <div class="page-section">
          <div class="page-header">${idx + 1}. ${escapeHtml(s.page.title)}</div>
          ${s.polygonCount > 0 ? `
            <table class="detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>타입</th>
                  <th>면적</th>
                  <th>면적 (${escapeHtml(areaUnit)})</th>
                </tr>
              </thead>
              <tbody>
                ${s.page.marks?.filter(m => m.type === 'polygon-area').map((m, i) => {
                  const area = calculatePolygonArea(m.points)
                  return `
                    <tr>
                      <td>${i + 1}</td>
                      <td>면적</td>
                      <td>${area.isValid ? area.rawArea.toFixed(4) : '-'}</td>
                      <td>${area.isValid ? (area.normalizedArea * areaScaleFactor).toFixed(4) : '-'}</td>
                    </tr>
                  `
                }).join('') ?? ''}
              </tbody>
            </table>
          ` : '<div class="no-marks">마킹 없음</div>'}
        </div>
      `).join('')}
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
          margin-bottom: 20px;
          font-size: 13px;
          color: #666;
          text-align: center;
        }
        .meta div { margin-bottom: 4px; }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          margin: 24px 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #dc2626;
          color: #1a1a1a;
        }
        .summary-table, .detail-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        .summary-table th, .detail-table th {
          background: #f5f5f5;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #e5e5e5;
        }
        .summary-table td, .detail-table td {
          padding: 8px;
          border: 1px solid #e5e5e5;
        }
        .total-row {
          font-weight: bold;
          background: #fff3f3;
        }
        .page-section {
          margin-bottom: 24px;
          padding: 16px;
          background: #fafafa;
          border-radius: 4px;
        }
        .page-header {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 12px;
          color: #1a1a1a;
        }
        .no-marks {
          color: #999;
          font-style: italic;
          text-align: center;
          padding: 20px;
        }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Cannot access iframe document')

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    if (iframeDoc.fonts?.ready) {
      await iframeDoc.fonts.ready
    } else {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const container = iframeDoc.querySelector('.container') as HTMLElement
    if (!container) throw new Error('Container not found')

    const totalHeightPx = Math.max(container.scrollHeight, summaryHeight)
    const numPages = Math.ceil(totalHeightPx / pageHeightPx)

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    const html2canvas = (await import('html2canvas')).default

    for (let page = 0; page < numPages; page++) {
      if (page > 0) {
        doc.addPage()
      }

      const scrollY = page * pageHeightPx

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

    return doc.output('blob')
  } finally {
    document.body.removeChild(iframe)
  }
}

/**
 * Download drawing markup as PDF.
 */
export async function downloadDrawingMarkupPdf(
  options: DrawingMarkupExportOptions
): Promise<void> {
  const blob = await createDrawingMarkupPdfBlob(options)
  const filename = buildDrawingMarkupExportFilename(options.document, 'pdf')

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download drawing markup as CSV (summary).
 */
export function downloadDrawingMarkupCsv(
  options: DrawingMarkupExportOptions
): void {
  const csv = generateDrawingMarkupSummaryCsv(options)
  const filename = buildDrawingMarkupExportFilename(options.document, 'csv')
  downloadCsv(csv, filename)
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
