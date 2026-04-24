/**
 * 출역/급여 페이지 PDF 생성 헬퍼
 * DOM 준비, Blob 다운로드 등 반복 로직을 중앙化管理
 */

/** PDF 캡처용 A4 폭 (px) */
export const A4_WIDTH_PX = 794

/** PDF 캡처용 A4 높이 (px) */
export const A4_HEIGHT_PX = 1123

/** 캡처 시 화면 밖으로 숨기는 left 값 */
export const OFFSCREEN_LEFT = -10000

/** html2canvas 캡처 배율 */
export const PDF_SCALE = 2

/**
 * html2canvas 캡처 전 DOM 클론을 생성하고 스타일을 보정합니다.
 * 원본 DOM은 변경하지 않으며, 캡처 완료 후 반환된 요소를 제거해야 합니다.
 */
export function preparePdfCapture(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement
  clone.style.position = 'fixed'
  clone.style.left = `${OFFSCREEN_LEFT}px`
  clone.style.top = '0'
  clone.style.fontFamily = "'Pretendard', 'Apple SD Gothic Neo', sans-serif"
  clone.style.pointerEvents = 'none'
  clone.style.backgroundColor = '#ffffff'

  clone.querySelectorAll('td, th').forEach(node => {
    const el = node as HTMLElement
    el.style.verticalAlign = 'middle'
    el.style.lineHeight = '1.5'
    el.style.paddingTop = '6px'
    el.style.paddingBottom = '16px'
    el.style.paddingLeft = '4px'
    el.style.paddingRight = '4px'
    el.style.whiteSpace = 'nowrap'
    el.style.height = 'auto'
    el.style.boxSizing = 'border-box'
  })

  return clone
}

/**
 * Blob을 다운로드 링크로 트리거합니다.
 * navigator.share 미지원 시 폴백으로 사용합니다.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * jsPDF에 캔버스를 A4 페이지에 맞게 이미지로 추가합니다.
 * 단일 페이지에 맞출 뿐, 분할 페이지는 지원하지 않습니다.
 */
export function addCanvasToPdf(
  pdf: { addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void; internal: { pageSize: { getWidth: () => number; getHeight: () => number } } },
  canvasDataUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  marginMm = 10
): void {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const maxW = pageWidth - marginMm * 2
  const maxH = pageHeight - marginMm * 2

  let renderW = maxW
  let renderH = (canvasHeight * renderW) / canvasWidth
  if (renderH > maxH) {
    renderH = maxH
    renderW = (canvasWidth * renderH) / canvasHeight
  }

  const x = (pageWidth - renderW) / 2
  pdf.addImage(canvasDataUrl, 'PNG', x, marginMm, renderW, renderH)
}
