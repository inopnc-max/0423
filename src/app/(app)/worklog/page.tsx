'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Search,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { isPartner } from '@/lib/roles'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'
import { loadWorklogDraft, saveWorklogDraft, clearWorklogDraft, type WorklogDraftRecord } from '@/lib/offline/worklog-draft'
import {
  getSelectedSiteId as getLocalSelectedSiteId,
  getSelectedDate,
  getWorklogSection,
  setSelectedSiteId as setLocalSelectedSiteId,
  setSelectedDate,
  setWorklogSection,
} from '@/lib/ui-state'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { useMenuSearch } from '@/hooks'
import { type WorklogMediaAttachment, createWorklogMediaAttachment } from '@/lib/worklog-media'

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

  const {
    query,
    setQuery,
    filteredWorklogs,
    loading,
    clear,
  } = useMenuSearch({ scope: 'worklog', selectedSiteId })

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

  const displayLogs: WorkLogRecord[] = query.trim().length >= 2
    ? (filteredWorklogs as unknown as WorkLogRecord[])
    : logs

  return (
    <div className="space-y-4">
      {/* Search Input */}
      {selectedSiteId && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-white px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
          <input
            type="text"
            placeholder="날짜, 상태, 작업 항목, 작업자 검색..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="rounded-full p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]"
            >
              <X className="h-4 w-4" strokeWidth={1.9} />
            </button>
          )}
        </div>
      )}

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

      {loadingLogs || loading ? (
        <div className="flex h-32 items-center justify-center">
          <span className="text-sm text-[var(--color-text-secondary)]">로딩 중...</span>
        </div>
      ) : !selectedSiteId ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
          현장을 선택하면 해당 현장의 작업일지를 조회할 수 있습니다.
        </div>
      ) : displayLogs.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
          {query.trim().length >= 2 ? '검색 결과가 없습니다.' : '해당 현장에 작성된 작업일지가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="px-1 text-xs font-medium text-[var(--color-text-tertiary)]">
            {displayLogs.length}건의 일지
          </div>
          {displayLogs.map(log => (
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

  const {
    selectedSiteId: globalSelectedSiteId,
    setSelectedSiteId: setGlobalSelectedSiteId,
    accessibleSites: globalAccessibleSites,
  } = useSelectedSite()

  const [sites, setSites] = useState<Site[]>([])
  const [worklogSelectedSiteId, setWorklogSelectedSiteId] = useState('')
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

          const querySite = searchParams.get('site')
          const localSite = getLocalSelectedSiteId()

          let resolvedSiteId = ''
          if (querySite && data.some((s: Site) => s.id === querySite)) {
            resolvedSiteId = querySite
          } else if (globalSelectedSiteId && data.some((s: Site) => s.id === globalSelectedSiteId)) {
            resolvedSiteId = globalSelectedSiteId
          } else if (localSite && data.some((s: Site) => s.id === localSite)) {
            resolvedSiteId = localSite
          }

          if (resolvedSiteId) {
            setWorklogSelectedSiteId(resolvedSiteId)
            setLocalSelectedSiteId(resolvedSiteId)
            void setGlobalSelectedSiteId(resolvedSiteId).catch((err: unknown) => {
              console.warn('[worklog] failed to sync global site:', err)
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch sites for worklog:', error)
      }
    }

    void fetchSites()
  }, [supabase, user, isPartnerUser, searchParams, globalSelectedSiteId])

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

  const handleWorklogSiteSelect = useCallback((siteId: string) => {
    setWorklogSelectedSiteId(siteId)
    setLocalSelectedSiteId(siteId || null)
    void setGlobalSelectedSiteId(siteId || null).catch((err: unknown) => {
      console.warn('[worklog] failed to sync global site:', err)
    })
  }, [setGlobalSelectedSiteId])

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
          selectedSiteId={worklogSelectedSiteId}
          onSiteSelect={handleWorklogSiteSelect}
          onLogSelect={handleLogSelect}
          userId={user?.userId ?? ''}
          supabase={supabase}
        />
      </div>
    )
  }

  return <WorklogEditorView user={user} sites={sites} supabase={supabase} onSiteSelectSync={handleWorklogSiteSelect} />
}

function WorklogEditorView({
  user,
  sites,
  supabase,
  onSiteSelectSync,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  sites: Site[]
  supabase: ReturnType<typeof createClient>
  onSiteSelectSync?: (siteId: string) => void
}) {
  const searchParams = useSearchParams()
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const [hasDraft, setHasDraft] = useState(false)

  type LocalMediaAttachment = WorklogMediaAttachment & {
    file: File
  }
  const [mediaAttachments, setMediaAttachments] = useState<LocalMediaAttachment[]>([])

  const applyWorklogState = useCallback(
    (record: Pick<WorkLogRecord, 'worker_array' | 'task_tags' | 'material_items'>) => {
      setWorkerArray(record.worker_array || [])
      setTaskTags(record.task_tags || [])
      setMaterialItems(record.material_items || [])
    },
    []
  )

  // localStorage 저장 (现场/날짜 변경 시)
  useEffect(() => {
    if (selectedSite) setLocalSelectedSiteId(selectedSite)
  }, [selectedSite])

  useEffect(() => {
    if (selectedDate) setSelectedDate(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    setWorklogSection(activeSection)
  }, [activeSection])

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

  // localStorage에서 마지막 상태 복원 + IndexedDB Draft 로드
  useEffect(() => {
    const querySite = searchParams.get('site')
    const queryDate = searchParams.get('date')

    // URL 파라미터 우선, 없으면 localStorage
    const resolvedSite = querySite || getLocalSelectedSiteId() || ''
    const resolvedDate = queryDate || getSelectedDate() || today

    setSelectedSite(resolvedSite)
    setSelectedDate(resolvedDate)
    setActiveSection(getWorklogSection())
    setReadyForPersistence(true)
    setEditorLoading(false)

    // localStorage 저장 (URL 파라미터 없이 재접속 시 복원용)
    if (!querySite) setLocalSelectedSiteId(resolvedSite || null)
  }, [searchParams, today])

  // Worklog 상태 로드: Server → IndexedDB Draft 순서
  useEffect(() => {
    if (!user || !selectedSite || !selectedDate || !readyForPersistence) return

    async function loadWorklogState() {
      try {
        // 1. Server 데이터 로드
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
          // 2. Server에 없으면 IndexedDB Draft 로드
          const draft = await loadWorklogDraft(user.userId, selectedSite, selectedDate)
          if (draft) {
            setHasDraft(true)
            applyWorklogState({
              worker_array: draft.workerArray.map(w => ({ name: w.name, count: w.count })),
              task_tags: draft.taskTags,
              material_items: draft.materialItems.map(m => ({ name: m.name, quantity: m.quantity })),
            })
            // Draft 섹션으로 복원
            setActiveSection(draft.activeSection)
          } else {
            setExistingLog(null)
            applyWorklogState({ worker_array: [], task_tags: [], material_items: [] })
          }
        }
      } catch {
        // 네트워크 오류 시 Draft fallback
        try {
          const draft = await loadWorklogDraft(user.userId, selectedSite, selectedDate)
          if (draft) {
            setHasDraft(true)
            applyWorklogState({
              worker_array: draft.workerArray.map(w => ({ name: w.name, count: w.count })),
              task_tags: draft.taskTags,
              material_items: draft.materialItems.map(m => ({ name: m.name, quantity: m.quantity })),
            })
            setActiveSection(draft.activeSection)
          } else {
            setExistingLog(null)
            applyWorklogState({ worker_array: [], task_tags: [], material_items: [] })
          }
        } catch {
          setExistingLog(null)
          applyWorklogState({ worker_array: [], task_tags: [], material_items: [] })
        }
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
        return prev.map(w =>
          w.name === trimmedName
            ? { ...w, count: Math.min(3.5, w.count + 0.5) }
            : w
        )
      }
      return [...prev, { name: trimmedName, count: 1 }]
    })
    setNewWorkerName('')
  }

  function adjustWorkerCount(name: string, delta: number) {
    setWorkerArray(prev =>
      prev.map(w =>
        w.name === name
          ? { ...w, count: Math.max(0, Math.min(3.5, w.count + delta)) }
          : w
      )
    )
  }

  function removeWorker(name: string) {
    setActiveSection('workers')
    setWorkerArray(prev => prev.filter(w => w.name !== name))
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

  function handleMediaFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const newAttachments: LocalMediaAttachment[] = files.map(file => ({
      ...createWorklogMediaAttachment(file),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setMediaAttachments(prev => [...prev, ...newAttachments])
    e.target.value = ''
  }

  function removeMediaAttachment(id: string) {
    setMediaAttachments(prev => {
      const target = prev.find(a => a.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(a => a.id !== id)
    })
  }

  useEffect(() => {
    return () => {
      mediaAttachments.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // IndexedDB Draft 자동 저장 (3초 debounce)
  const scheduleDraftSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    if (!user || !selectedSite || !selectedDate) return

    autoSaveTimerRef.current = setTimeout(async () => {
      // 수정 중인 내용만 Draft로 저장 (server에 없는 경우만)
      if (!existingLog?.id && (workerArray.length > 0 || taskTags.length > 0 || materialItems.length > 0)) {
        await saveWorklogDraft({
          userId: user.userId,
          siteId: selectedSite,
          workDate: selectedDate,
          activeSection,
          workerArray: workerArray.map(w => ({ name: w.name, count: w.count })),
          taskTags,
          materialItems: materialItems.map(m => ({ name: m.name, quantity: m.quantity })),
        })
        setHasDraft(true)
      }
    }, 3000)
  }, [user, selectedSite, selectedDate, activeSection, workerArray, taskTags, materialItems, existingLog])

  // 상태 변경 시 Draft 자동 저장 스케줄
  useEffect(() => {
    scheduleDraftSave()
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [scheduleDraftSave])

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

      // 성공 시 Draft 삭제
      await clearWorklogDraft(user.userId, selectedSite, selectedDate)
      setHasDraft(false)

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

  function formatManDay(value: number): string {
    if (Number.isInteger(value)) return `${value}`
    return value.toFixed(1)
  }

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
              onChange={e => {
                const nextSiteId = e.target.value
                setSelectedSite(nextSiteId)
                onSiteSelectSync?.(nextSiteId)
                setActiveSection('workers')
              }}
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

        {hasDraft && !existingLog?.id && (
          <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            📝 임시저장된 내용이 있습니다. 이어서 작성할 수 있습니다.
          </div>
        )}

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
          <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex min-w-[480px] items-stretch gap-1">
              {SECTION_ORDER.map((section, index) => {
                const { label, icon: Icon } = SECTION_META[section]
                const active = activeSection === section
                const isDone = (() => {
                  if (section === 'workers') return workerArray.length > 0
                  if (section === 'tasks') return taskTags.length > 0
                  if (section === 'materials') return materialItems.length > 0
                  return mediaAttachments.length > 0
                })()

                return (
                  <button
                    key={section}
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    aria-pressed={active}
                    onClick={() => setActiveSection(section)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 transition ${
                      active
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                        : isDone
                        ? 'border-green-300 bg-green-50'
                        : 'border-[var(--color-border)] bg-white hover:border-[var(--color-accent)] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isDone && !active && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      {!isDone && (
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                          active ? 'bg-[var(--color-accent)] text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {index + 1}
                        </span>
                      )}
                      <Icon
                        className={`h-5 w-5 ${active ? 'text-[var(--color-accent)]' : isDone ? 'text-green-600' : 'text-[var(--color-text-tertiary)]'}`}
                        strokeWidth={1.9}
                      />
                    </div>
                    <span className={`text-center text-xs font-semibold leading-tight ${
                      active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {label.replace(' 및 공수', '').replace(' 및 체크리스트', '').replace(' 현황', '').replace(' 사진 및 도면', '사진')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-navy)]">
                {activeSection === 'workers' && '1. 출역 인원 및 공수'}
                {activeSection === 'tasks' && '2. 상세 작업 및 체크리스트'}
                {activeSection === 'materials' && '3. 자재 투입 현황'}
                {activeSection === 'media' && '4. 현장 사진 및 도면'}
              </h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                {activeSection === 'workers' && `${formatManDay(totalWorkers)}명`}
                {activeSection === 'tasks' && `${taskTags.length}개`}
                {activeSection === 'materials' && `${materialItems.length}건`}
                {activeSection === 'media' && (mediaAttachments.length === 0 ? '준비 중' : `${mediaAttachments.length}개`)}
              </span>
            </div>

            {activeSection === 'workers' && (
              <>
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
                    className="rounded-xl bg-[var(--color-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
                  >
                    추가
                  </button>
                </div>
                {workerArray.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)]">추가된 작업자가 없습니다.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {workerArray.map(worker => (
                      <div
                        key={worker.name}
                        className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition ${
                          worker.count === 0
                            ? 'border-slate-200 bg-slate-50'
                            : 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                        }`}
                      >
                        {/* 이름 */}
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${
                            worker.count === 0 ? 'text-slate-400' : 'text-[var(--color-navy)]'
                          }`}>
                            {worker.name}
                          </span>
                          <span className="text-xs text-[var(--color-text-tertiary)]">공수</span>
                        </div>

                        {/* 카운터 */}
                        <div className="flex items-center gap-3">
                          {/* - 버튼 */}
                          <button
                            type="button"
                            onClick={() => adjustWorkerCount(worker.name, -0.5)}
                            disabled={worker.count <= 0}
                            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-white text-lg font-bold text-[var(--color-navy)] transition hover:border-[var(--color-navy)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                          >
                            −
                          </button>

                          {/* 현재 공수 */}
                          <div className="min-w-[52px] text-center">
                            <span className={`text-xl font-bold ${worker.count === 0 ? 'text-slate-400' : 'text-[var(--color-navy)]'}`}>
                              {formatManDay(worker.count)}
                            </span>
                            <span className="ml-0.5 text-xs text-[var(--color-text-tertiary)]">공수</span>
                          </div>

                          {/* + 버튼 */}
                          <button
                            type="button"
                            onClick={() => adjustWorkerCount(worker.name, 0.5)}
                            disabled={worker.count >= 3.5}
                            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-navy)] bg-[var(--color-navy)] text-lg font-bold text-white transition hover:bg-[var(--color-navy-hover)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200"
                          >
                            +
                          </button>

                          {/* 삭제 버튼 */}
                          <button
                            type="button"
                            onClick={() => removeWorker(worker.name)}
                            className="ml-2 rounded-full p-2 text-red-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`${worker.name} 삭제`}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeSection === 'tasks' && (
              <div className="flex flex-wrap gap-2">
                {TASK_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTask(tag)}
                    className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                      taskTags.includes(tag)
                        ? 'bg-[var(--color-navy)] text-white'
                        : 'bg-slate-100 text-[var(--color-text-secondary)] hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {activeSection === 'materials' && (
              <>
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
                    className="rounded-xl bg-[var(--color-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
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
                        <span className="text-[var(--color-text-secondary)]">수량: {material.quantity}</span>
                        <button type="button" onClick={() => removeMaterial(index)} className="text-red-500 transition hover:text-red-600">삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeSection === 'media' && (
              <div className="space-y-4">
                {/* 안내 문구 */}
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-700">
                    현재 첨부 파일은 이 화면에서 미리보기만 가능합니다.
                    실제 저장/업로드는 다음 PR에서 연결됩니다.
                  </p>
                </div>

                {/* 파일 선택 */}
                <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-accent-light)] py-8 transition hover:bg-amber-50">
                  <svg className="mb-2 h-10 w-10 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm font-semibold text-[var(--color-accent)]">사진 / 도면 첨부</span>
                  <span className="mt-1 text-xs text-[var(--color-text-tertiary)]">이미지 (JPG, PNG 등) 또는 PDF 파일</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleMediaFiles}
                    className="hidden"
                  />
                </label>

                {/* 첨부 목록 */}
                {mediaAttachments.length === 0 ? (
                  <p className="text-center text-sm text-[var(--color-text-tertiary)]">첨부된 파일이 없습니다.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {mediaAttachments.map(attachment => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 rounded-2xl border-2 border-[var(--color-border)] bg-white px-4 py-3"
                      >
                        {/* 썸네일 / 아이콘 */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                          {attachment.kind === 'photo' ? (
                            <img
                              src={attachment.previewUrl}
                              alt={attachment.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          )}
                        </div>

                        {/* 파일 정보 */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-[var(--color-text)]">{attachment.name}</span>
                          <span className={`mt-0.5 inline-block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${
                            attachment.kind === 'photo'
                              ? 'bg-blue-100 text-blue-700'
                              : attachment.kind === 'drawing'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {attachment.kind === 'photo' ? '사진' : attachment.kind === 'drawing' ? '도면' : '기타'}
                          </span>
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={() => removeMediaAttachment(attachment.id)}
                          className="shrink-0 rounded-full p-2 text-red-400 transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`${attachment.name} 삭제`}
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                const idx = SECTION_ORDER.indexOf(activeSection as typeof SECTION_ORDER[number])
                if (idx > 0) setActiveSection(SECTION_ORDER[idx - 1])
              }}
              disabled={activeSection === 'workers'}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              이전
            </button>
            <button
              type="button"
              onClick={() => {
                const idx = SECTION_ORDER.indexOf(activeSection as typeof SECTION_ORDER[number])
                if (idx < SECTION_ORDER.length - 1) setActiveSection(SECTION_ORDER[idx + 1])
              }}
              disabled={activeSection === 'media'}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              다음
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </>
      )}

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {mediaAttachments.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-700">
            첨부 파일은 아직 저장되지 않습니다.
          </div>
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
