/**
 * Production management types and hooks.
 *
 * Provides data types and async functions for:
 * - Production entries CRUD
 * - Product management
 * - Client management
 * - Production summaries and aggregations
 */

import { createClient } from '@/lib/supabase/client'

// ============================================================
// Types
// ============================================================

export type ProductionType = '생산' | '판매' | '자체사용' | '운송비'

export type ProductionEntry = {
  id: string
  productName: string
  productionType: ProductionType
  quantity: number
  unit: string
  amount: number
  siteId: string | null
  workDate: string
  notes: string | null
  createdBy: string
  createdAt: string | null
}

export type ProductionSummary = {
  totalProductionQuantity: number
  totalSaleQuantity: number
  totalSelfUseQuantity: number
  totalTransportCost: number
  totalProductionAmount: number
  totalSaleAmount: number
}

export type ProductionLog = {
  id: string
  productName: string
  productionType: ProductionType
  quantity: number
  unit: string
  siteName: string | null
  workDate: string
  createdBy: string
  createdAt: string | null
}

export type ProductionInputForm = {
  workDate: string
  siteId: string | null
  productionType: ProductionType
  productName: string
  quantity: number
  unit: string
  amount: number
  notes: string
}

// ============================================================
// Database Row Types
// ============================================================

type DbProductionEntry = {
  id: string
  site_id: string | null
  work_date: string
  product_name: string
  production_type: string
  quantity: number
  unit: string
  amount: number
  memo: string | null
  created_by: string
  created_at: string | null
  sites?: { name: string } | { name: string }[] | null
}

type DbProduct = {
  id: string
  code: string
  name: string
  unit: string
  unit_price: number
  category: string | null
  active: boolean
}

type DbSite = {
  id: string
  name: string
}

// ============================================================
// Helper Functions
// ============================================================

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function mapProductRow(row: DbProduct) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    unitPrice: row.unit_price,
    category: row.category,
    active: row.active,
  }
}

// ============================================================
// Products API
// ============================================================

export async function loadProducts(params?: {
  activeOnly?: boolean
  category?: string
}): Promise<Array<{
  id: string
  code: string
  name: string
  unit: string
  unitPrice: number
  category: string | null
  active: boolean
}>> {
  try {
    let query = createClient().from('products').select('*').order('name')

    if (params?.activeOnly !== false) {
      query = query.eq('active', true)
    }
    if (params?.category) {
      query = query.eq('category', params.category)
    }

    const { data, error } = await query
    if (error || !data) return []

    return (data as DbProduct[]).map(mapProductRow)
  } catch {
    return []
  }
}

export async function loadProductById(id: string): Promise<{
  id: string
  code: string
  name: string
  unit: string
  unitPrice: number
  category: string | null
} | null> {
  try {
    const { data, error } = await createClient()
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return mapProductRow(data as DbProduct)
  } catch {
    return null
  }
}

// ============================================================
// Sites API (for production management)
// ============================================================

export async function loadSites(): Promise<Array<{
  id: string
  name: string
}>> {
  try {
    const { data, error } = await createClient()
      .from('sites')
      .select('id, name')
      .eq('active', true)
      .order('name')

    if (error || !data) return []
    return (data as DbSite[]).map(row => ({ id: row.id, name: row.name }))
  } catch {
    return []
  }
}

// ============================================================
// Production Entries API
// ============================================================

export async function loadProductionEntries(params: {
  startDate?: string
  endDate?: string
  siteId?: string | null
  productionType?: ProductionType
  productName?: string
  limit?: number
}): Promise<ProductionEntry[]> {
  try {
    let query = createClient()
      .from('production_entries')
      .select(`
        *,
        sites(name)
      `)
      .order('work_date', { ascending: false })
      .limit(params.limit ?? 100)

    if (params.startDate) query = query.gte('work_date', params.startDate)
    if (params.endDate) query = query.lte('work_date', params.endDate)
    if (params.siteId) query = query.eq('site_id', params.siteId)
    if (params.productionType) query = query.eq('production_type', params.productionType)

    const { data, error } = await query
    if (error || !data) return []

    return (data as DbProductionEntry[]).map(row => {
      const site = firstRelation(row.sites)
      return {
        id: row.id,
        productName: row.product_name,
        productionType: row.production_type as ProductionType,
        quantity: row.quantity,
        unit: row.unit,
        amount: row.amount,
        siteId: row.site_id,
        workDate: row.work_date,
        notes: row.memo,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }
    })
  } catch {
    return []
  }
}

export async function saveProductionEntry(input: {
  id?: string
  productName: string
  productionType: ProductionType
  quantity: number
  workDate: string
  unit: string
  amount: number
  siteId?: string | null
  notes?: string
}): Promise<{ ok: boolean; message: string; id?: string }> {
  try {
    const supabase = createClient()

    const payload = {
      product_name: input.productName,
      production_type: input.productionType,
      quantity: input.quantity,
      unit: input.unit,
      amount: input.amount,
      work_date: input.workDate,
      site_id: input.siteId ?? null,
      memo: input.notes ?? null,
    }

    if (input.id) {
      const { error } = await supabase
        .from('production_entries')
        .update(payload)
        .eq('id', input.id)

      return error
        ? { ok: false, message: '수정에 실패했습니다.' }
        : { ok: true, message: '수정되었습니다.', id: input.id }
    } else {
      const { data, error } = await supabase
        .from('production_entries')
        .insert(payload)
        .select('id')
        .single()

      if (error) return { ok: false, message: '저장에 실패했습니다.' }
      return { ok: true, message: '저장되었습니다.', id: data.id }
    }
  } catch {
    return { ok: false, message: '저장 중 오류가 발생했습니다.' }
  }
}

export async function deleteProductionEntry(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await createClient()
      .from('production_entries')
      .delete()
      .eq('id', id)

    return error
      ? { ok: false, message: '삭제에 실패했습니다.' }
      : { ok: true, message: '삭제되었습니다.' }
  } catch {
    return { ok: false, message: '삭제 중 오류가 발생했습니다.' }
  }
}

// ============================================================
// Production Summary API
// ============================================================

export async function loadProductionSummary(params: {
  startDate: string
  endDate: string
  siteId?: string | null
  productName?: string
}): Promise<ProductionSummary> {
  try {
    const entries = await loadProductionEntries({
      startDate: params.startDate,
      endDate: params.endDate,
      siteId: params.siteId,
      productName: params.productName,
    })

    const summary: ProductionSummary = {
      totalProductionQuantity: 0,
      totalSaleQuantity: 0,
      totalSelfUseQuantity: 0,
      totalTransportCost: 0,
      totalProductionAmount: 0,
      totalSaleAmount: 0,
    }

    for (const entry of entries) {
      switch (entry.productionType) {
        case '생산':
          summary.totalProductionQuantity += entry.quantity
          summary.totalProductionAmount += entry.amount
          break
        case '판매':
          summary.totalSaleQuantity += entry.quantity
          summary.totalSaleAmount += entry.amount
          break
        case '자체사용':
          summary.totalSelfUseQuantity += entry.quantity
          break
        case '운송비':
          summary.totalTransportCost += entry.amount
          break
      }
    }

    return summary
  } catch {
    return {
      totalProductionQuantity: 0,
      totalSaleQuantity: 0,
      totalSelfUseQuantity: 0,
      totalTransportCost: 0,
      totalProductionAmount: 0,
      totalSaleAmount: 0,
    }
  }
}

// ============================================================
// Production Types Helper
// ============================================================

export const PRODUCTION_TYPE_LABELS: Record<ProductionType, string> = {
  '생산': '생산',
  '판매': '판매',
  '자체사용': '자체사용',
  '운송비': '운송비',
}

export const PRODUCTION_TYPE_OPTIONS: Array<{ value: ProductionType; label: string }> = [
  { value: '생산', label: '생산' },
  { value: '판매', label: '판매' },
  { value: '자체사용', label: '자체사용' },
  { value: '운송비', label: '운송비' },
]
