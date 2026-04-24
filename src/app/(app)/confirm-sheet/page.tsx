'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { PreviewCenter } from '@/components/preview'
import {
  ConfirmSheetForm,
  ConfirmSheetSignaturePad,
  ConfirmSheetPdfTemplate,
  type ConfirmSheetDraft,
} from '@/components/confirm-sheet'
import { Share2, Eye, FileText, CheckCircle, ArrowLeft, RotateCcw } from 'lucide-react'

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

export default function ConfirmSheetPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // 기존 데이터 fetch 상태
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [log, setLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Draft 상태 (작업완료확인서 입력값)
  const [draft, setDraft] = useState<ConfirmSheetDraft>(createInitialDraft)
  const [showPreview, setShowPreview] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [savedDocId, setSavedDocId] = useState<string | null>(null)

  // Sites fetch (기존 로직 유지)
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

  // DailyLog fetch (기존 로직 유지) + 자동 채움
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
          // 자동 채움: daily_logs 데이터로 draft 업데이트
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

  // PDF 생성 (템플릿 기반)
  const generatePDF = useCallback(async () => {
    if (!isValid) return

    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      // 한글 폰트 설정 (기본 폰트 사용, 한글 지원 필요 시 외부 폰트 로드)
      doc.setFont('helvetica')

      let y = 20
      const left = 20
      const right = 190
      const lineHeight = 8

      // 제목
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('WORK COMPLETION CERTIFICATE', 105, y, { align: 'center' })
      y += 12

      // 수신처
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`To: ${draft.companyName || 'N/A'}`, left, y)
      y += lineHeight * 1.5

      // 기본 정보 테이블
      doc.setFontSize(10)
      const col1 = left
      const col2 = 60
      const col3 = 130
      const col4 = 160

      // Site & Company
      doc.setFont('helvetica', 'bold')
      doc.text('Site:', col1, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.siteName || 'N/A', col2, y)
      doc.setFont('helvetica', 'bold')
      doc.text('Company:', col3, y)
      doc.setFont('helvetica', 'normal')
      doc.text(draft.companyName || 'N/A', col4, y)
      y += lineHeight

      // Project & Period
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

      // 작업내용
      doc.setFont('helvetica', 'bold')
      doc.text('Work Content:', left, y)
      y += lineHeight
      doc.setFont('helvetica', 'normal')
      const contentLines = doc.splitTextToSize(draft.workContent || 'N/A', right - left)
      doc.text(contentLines, left, y)
      y += contentLines.length * lineHeight + 4

      // 특기사항
      if (draft.specialNotes) {
        doc.setFont('helvetica', 'bold')
        doc.text('Special Notes:', left, y)
        y += lineHeight
        doc.setFont('helvetica', 'normal')
        const noteLines = doc.splitTextToSize(draft.specialNotes, right - left)
        doc.text(noteLines, left, y)
        y += noteLines.length * lineHeight + 4
      }

      // 확인 문구
      y += 8
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.text('We hereby confirm that the above work has been completed as stated.', 105, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      y += lineHeight * 2

      // 확인자 정보 테이블
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

      // 서명
      if (draft.signatureDataUrl) {
        doc.setFont('helvetica', 'bold')
        doc.text('Signature:', left, y)
        try {
          doc.addImage(draft.signatureDataUrl, 'PNG', left + 30, y - 5, 50, 20)
        } catch (e) {
          console.error('Signature image error:', e)
        }
      }

      // 발행일
      y += 30
      doc.setFontSize(9)
      doc.text(`Issued: ${format(new Date(), 'yyyy-MM-dd')}`, right, y, { align: 'right' })

      // PDF를 Blob으로 생성
      const pdfBlob = doc.output('blob')
      const fileName = `ConfirmSheet_${draft.siteName}_${draft.workDate}_${Date.now()}.pdf`

      // 1. Storage에 업로드
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

      // 2. Public URL 가져오기
      const { data: { publicUrl } } = supabase
        .storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      // 3. site_documents 테이블에 메타데이터 저장
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

      // 4. 로컬 다운로드도 함께 제공
      doc.save(fileName)

      // 5. 성공 상태 업데이트
      setSavedDocId(docData.id)
      setShowSuccess(true)

    } catch (err) {
      console.error('PDF 생성/저장 실패:', err)
      alert(err instanceof Error ? err.message : 'PDF 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
      setSaving(false)
    }
  }, [draft, isValid, supabase, user?.userId, log?.id])

  // 공유 기능 (Web Share API)
  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      // Web Share API 미지원: 다운로드로 fallback
      generatePDF()
      return
    }
    try {
      await navigator.share({
        title: `작업완료확인서 - ${draft.siteName}`,
        text: `${draft.projectName} 작업이 완료되었습니다.`,
      })
    } catch (err) {
      // 사용자가 취소하거나 실패 시
      console.log('Share cancelled or failed:', err)
    }
  }, [draft.siteName, draft.projectName, generatePDF])

  // 탭 변경
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              !showPreview
                ? 'bg-[var(--color-primary-strong)] text-white'
                : 'bg-[var(--color-bg-soft)] text-[var(--color-text-sub)]'
            }`}
          >
            <FileText className="h-4 w-4" />
            입력
          </button>
          <button
            onClick={handleShowPreview}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              showPreview
                ? 'bg-[var(--color-primary-strong)] text-white'
                : 'bg-[var(--color-bg-soft)] text-[var(--color-text-sub)]'
            }`}
          >
            <Eye className="h-4 w-4" />
            미리보기
          </button>
        </div>

        {/* 입력 폼 탭 */}
        {!showPreview && (
          <>
            {/* 현장/날짜 선택 (기존 로직 연동) */}
            <div className="ui-card p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">현장</label>
                <select
                  value={selectedSiteId}
                  onChange={e => handleSiteSelect(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg bg-[var(--color-bg-surface)] text-sm"
                  style={{ borderColor: 'rgba(219, 227, 236, 1)' }}
                >
                  <option value="">현장 선택</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">작업일</label>
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
              onSiteSelect={handleSiteSelect}
            />

            {/* 서명 패드 */}
            <div className="ui-card p-4">
              <ConfirmSheetSignaturePad
                signatureDataUrl={draft.signatureDataUrl}
                onSignatureChange={handleSignatureChange}
              />
            </div>

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
          </>
        )}

        {/* 미리보기 탭 */}
        {showPreview && (
          <div className="ui-card p-4 overflow-x-auto">
            <ConfirmSheetPdfTemplate draft={draft} showPlaceholder={!isValid} />
          </div>
        )}

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
                    setShowPreview(false)
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
    </PreviewCenter>
  )
}
