/**
 * Photo sheet PDF generation helpers.
 *
 * This module provides browser-based PDF generation for PhotoSheetDraft data.
 * - Uses jsPDF for PDF generation
 * - Downloads PDF directly in browser
 * - No Storage upload
 * - No DB save
 */

import type { PhotoSheetDraft } from './photo-sheet-mapping'

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
 * Download photo sheet as PDF (text-only, no images).
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

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const leftMargin = 20
  const rightMargin = pageWidth - 20
  const contentWidth = rightMargin - leftMargin
  let y = 20
  const lineHeight = 6
  const sectionGap = 10

  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 30) {
      doc.addPage()
      y = 20
      return true
    }
    return false
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(draft.title || '사진대지', pageWidth / 2, y, { align: 'center' })
  y += sectionGap

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`현장 ID: ${draft.siteId || '-'}`, leftMargin, y)
  y += lineHeight
  doc.text(`작업일: ${draft.workDate || '-'}`, leftMargin, y)
  y += lineHeight
  doc.text(`항목 수: ${draft.items.length}건`, leftMargin, y)
  y += sectionGap

  doc.setDrawColor(200, 200, 200)
  doc.line(leftMargin, y, rightMargin, y)
  y += sectionGap

  if (draft.items.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(11)
    doc.text('사진대지 항목이 없습니다.', pageWidth / 2, y, { align: 'center' })
  } else {
    for (let i = 0; i < draft.items.length; i++) {
      const item = draft.items[i]
      const itemNumber = i + 1

      checkPageBreak(lineHeight * 6 + sectionGap)

      doc.setFillColor(245, 245, 245)
      doc.rect(leftMargin, y - 3, contentWidth, lineHeight * 6 + 4, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`${itemNumber}. ${item.title || '-'}`, leftMargin + 3, y + 3)
      y += lineHeight

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)

      const captionLines = doc.splitTextToSize(`설명: ${item.caption || '-'}`, contentWidth - 6)
      for (const line of captionLines) {
        checkPageBreak(lineHeight)
        doc.text(line, leftMargin + 3, y)
        y += lineHeight
      }

      doc.text(`파일: ${item.fileName || '-'}`, leftMargin + 3, y)
      y += lineHeight

      doc.text(`상태: ${item.statusLabel || item.status || '-'}`, leftMargin + 3, y)
      y += lineHeight

      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      const pathPreview = item.storagePath.length > 50
        ? '...' + item.storagePath.slice(-47)
        : item.storagePath
      doc.text(`path: ${pathPreview}`, leftMargin + 3, y)
      y += lineHeight + 2

      doc.setTextColor(0, 0, 0)
      y += sectionGap / 2
    }
  }

  y = pageHeight - 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, leftMargin, y)

  const safeSiteId = sanitizeFilename(draft.siteId || 'unknown')
  const safeDate = sanitizeFilename(draft.workDate || 'unknown')
  const filename = `photo-sheet-${safeSiteId}-${safeDate}.pdf`

  doc.save(filename)
}
