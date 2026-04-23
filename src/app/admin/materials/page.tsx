'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, ArrowUpDown, Plus, Search, TrendingDown, TrendingUp, FileText, Building2, Calendar } from 'lucide-react'

interface Material {
  id: string
  name: string
  spec: string | null
  unit: string
  min_stock: number
  active: boolean
}

interface MaterialLog {
  id: string
  site_id: string
  material_id: string
  work_date: string
  type: '입고' | '출고' | '조정'
  quantity: number
  remarks: string | null
  created_at: string
  site_name?: string
  material_name?: string
  created_by_name?: string
}

interface BillingDoc {
  id: string
  site_id: string
  category: string
  title: string
  amount: number
  status: string
  created_at: string
  site_name?: string
}

interface Site { id: string; name: string }

type MaterialLogRow = Omit<MaterialLog, 'site_name' | 'material_name' | 'created_by_name'> & {
  site?: { name?: string } | Array<{ name?: string }> | null
  material?: { name?: string } | Array<{ name?: string }> | null
  creator?: { name?: string } | Array<{ name?: string }> | null
}

type BillingDocRow = Omit<BillingDoc, 'site_name'> & {
  site?: { name?: string } | Array<{ name?: string }> | null
}

function mapMaterialLog(log: MaterialLogRow): MaterialLog {
  const site = Array.isArray(log.site) ? log.site[0] : log.site
  const material = Array.isArray(log.material) ? log.material[0] : log.material
  const creator = Array.isArray(log.creator) ? log.creator[0] : log.creator

  return {
    id: log.id,
    site_id: log.site_id,
    material_id: log.material_id,
    work_date: log.work_date,
    type: log.type,
    quantity: log.quantity,
    remarks: log.remarks,
    created_at: log.created_at,
    site_name: site?.name,
    material_name: material?.name,
    created_by_name: creator?.name,
  }
}

function mapBillingDoc(doc: BillingDocRow): BillingDoc {
  const site = Array.isArray(doc.site) ? doc.site[0] : doc.site

  return {
    id: doc.id,
    site_id: doc.site_id,
    category: doc.category,
    title: doc.title,
    amount: doc.amount,
    status: doc.status,
    created_at: doc.created_at,
    site_name: site?.name,
  }
}

type Tab = 'stock' | 'logs' | 'billing'

export default function AdminMaterialsPage() {
  const [tab, setTab] = useState<Tab>('stock')
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<Material[]>([])
  const [logs, setLogs] = useState<MaterialLog[]>([])
  const [billingDocs, setBillingDocs] = useState<BillingDoc[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState<'stock' | 'log'>('stock')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('materials').select('*').order('name'),
      supabase.from('material_logs').select(`
        id, site_id, material_id, work_date, type, quantity, remarks, created_at,
        site:sites(name),
        material:materials(name),
        creator:workers(name)
      `).order('created_at', { ascending: false }).limit(200),
      supabase.from('billing_docs').select(`
        id, site_id, category, title, amount, status, created_at,
        site:sites(name)
      `).order('created_at', { ascending: false }),
      supabase.from('sites').select('id, name').order('name'),
    ]).then(([matRes, logRes, billRes, sitesRes]) => {
      if (!matRes.error) setMaterials(matRes.data || [])
      if (!logRes.error && logRes.data) {
        setLogs((logRes.data as MaterialLogRow[]).map(mapMaterialLog))
      }
      if (!billRes.error && billRes.data) {
        setBillingDocs((billRes.data as BillingDocRow[]).map(mapBillingDoc))
      }
      if (!sitesRes.error) setSites(sitesRes.data || [])
      setLoading(false)
    })
  }, [supabase])

  const handleAddMaterial = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true)
    const { error } = await supabase.from('materials').insert(data)
    if (!error) {
      const { data: updated } = await supabase.from('materials').select('*').order('name')
      if (updated) setMaterials(updated)
      setShowAddModal(false)
    }
    setSaving(false)
  }, [supabase])

  const handleAddLog = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true)
    const { error } = await supabase.from('material_logs').insert(data)
    if (!error) {
      const { data: updated } = await supabase.from('material_logs').select(`
        id, site_id, material_id, work_date, type, quantity, remarks, created_at,
        site:sites(name), material:materials(name), creator:workers(name)
      `).order('created_at', { ascending: false }).limit(200)
      if (updated) {
        setLogs((updated as MaterialLogRow[]).map(mapMaterialLog))
      }
      setShowAddModal(false)
    }
    setSaving(false)
  }, [supabase])

  const handleToggleActive = useCallback(async (id: string, active: boolean) => {
    await supabase.from('materials').update({ active }).eq('id', id)
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, active } : m))
  }, [supabase])

  const filteredMaterials = materials.filter(m =>
    search === '' || m.name.includes(search) || m.spec?.includes(search)
  )

  const filteredLogs = logs.filter(l => {
    if (siteFilter !== 'all' && l.site_id !== siteFilter) return false
    if (typeFilter !== 'all' && l.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.material_name?.toLowerCase().includes(q) && !l.site_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const filteredBilling = billingDocs.filter(b =>
    siteFilter === 'all' || b.site_id === siteFilter
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'stock', label: '자재 목록', count: materials.length },
    { key: 'logs', label: '입출고 내역', count: logs.length },
    { key: 'billing', label: '청구 문서', count: billingDocs.length },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)]">자재/영수증</h1>
        <button
          onClick={() => { setAddType(tab === 'stock' ? 'stock' : 'log'); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-hover)] transition"
        >
          <Plus className="h-4 w-4" strokeWidth={1.9} />
          {tab === 'stock' ? '자재 추가' : '입출고 기록'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key
                ? 'border-[var(--color-navy)] text-[var(--color-navy)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.9} />
          <input
            type="text"
            placeholder={tab === 'stock' ? '자재명, 규격 검색...' : '자재명, 현장명 검색...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        {tab !== 'stock' && (
          <select
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
          >
            <option value="all">전체 현장</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {tab === 'logs' && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
          >
            <option value="all">전체 유형</option>
            <option value="입고">입고</option>
            <option value="출고">출고</option>
            <option value="조정">조정</option>
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">로딩 중...</div>
      ) : (
        <>
          {tab === 'stock' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">자재명</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">규격</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">단위</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">최소재고</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">자재가 없습니다.</td>
                      </tr>
                    ) : filteredMaterials.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{m.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.spec || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.min_stock}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(m.id, !m.active)}
                            className={`px-2 py-1 text-xs font-medium rounded-full transition ${
                              m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {m.active ? '활성' : '비활성'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-secondary)]">입출고 내역이 없습니다.</div>
              ) : filteredLogs.map(l => (
                <div key={l.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    l.type === '입고' ? 'bg-blue-100' : l.type === '출고' ? 'bg-orange-100' : 'bg-purple-100'
                  }`}>
                    {l.type === '입고'
                      ? <TrendingUp className="h-5 w-5 text-blue-600" strokeWidth={1.9} />
                      : l.type === '출고'
                        ? <TrendingDown className="h-5 w-5 text-orange-600" strokeWidth={1.9} />
                        : <ArrowUpDown className="h-5 w-5 text-purple-600" strokeWidth={1.9} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{l.material_name || '알 수 없는 자재'}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" strokeWidth={1.9} />
                        {l.site_name || '현장 미지정'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" strokeWidth={1.9} />
                        {l.work_date}
                      </span>
                    </div>
                    {l.remarks && <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{l.remarks}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${
                      l.type === '입고' ? 'text-blue-600' : l.type === '출고' ? 'text-orange-600' : 'text-purple-600'
                    }`}>
                      {l.type === '입고' ? '+' : l.type === '출고' ? '-' : ''}{l.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'billing' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">문서명</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">분류</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">현장</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBilling.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">청구 문서가 없습니다.</td>
                      </tr>
                    ) : filteredBilling.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.9} />
                            <span className="text-sm font-medium">{b.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{b.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{b.site_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{b.amount.toLocaleString()}원</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            b.status === 'approved' ? 'bg-green-100 text-green-700'
                            : b.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {b.status === 'approved' ? '승인' : b.status === 'pending' ? '대기' : b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddModal
          type={addType}
          materials={materials}
          sites={sites}
          onSave={addType === 'stock' ? handleAddMaterial : handleAddLog}
          onClose={() => setShowAddModal(false)}
          saving={saving}
        />
      )}
    </div>
  )
}

function AddModal({
  type, materials, sites, onSave, onClose, saving
}: {
  type: 'stock' | 'log'
  materials: Material[]
  sites: Site[]
  onSave: (data: Record<string, unknown>) => void
  onClose: () => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [spec, setSpec] = useState('')
  const [unit, setUnit] = useState('')
  const [minStock, setMinStock] = useState(0)
  const [siteId, setSiteId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [logType, setLogType] = useState<'입고' | '출고' | '조정'>('입고')
  const [quantity, setQuantity] = useState(0)
  const [remarks, setRemarks] = useState('')
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10))

  const handleSubmit = () => {
    if (type === 'stock') {
      if (!name.trim() || !unit.trim()) return
      onSave({ name: name.trim(), spec: spec.trim() || null, unit: unit.trim(), min_stock: minStock, active: true })
    } else {
      if (!siteId || !materialId || quantity <= 0) return
      onSave({ site_id: siteId, material_id: materialId, type: logType, quantity, remarks: remarks.trim() || null, work_date: workDate })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-4">
          {type === 'stock' ? '자재 추가' : '입출고 기록'}
        </h3>

        {type === 'stock' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">자재명 *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" placeholder="자재명을 입력" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">규격</label>
              <input value={spec} onChange={e => setSpec(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" placeholder="규격" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">단위 *</label>
                <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" placeholder="EA, BOX..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">최소재고</label>
                <input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">현장 *</label>
              <select value={siteId} onChange={e => setSiteId(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white">
                <option value="">현장 선택</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">자재 *</label>
              <select value={materialId} onChange={e => setMaterialId(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white">
                <option value="">자재 선택</option>
                {materials.filter(m => m.active).map(m => <option key={m.id} value={m.id}>{m.name} {m.spec ? `(${m.spec})` : ''}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">유형 *</label>
                <select value={logType} onChange={e => setLogType(e.target.value as '입고' | '출고' | '조정')} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white">
                  <option value="입고">입고</option>
                  <option value="출고">출고</option>
                  <option value="조정">조정</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">수량 *</label>
                <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">날짜</label>
                <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">비고</label>
              <input value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" placeholder="비고 (선택)" />
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-50 transition">취소</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2 bg-[var(--color-navy)] text-white rounded-lg hover:bg-[var(--color-navy-hover)] transition disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
