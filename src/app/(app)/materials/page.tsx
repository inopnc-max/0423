'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { isAdmin, isSiteManager } from '@/lib/roles'
import { format } from 'date-fns'
import { FileText, Plus, Building2, X } from 'lucide-react'

interface Material {
  id: string
  name: string
  spec: string | null
  unit: string
  active: boolean
}

interface MaterialLog {
  id: string
  material_id: string
  type: string
  quantity: number
  work_date: string
  remarks: string | null
  material?: Material
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

type Tab = 'status' | 'io' | 'billing'

export default function MaterialsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('status')
  const [materials, setMaterials] = useState<Material[]>([])
  const [logs, setLogs] = useState<MaterialLog[]>([])
  const [billingDocs, setBillingDocs] = useState<BillingDoc[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'입고' | '출고'>('입고')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [qty, setQty] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [billingForm, setBillingForm] = useState({ site_id: '', category: '자재구매', title: '', amount: '' })
  const supabase = createClient()

  const role = user?.role || ''
  const canManage = isAdmin(role) || isSiteManager(role)

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      try {
        const [matRes, logRes, billRes, sitesRes] = await Promise.all([
          supabase.from('materials').select('*').order('name'),
          supabase.from('material_logs').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('billing_docs').select('id, site_id, category, title, amount, status, created_at').order('created_at', { ascending: false }).limit(30),
          supabase.from('sites').select('id, name').order('name'),
        ])
        if (matRes.data) setMaterials(matRes.data)
        if (logRes.data) setLogs(logRes.data)
        if (billRes.data) setBillingDocs(billRes.data)
        if (sitesRes.data) setSites(sitesRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, supabase])

  const handleAddLog = useCallback(async () => {
    if (!selectedMaterial || !qty || !user) return
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.from('material_logs').insert({
        material_id: selectedMaterial.id,
        type: modalType,
        quantity: parseInt(qty),
        work_date: format(new Date(), 'yyyy-MM-dd'),
        remarks,
        created_by: user.userId,
      })
      if (error) throw error
      setMessage({ type: 'success', text: `${modalType}되었습니다.` })
      setShowModal(false)
      setQty('')
      setRemarks('')
      const { data } = await supabase.from('material_logs').select('*').order('created_at', { ascending: false }).limit(50)
      if (data) setLogs(data)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }, [selectedMaterial, qty, modalType, remarks, user, supabase])

  const handleCreateBilling = useCallback(async () => {
    if (!billingForm.site_id || !billingForm.title || !billingForm.amount) return
    setSaving(true)
    try {
      const { error } = await supabase.from('billing_docs').insert({
        site_id: billingForm.site_id,
        category: billingForm.category,
        title: billingForm.title,
        amount: parseInt(billingForm.amount),
        status: 'pending',
      })
      if (error) throw error
      const { data } = await supabase.from('billing_docs').select('id, site_id, category, title, amount, status, created_at').order('created_at', { ascending: false }).limit(30)
      if (data) setBillingDocs(data)
      setShowBillingModal(false)
      setBillingForm({ site_id: '', category: '자재구매', title: '', amount: '' })
      setMessage({ type: 'success', text: '청구서가 등록되었습니다.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }, [billingForm, supabase])

  const openModal = (type: '입고' | '출고', material?: Material) => {
    setModalType(type)
    setSelectedMaterial(material || null)
    setShowModal(true)
  }

  const getStock = (materialId: string) => {
    const materialLogs = logs.filter(l => l.material_id === materialId)
    let stock = 0
    materialLogs.forEach(l => {
      if (l.type === '입고') stock += l.quantity
      else if (l.type === '출고') stock -= l.quantity
    })
    return stock
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-[var(--color-navy)] mb-4">자재관리</h1>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] mb-4">
        {(['status', 'io', 'billing'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
              tab === t
                ? 'border-[var(--color-navy)] text-[var(--color-navy)]'
                : 'border-transparent text-[var(--color-text-secondary)]'
            }`}
          >
            {t === 'status' ? '재고현황' : t === 'io' ? '입출고' : '청구'}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab: Status */}
      {tab === 'status' && (
        <>
          {canManage && (
            <button
              onClick={() => openModal('입고')}
              className="w-full mb-4 py-3 bg-[var(--color-navy)] text-white rounded-xl font-medium hover:bg-[var(--color-navy-hover)] transition"
            >
              + 자재 입고
            </button>
          )}

          {materials.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              등록된 자재가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {materials.filter(m => m.active).map(m => {
                const stock = getStock(m.id)
                return (
                  <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{m.name}</h3>
                        {m.spec && <p className="text-sm text-[var(--color-text-secondary)]">{m.spec}</p>}
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${stock < 0 ? 'text-red-600' : 'text-[var(--color-navy)]'}`}>
                          {stock}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">{m.unit}</div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => openModal('입고', m)}
                          className="flex-1 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                        >
                          입고
                        </button>
                        <button
                          onClick={() => openModal('출고', m)}
                          className="flex-1 py-2 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition"
                        >
                          출고
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: IO */}
      {tab === 'io' && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              입출고 기록이 없습니다.
            </div>
          ) : (
            logs.map(log => {
              const material = materials.find(m => m.id === log.material_id)
              return (
                <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{material?.name || '자재'}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">{log.work_date}</p>
                      {log.remarks && <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{log.remarks}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      log.type === '입고' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {log.type === '입고' ? '+' : '-'}{log.quantity}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Billing */}
      {tab === 'billing' && (
        <>
          {canManage && (
            <button
              onClick={() => setShowBillingModal(true)}
              className="w-full mb-4 py-3 bg-[var(--color-navy)] text-white rounded-xl font-medium hover:bg-[var(--color-navy-hover)] transition flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" strokeWidth={1.9} />
              청구서 작성
            </button>
          )}

          {billingDocs.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              작성된 청구서가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {billingDocs.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" strokeWidth={1.9} />
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{doc.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{doc.amount.toLocaleString()}원</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'approved' ? 'bg-green-100 text-green-700'
                        : doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doc.status === 'approved' ? '승인' : doc.status === 'pending' ? '대기' : doc.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 z-10">
            <h2 className="text-lg font-bold text-[var(--color-navy)] mb-4">
              자재 {modalType}
            </h2>

            <div className="space-y-4">
              {selectedMaterial ? (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium">{selectedMaterial.name}</p>
                  {selectedMaterial.spec && <p className="text-sm text-[var(--color-text-secondary)]">{selectedMaterial.spec}</p>}
                </div>
              ) : (
                <select
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  onChange={e => setSelectedMaterial(materials.find(m => m.id === e.target.value) || null)}
                >
                  <option value="">자재 선택</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">수량</label>
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="수량 입력"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">비고</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="비고 (선택)"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-[var(--color-border)] rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleAddLog}
                disabled={saving || !selectedMaterial || !qty}
                className="flex-1 py-3 bg-[var(--color-navy)] text-white rounded-lg disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBillingModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--color-navy)]">청구서 작성</h2>
              <button onClick={() => setShowBillingModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" strokeWidth={1.9} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">현장 *</label>
                <select
                  value={billingForm.site_id}
                  onChange={e => setBillingForm(f => ({ ...f, site_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-white"
                >
                  <option value="">현장 선택</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">분류</label>
                <select
                  value={billingForm.category}
                  onChange={e => setBillingForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-white"
                >
                  <option value="자재구매">자재구매</option>
                  <option value="인건비">인건비</option>
                  <option value="임대료">임대료</option>
                  <option value="용역비">용역비</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">청구명 *</label>
                <input
                  type="text"
                  value={billingForm.title}
                  onChange={e => setBillingForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="예: 콘크리트 5m³ 구매"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">금액 (원) *</label>
                <input
                  type="number"
                  value={billingForm.amount}
                  onChange={e => setBillingForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="금액 입력"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBillingModal(false)}
                className="flex-1 py-3 border border-[var(--color-border)] rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleCreateBilling}
                disabled={saving || !billingForm.site_id || !billingForm.title || !billingForm.amount}
                className="flex-1 py-3 bg-[var(--color-navy)] text-white rounded-lg disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
