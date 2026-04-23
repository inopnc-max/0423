'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  Building2,
  Calendar,
  ChevronLeft,
  ClipboardList,
  HardHat,
  ImageIcon,
  Package,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { isPartner } from '@/lib/roles'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'

interface Site {
  id: string
  name: string
  company: string
  status: string
}

interface WorkLogRecord {
  id: string
  site_id: string
  work_date: string
  worker_array: { name: string; count: number }[]
  task_tags: string[]
  material_items: { name: string; quantity: number }[]
  media_info: Record<string, unknown>
  status: string
  site_info: Record<string, string>
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
}

function WorklogListView({
  sites,
  selectedSiteId,
  onSiteSelect,
  onLogSelect,
  userId,
  supabase,
}: {
  sites: Site[]
  selectedSiteId: string
  onSiteSelect: (siteId: string) => void
  onLogSelect: (log: WorkLogRecord) => void
  userId: string
  supabase: ReturnType<typeof createClient>
}) {
  const [logs, setLogs] = useState<WorkLogRecord[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (!selectedSiteId) {
      setLogs([])
      return
    }

    setLoadingLogs(true)
    supabase
      .from('daily_logs')
      .select(
        'id, site_id, work_date, worker_array, task_tags, material_items, media_info, status, site_info, approved_at, rejected_at, rejection_reason'
      )
      .eq('site_id', selectedSiteId)
      .order('work_date', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) {
          setLogs(data as WorkLogRecord[])
        }
        setLoadingLogs(false)
      })
  }, [selectedSiteId, supabase])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
            현장 선택
          </span>
          <select
            value={selectedSiteId}
            onChange={e => onSiteSelect(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">현장을 선택하세요</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadingLogs ? (
        <div className="flex h-32 items-center justify-center">
          <span className="text-sm text-[var(--color-text-secondary)]">로딩 중...</span>
        </div>
      ) : !selectedSiteId ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
          현장을 선택하면 해당 현장의 작업일지를 조회할 수 있습니다.
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
          해당 현장에 작성된 작업일지가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="px-1 text-xs font-medium text-[var(--color-text-tertiary)]">
            {logs.length}건의 일지
          </div>
          {logs.map(log => (
            <button
              key={log.id}
              type="button"
              onClick={() => onLogSelect(log)}
              className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-light)]">
                    <ClipboardList className="h-5 w-5 text-[var(--color-navy-light)]" strokeWidth={1.9} />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--color-text)]">
                      {format(new Date(log.work_date), 'yyyy년 MM월 dd일')}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      <HardHat className="h-3 w-3" strokeWidth={1.9} />
                      <span>
                        {log.worker_array.reduce((sum, w) => sum + w.count, 0)}명
                      </span>
                      <span>·</span>
                      <span>{log.task_tags.length}개 작업</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={log.status} />
                  <ChevronLeft className="h-4 w-4 rotate-180 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WorklogDetailView({
  log,
  onBack,
}: {
  log: WorkLogRecord
  onBack: () => void
}) {
  const totalWorkers = log.worker_array.reduce((sum, w) => sum + w.count, 0)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-navy-light)] transition hover:text-[var(--color-navy)]"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.9} />
        일지 목록으로
      </button>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">
            {format(new Date(log.work_date), 'yyyy년 MM월 dd일')}
          </h2>
          <StatusBadge status={log.status} />
        </div>

        {log.status === 'rejected' && log.rejection_reason && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            반려 사유: {log.rejection_reason}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <HardHat className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.9} />
          <h3 className="text-base font-semibold text-[var(--color-navy)]">출역 인원</h3>
          <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
            {totalWorkers}명
          </span>
        </div>

        {log.worker_array.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">입력된 인원이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {log.worker_array.map((worker, i) => (
              <span
                key={`${worker.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-700"
              >
                {worker.name} ({worker.count})
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.9} />
          <h3 className="text-base font-semibold text-[var(--color-navy)]">작업 항목</h3>
          <span className="ml-auto text-sm text-[var(--color-text-secondary)]">
            {log.task_tags.length}개
          </span>
        </div>

        {log.task_tags.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">선택된 작업 항목이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {log.task_tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.9} />
          <h3 className="text-base font-semibold text-[var(--color-navy)]">자재 투입</h3>
          <span className="ml-auto text-sm text-[var(--color-text-secondary)]">
            {log.material_items.length}건
          </span>
        </div>

        {log.material_items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">투입된 자재가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {log.material_items.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex items-center justify-between rounded-xl bg-[var(--color-bg)] px-4 py-3 text-sm"
              >
                <span className="font-medium text-[var(--color-text)]">{item.name}</span>
                <span className="text-[var(--color-text-secondary)]">수량: {item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.9} />
          <h3 className="text-base font-semibold text-[var(--color-navy)]">사진 및 도면</h3>
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)]">
          현장 상세 화면에서 사진 및 도면을 확인하세요.
        </p>
      </div>

      {log.approved_at && (
        <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          승인 완료: {format(new Date(log.approved_at), 'yyyy년 MM월 dd일 HH:mm')}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: '임시저장',
      className: 'bg-slate-100 text-slate-600',
    },
    pending: {
      label: '승인 대기',
      className: 'bg-yellow-50 text-yellow-700',
    },
    approved: {
      label: '승인',
      className: 'bg-green-50 text-green-700',
    },
    rejected: {
      label: '반려',
      className: 'bg-red-50 text-red-700',
    },
  }

  const { label, className } = config[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

export default function WorklogPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [selectedLog, setSelectedLog] = useState<WorkLogRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const isPartnerUser = user ? isPartner(user.role) : false

  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function fetchSites() {
      try {
        let query = supabase
          .from('sites')
          .select('id, name, company, status')
          .order('name')
          .limit(100)

        if (isPartnerUser) {
          const company = currentUser.company
          if (company) {
            query = query.filter('allowed_companies', 'cs', `{${company}}`)
          }
        }

        const { data } = await query
        if (data) {
          setSites(data)

          const lastSiteId = searchParams.get('site')
          if (lastSiteId && data.some((s: Site) => s.id === lastSiteId)) {
            setSelectedSiteId(lastSiteId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch sites for worklog:', error)
      }
    }

    void fetchSites()
  }, [supabase, user, isPartnerUser, searchParams])

  useEffect(() => {
    if (!user) return

    if (isPartnerUser) {
      setLoading(false)
      return
    }

    setLoading(false)
  }, [user, isPartnerUser])

  const handleLogSelect = useCallback((log: WorkLogRecord) => {
    setSelectedLog(log)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedLog(null)
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-[var(--color-text-secondary)]">로딩 중...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-[var(--color-text-secondary)]">사용자 정보를 불러오는 중입니다.</span>
      </div>
    )
  }

  if (isPartnerUser) {
    if (selectedLog) {
      return (
        <div className="space-y-4 p-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)]">일지 상세</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              현장별 작업일지를 확인합니다.
            </p>
          </div>
          <WorklogDetailView log={selectedLog} onBack={handleBack} />
        </div>
      )
    }

    return (
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-navy)]">일지 조회</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            현장별로 작성된 작업일지를 확인할 수 있습니다.
          </p>
        </div>
        <WorklogListView
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSiteSelect={setSelectedSiteId}
          onLogSelect={handleLogSelect}
          userId={user?.userId ?? ''}
          supabase={supabase}
        />
      </div>
    )
  }

  return <WorklogEditorView user={user} sites={sites} supabase={supabase} />
}

function WorklogEditorView({
  user,
  sites,
  supabase,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  sites: Site[]
  supabase: ReturnType<typeof createClient>
}) {
  const searchParams = useSearchParams()
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const [selectedSite, setSelectedSite] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [activeSection, setActiveSection] = useState<'workers' | 'tasks' | 'materials' | 'media'>('workers')
  const [existingLog, setExistingLog] = useState<WorkLogRecord | null>(null)

  const [workerArray, setWorkerArray] = useState<{ name: string; count: number }[]>([])
  const [taskTags, setTaskTags] = useState<string[]>([])
  const [materialItems, setMaterialItems] = useState<{ name: string; quantity: number }[]>([])

  const [newWorkerName, setNewWorkerName] = useState('')
  const [newMaterialName, setNewMaterialName] = useState('')
  const [newMaterialQty, setNewMaterialQty] = useState('')

  const [editorLoading, setEditorLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [readyForPersistence, setReadyForPersistence] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const applyWorklogState = useCallback(
    (record: Pick<WorkLogRecord, 'worker_array' | 'task_tags' | 'material_items'>) => {
      setWorkerArray(record.worker_array || [])
      setTaskTags(record.task_tags || [])
      setMaterialItems(record.material_items || [])
    },
    []
  )

  const buildWorklogPayload = useCallback(
    (status: 'draft' | 'pending') => {
      if (!selectedSite || !selectedDate || !user) return null

      return {
        id: existingLog?.id,
        site_id: selectedSite,
        work_date: selectedDate,
        user_id: user.userId,
        worker_array: workerArray,
        task_tags: taskTags,
        material_items: materialItems,
        status,
        site_info: {
          name: sites.find(site => site.id === selectedSite)?.name || '',
        },
      }
    },
    [existingLog?.id, materialItems, selectedDate, selectedSite, sites, taskTags, user, workerArray]
  )

  useEffect(() => {
    const querySite = searchParams.get('site')
    const queryDate = searchParams.get('date')

    setSelectedSite(querySite || '')
    setSelectedDate(queryDate || today)
    setReadyForPersistence(true)
    setEditorLoading(false)
  }, [searchParams, today])

  useEffect(() => {
    if (!user || !selectedSite || !selectedDate || !readyForPersistence) return

    async function loadWorklogState() {
      try {
        const { data: serverData } = await supabase
          .from('daily_logs')
          .select('id, site_id, work_date, worker_array, task_tags, material_items, status')
          .eq('site_id', selectedSite)
          .eq('work_date', selectedDate)
          .single()

        if (serverData) {
          setExistingLog(serverData as WorkLogRecord)
          applyWorklogState(serverData as WorkLogRecord)
        } else {
          setExistingLog(null)
          applyWorklogState({ worker_array: [], task_tags: [], material_items: [] })
        }
      } catch {
        setExistingLog(null)
        applyWorklogState({ worker_array: [], task_tags: [], material_items: [] })
      }
    }

    void loadWorklogState()
  }, [applyWorklogState, readyForPersistence, selectedDate, selectedSite, supabase, user])

  function addWorker() {
    const trimmedName = newWorkerName.trim()
    if (!trimmedName) return
    setActiveSection('workers')
    setWorkerArray(prev => {
      const existing = prev.find(w => w.name === trimmedName)
      if (existing) {
        return prev.map(w => w.name === trimmedName ? { ...w, count: w.count + 1 } : w)
      }
      return [...prev, { name: trimmedName, count: 1 }]
    })
    setNewWorkerName('')
  }

  function removeWorker(name: string) {
    setActiveSection('workers')
    setWorkerArray(prev => {
      const current = prev.find(w => w.name === name)
      if (current && current.count > 1) {
        return prev.map(w => w.name === name ? { ...w, count: w.count - 1 } : w)
      }
      return prev.filter(w => w.name !== name)
    })
  }

  function toggleTask(tag: string) {
    setActiveSection('tasks')
    setTaskTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addMaterial() {
    const trimmedName = newMaterialName.trim()
    const parsedQuantity = Number(newMaterialQty)
    if (!trimmedName || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) return
    setActiveSection('materials')
    setMaterialItems(prev => [...prev, { name: trimmedName, quantity: parsedQuantity }])
    setNewMaterialName('')
    setNewMaterialQty('')
  }

  function removeMaterial(index: number) {
    setActiveSection('materials')
    setMaterialItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave(status: 'draft' | 'pending') {
    if (!selectedSite || !selectedDate || !user) return
    setSaving(true)
    setMessage(null)

    try {
      const payload = buildWorklogPayload(status)
      if (!payload) return

      let savedRecordId = existingLog?.id

      if (existingLog?.id) {
        const { error } = await supabase
          .from('daily_logs')
          .update(payload)
          .eq('id', existingLog.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('daily_logs')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        savedRecordId = data?.id
      }

      setExistingLog({
        id: savedRecordId ?? '',
        site_id: selectedSite,
        work_date: selectedDate,
        worker_array: workerArray,
        task_tags: taskTags,
        material_items: materialItems,
        media_info: {},
        status,
        site_info: {},
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      })

      setMessage({
        type: 'success',
        text: status === 'draft' ? '작업일지를 임시저장했습니다.' : '작업일지를 승인 요청 상태로 저장했습니다.',
      })
    } catch (error: unknown) {
      console.error('Failed to save worklog:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '작업일지 저장 중 오류가 발생했습니다.',
      })
    } finally {
      setSaving(false)
    }
  }

  const totalWorkers = workerArray.reduce((sum, w) => sum + w.count, 0)

  const TASK_OPTIONS = [
    '철거', '설치', '배관', '전기', '보수', '용접',
    '단열', '조립', '마감', '청소', '안전관리', '기타',
  ]

  const SECTION_ORDER = ['workers', 'tasks', 'materials', 'media'] as const
  const SECTION_META = {
    workers: { label: '출역 인원 및 공수', icon: HardHat },
    tasks: { label: '상세 작업 및 체크리스트', icon: ClipboardList },
    materials: { label: '자재 투입 현황', icon: Package },
    media: { label: '현장 사진 및 도면', icon: ImageIcon },
  }

  if (editorLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-[var(--color-text-secondary)]">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 pb-28">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)]">작업일지</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          마지막 현장과 작업일, 작성 중이던 입력 내용을 자동으로 복원합니다.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
              현장 선택
              {selectedSite && (() => {
                const site = sites.find(s => s.id === selectedSite)
                return site ? <SiteStatusBadge status={site.status} /> : null
              })()}
            </span>
            <select
              value={selectedSite}
              onChange={e => { setSelectedSite(e.target.value); setActiveSection('workers') }}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">현장을 선택하세요</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">작업일</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setActiveSection('workers') }}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </label>
        </div>

        {existingLog?.status && (
          <div className="mt-3 rounded-xl bg-[var(--color-accent-light)] px-4 py-3 text-sm text-[var(--color-navy-light)]">
            현재 서버 저장 상태: {existingLog.status}
          </div>
        )}
      </div>

      {!selectedSite ? (
        <div className="rounded-2xl bg-white p-8 text-center text-[var(--color-text-secondary)] shadow-sm">
          현장을 선택하면 작업일지 작성을 시작할 수 있습니다.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SECTION_ORDER.map(section => {
              const { label, icon: Icon } = SECTION_META[section]
              const active = activeSection === section
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                      : 'border-[var(--color-border)] bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white p-2 shadow-sm">
                      <Icon className="h-[18px] w-[18px] text-[var(--color-accent)]" strokeWidth={1.9} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">{label}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {section === 'workers' && `${totalWorkers}명 입력`}
                        {section === 'tasks' && `${taskTags.length}개 작업 태그`}
                        {section === 'materials' && `${materialItems.length}개 자재`}
                        {section === 'media' && '사진/도면 연결'}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-navy)]">1. 출역 인원 및 공수</h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                {totalWorkers}명
              </span>
            </div>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newWorkerName}
                onChange={e => setNewWorkerName(e.target.value)}
                onFocus={() => setActiveSection('workers')}
                onKeyDown={e => e.key === 'Enter' && addWorker()}
                placeholder="작업자 이름"
                className="flex-1 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="button"
                onClick={addWorker}
                className="rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {workerArray.length === 0 && (
                <span className="text-sm text-[var(--color-text-tertiary)]">추가된 작업자가 없습니다.</span>
              )}
              {workerArray.map(worker => (
                <button
                  key={worker.name}
                  type="button"
                  onClick={() => removeWorker(worker.name)}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-700"
                >
                  <span>{worker.name} ({worker.count})</span>
                  <span className="text-blue-400">삭제</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-navy)]">2. 상세 작업 및 체크리스트</h2>
            <div className="flex flex-wrap gap-2">
              {TASK_OPTIONS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTask(tag)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    taskTags.includes(tag)
                      ? 'bg-[var(--color-navy)] text-white'
                      : 'bg-slate-100 text-[var(--color-text-secondary)] hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-navy)]">3. 자재 투입 현황</h2>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newMaterialName}
                onChange={e => setNewMaterialName(e.target.value)}
                onFocus={() => setActiveSection('materials')}
                placeholder="자재명"
                className="flex-1 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              <input
                type="number"
                value={newMaterialQty}
                onChange={e => setNewMaterialQty(e.target.value)}
                onFocus={() => setActiveSection('materials')}
                placeholder="수량"
                className="w-24 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="button"
                onClick={addMaterial}
                className="rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
              >
                추가
              </button>
            </div>
            <div className="space-y-2">
              {materialItems.length === 0 && (
                <div className="text-sm text-[var(--color-text-tertiary)]">추가된 자재가 없습니다.</div>
              )}
              {materialItems.map((material, index) => (
                <div key={`${material.name}-${index}`} className="flex items-center justify-between rounded-xl bg-[var(--color-bg)] px-4 py-3 text-sm">
                  <span className="font-medium text-[var(--color-text)]">{material.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-text-secondary)]">{material.quantity}</span>
                    <button type="button" onClick={() => removeMaterial(index)} className="text-red-500 transition hover:text-red-600">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-navy)]">4. 현장 사진 및 도면</h2>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              현장 상세 화면에서 사진 및 도면을 확인하세요.
            </p>
          </section>
        </>
      )}

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {selectedSite && (
        <div className="fixed inset-x-0 bottom-16 border-t border-[var(--color-border)] bg-white/95 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl gap-3">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-slate-50 disabled:opacity-60"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={() => handleSave('pending')}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
            >
              {saving ? '저장 중...' : '승인 요청'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
