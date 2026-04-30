'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { usePreview } from '@/components/preview'
import {
  ConfirmSheetForm,
  ConfirmSheetSignaturePad,
  ConfirmSheetPdfTemplate,
  ConfirmSheetA4Preview,
  ConfirmationA4PreviewWrapper,
  type ConfirmSheetDraft,
} from '@/components/confirm-sheet'
import { FileText, CheckCircle, ArrowLeft, RotateCcw, Save, Search, X, Building2, MapPin, ChevronRight } from 'lucide-react'

interface Site {
  id: string
  name: string
  company: string
  address: string
  manager: string
}

interface DailyLog {
  id: string
  work_date: string
  worker_array: { name: string; count: number }[]
  task_tags: string[]
}

// 초안 초기값 생성
function createInitialDraft(): ConfirmSheetDraft {
  const today = format(new Date(), 'yyyy-MM-dd')
  return {
    siteId: '',
    siteName: '',
    siteAddress: '',
    siteManager: '',
    companyName: '',
    projectName: '',
    periodStart: today,
    periodEnd: today,
    workDate: today,
    workContent: '',
    specialNotes: '',
    affiliation: '',
    signerName: '',
    signatureDataUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// 콤보검색용 현장 선택 컴포넌트 (page.tsx 내부 구현)
function SiteCombobox({
  sites,
  selectedId,
  onSelect,
}: {
  sites: Site[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = sites.find(s => s.id === selectedId)

  const filteredSites = useMemo(() => {
    if (!query.trim()) return sites
    const q = query.toLowerCase()
    return sites.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    )
  }, [sites, query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--color-accent-light)] p-4 text-center text-sm text-[var(--color-text-secondary)]">
        접근 가능한 현장이 없습니다.
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--color-border)] bg-white px-4 py-3 text-left transition hover:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        <Search className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-[var(--color-text)]">{selected.name}</span>
            <span className="block truncate text-sm text-[var(--color-text-secondary)]">
              {selected.company}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-[var(--color-text-tertiary)]">현장 검색...</span>
        )}
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-[var(--color-text-tertiary)] transition-transform ${open ? 'rotate-90' : ''}`}
          strokeWidth={1.9}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-hidden rounded-2xl border-2 border-[var(--color-border)] bg-white shadow-lg">
          <div className="sticky top-0 bg-white p-2">
            <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              <input
                autoFocus
                type="text"
                placeholder="현장명, 업체명, 주소 검색..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]"
                >
                  <X className="h-4 w-4" strokeWidth={1.9} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredSites.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredSites.map(site => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    onSelect(site.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-accent-light)]"
                >
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-[var(--color-text)]">{site.name}</span>
                    </div>
                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {site.company}
                    </div>
                    {site.address && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.9} />
                        <span className="line-clamp-1">{site.address}</span>
                      </div>
                    )}
                  </div>
                  {site.id === selectedId && (
                    <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-white">
                      선택됨
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConfirmSheetPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // 데이터 fetch 상태
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [log, setLog] = useState<DailyLog | null>(null)
  const [generating, setGenerating] = useState(false)

  // Draft 상태 (작업완료확인서 입력값)
  const [draft, setDraft] = useState<ConfirmSheetDraft>(createInitialDraft)
  const [showSuccess, setShowSuccess] = useState(false)
  const [savedDocId, setSavedDocId] = useState<string | null>(null)

  const { openPreview } = usePreview()

  // Sites fetch
  useEffect(() => {
    if (!user) return
    async function fetchSites() {
      try {
        const { data } = await supabase.from('sites').select('id, name, company, address, manager').order('name').limit(50)
        if (data) setSites(data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchSites()
  }, [user, supabase])

  // DailyLog fetch + 자동 채움
  useEffect(() => {
    if (!selectedSiteId || !selectedDate) {
      setLog(null)
      return
    }
    async function fetchLog() {
      try {
        const { data } = await supabase
          .from('daily_logs')
          .select('id, work_date, worker_array, task_tags')
          .eq('site_id', selectedSiteId)
          .eq('work_date', selectedDate)
          .single()
        if (data) {
          setLog(data)
          const workerCount = (data.worker_array || []).reduce((sum: number, w: { count: number }) => sum + w.count, 0)
          const workSummary = data.task_tags?.join(', ') || ''
          const autoContent = workSummary
            ? `${workSummary} 작업을 완료하였습니다. (작업인원: ${workerCount}명)`
            : ''
          setDraft(prev => ({
            ...prev,
            workDate: data.work_date,
            workContent: prev.workContent || autoContent,
          }))
        } else {
          setLog(null)
        }
      } catch {}
    }
    fetchLog()
  }, [selectedSiteId, selectedDate, supabase])

  // 현장 선택 시 draft 자동 채움
  const handleSiteSelect = useCallback((siteId: string) => {
    setSelectedSiteId(siteId)
    const site = sites.find(s => s.id === siteId)
    if (site) {
      setDraft(prev => ({
        ...prev,
        siteId: site.id,
        siteName: site.name,
        siteAddress: site.address,
        siteManager: site.manager,
        companyName: site.company,
      }))
    }
  }, [sites])

  // Draft 업데이트
  const handleDraftChange = useCallback((updates: Partial<ConfirmSheetDraft>) => {
    setDraft(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }))
  }, [])

  // 서명 업데이트
  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    handleDraftChange({ signatureDataUrl: dataUrl })
  }, [handleDraftChange])

  // 유효성 검사
  const isValid = useMemo(() => {
    return !!(
      draft.siteId &&
      draft.projectName &&
      draft.workContent &&
      draft.signatureDataUrl &&
      draft.signerName
    )
  }, [draft])

  // PDF 생성
  const generatePDF = useCallback(async () => {
    if (!isValid) return

    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      doc.setFont('helvetica')
      let y = 20
      const left = 20
      const right = 190
      const lineHeight = 8

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('WORK COMPLETION CERTIFICATE', 105, y, { align: 'center' })
      y += 12

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`To: ${draft.companyName || 'N/A'}`, left, y)
      y += lineHeight * 1.5

      doc.setFontSize(10)
      const col1 = left
      const col2 = 60
      const col3 = 130
      const col4 = 160

      doc.setFont('helvetica', 'bold')
      doc.text('Site:', col1, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.siteName || 'N/A', col2, y)
      doc.setFont('helvetica', 'bold')
      doc.text('Company:', col3, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.companyName || 'N/A', col4, y)
      y += lineHeight

      doc.setFont('helvetica', 'bold')
      doc.text('Project:', col1, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.projectName || 'N/A', col2, y)
      doc.setFont('helvetica', 'bold')
      doc.text('Period:', col3, y)
      doc.setFont('helvetica', 'normal')
      const period = `${draft.periodStart} ~ ${draft.periodEnd}`
      doc.text(period, col4, y)
      y += lineHeight * 2

      doc.setFont('helvetica', 'bold')
      doc.text('Work Content:', left, y)
      y += lineHeight
      doc.setFont('helvetica', 'normal')
      const contentLines = doc.splitTextToSize(draft.workContent || 'N/A', right - left)
      doc.text(contentLines, left, y)
      y += contentLines.length * lineHeight + 4

      if (draft.specialNotes) {
        doc.setFont('helvetica', 'bold')
        doc.text('Special Notes:', left, y)
        y += lineHeight
        doc.setFont('helvetica', 'normal')
        const noteLines = doc.splitTextToSize(draft.specialNotes, right - left)
        doc.text(noteLines, left, y)
        y += noteLines.length * lineHeight + 4
      }

      y += 8
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.text('We hereby confirm that the above work has been completed as stated.', 105, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += lineHeight * 2

      doc.setFont('helvetica', 'bold')
      doc.text('Work Date:', left, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.workDate || 'N/A', col2, y)
      y += lineHeight

      doc.setFont('helvetica', 'bold')
      doc.text('Affiliation:', left, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.affiliation || 'N/A', col2, y)
      doc.setFont('helvetica', 'bold')
      doc.text('Name:', col3, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.signerName || 'N/A', col4, y)
      y += lineHeight * 2

      if (draft.signatureDataUrl) {
        doc.setFont('helvetica', 'bold')
        doc.text('Signature:', left, y)
        try {
          doc.addImage(draft.signatureDataUrl, 'PNG', left + 30, y - 5, 50, 20)
        } catch (e) {
          console.error('Signature image error:', e)
        }
      }

      y += 30
      doc.setFontSize(9)
      doc.text(`Issued: ${format(new Date(), 'yyyy-MM-dd')}`, right, y, { align: 'right' })

      const pdfBlob = doc.output('blob')
      const fileName = `ConfirmSheet_${draft.siteName}_${draft.workDate}_${Date.now()}.pdf`

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(`confirm-sheets/${fileName}`, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      const { data: docData, error: docError } = await supabase
        .from('site_documents')
        .insert({
          site_id: draft.siteId,
          doc_type: 'confirmation',
          title: `${draft.siteName} 작업완료확인서 (${draft.workDate})`,
          file_path: uploadData.path,
          file_url: publicUrl,
          file_size: pdfBlob.size,
          file_ext: 'pdf',
          work_date: draft.workDate,
          worklog_id: log?.id || null,
          uploaded_by: user?.userId,
          badge: '완료',
        })
        .select('id')
        .single()

      if (docError) {
        throw new Error(`Database insert failed: ${docError.message}`)
      }

      doc.save(fileName)
      setSavedDocId(docData.id)
      setShowSuccess(true)

    } catch (err) {
      console.error('PDF 생성/저장 실패:', err)
      alert(err instanceof Error ? err.message : 'PDF 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }, [draft, isValid, supabase, user?.userId, log?.id])

  // 탭 변경
  const handleShowPreview = () => {
    const canDownload = isValid && !generating
    openPreview({
      title: '미리보기',
      subtitle: draft.siteName || '작업완료확인서',
      mode: 'fullscreen',
      contentType: 'report',
      dockMode: 'readonly',
      showBack: false,
      onClose: () => {},
      onDownload: canDownload ? generatePDF : undefined,
      children: (
        <ConfirmSheetA4Preview
          draft={draft}
          siteName={draft.siteName}
          workDate={draft.workDate}
        />
      ),
    })
  }

  // 입력 모드
  return (
    <div className="space-y-4 pt-4">
      {/* 탭 전환 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {}}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-primary-strong)] text-white"
        >
          <FileText className="h-4 w-4" />
          입력
        </button>
        <button
          onClick={handleShowPreview}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-bg-soft)] text-[var(--color-text-sub)]"
        >
          <FileText className="h-4 w-4" />
          미리보기
        </button>
      </div>

      {/* 현장/날짜 선택 (단일 소스) */}
      <div className="ui-card p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">
            현장 <span className="text-red-500">*</span>
          </label>
          <SiteCombobox
            sites={sites}
            selectedId={selectedSiteId}
            onSelect={id => handleSiteSelect(id)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">
            작업일 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-surface)] text-sm"
          />
          {log && (
            <p className="text-xs text-emerald-600 mt-1.5">
              ✓ {format(new Date(log.work_date), 'yyyy년 M월 d일')} 작업 기록 자동 로드됨
            </p>
          )}
        </div>
      </div>

      {/* 확인서 입력 폼 */}
      <ConfirmSheetForm
        draft={draft}
        sites={sites}
        onDraftChange={handleDraftChange}
        selectedSiteId={selectedSiteId}
        selectedDate={selectedDate}
      />

      {/* 서명 패드 */}
      <div className="ui-card p-4">
        <ConfirmSheetSignaturePad
          signatureDataUrl={draft.signatureDataUrl}
          onSignatureChange={handleSignatureChange}
        />
      </div>

      {/* A4 미리보기 */}
      <section aria-label="확인서 A4 미리보기">
        <h2 className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
          입력 내용 실시간 미리보기
        </h2>
        <ConfirmationA4PreviewWrapper>
          <ConfirmSheetPdfTemplate draft={draft} showPlaceholder={false} />
        </ConfirmationA4PreviewWrapper>
      </section>

      {/* 유효성 체크 */}
      {!isValid && (
        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
          <p className="font-medium">필수 입력 항목:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            {!draft.siteId && <li>현장 선택</li>}
            {!draft.projectName && <li>공사명</li>}
            {!draft.workContent && <li>작업내용</li>}
            {!draft.signatureDataUrl && <li>서명</li>}
            {!draft.signerName && <li>성명</li>}
          </ul>
        </div>
      )}

      {/* 저장 버튼 */}
      <button
        onClick={generatePDF}
        disabled={generating || !isValid}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition ${
          isValid && !generating
            ? 'bg-[var(--color-primary-strong)] text-white hover:opacity-90'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Save className="h-4 w-4" />
        {generating ? '저장 중...' : '저장 및 PDF 다운로드'}
      </button>

      {/* 저장 완료 성공 모달 */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-navy)]">저장 완료</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                작업완료확인서가 성공적으로 저장되었습니다.
              </p>
              {savedDocId && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                  문서 ID: {savedDocId}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSuccess(false)
                  setDraft(createInitialDraft())
                  setSelectedSiteId('')
                  setLog(null)
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--color-bg-highlight)] transition"
              >
                <RotateCcw className="h-4 w-4" />
                새로 작성
              </button>
              <button
                onClick={() => router.back()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-hover)] transition"
              >
                <ArrowLeft className="h-4 w-4" />
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
