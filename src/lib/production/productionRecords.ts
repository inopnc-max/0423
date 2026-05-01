import type { SupabaseClient } from '@supabase/supabase-js'

export type ProductionEntryType = '생산' | '판매' | '자체사용' | '운송비'

export interface ProductionEntrySaveInput {
  workDate: string
  productionType: ProductionEntryType
  productName: string
  quantity: number
  unit?: string
  amount?: number
  siteId?: string | null
  memo?: string | null
}

export async function saveProductionEntry(
  supabase: SupabaseClient,
  input: ProductionEntrySaveInput
): Promise<{ id: string }> {
  const payload = {
    work_date: input.workDate,
    production_type: input.productionType,
    product_name: input.productName,
    quantity: input.quantity,
    unit: input.unit ?? '개',
    amount: input.amount ?? 0,
    site_id: input.siteId ?? null,
    memo: input.memo ?? null,
  }

  const { data, error } = await supabase
    .from('production_entries')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return { id: data.id }
}

export interface ProductionDashboardSummary {
  totalEntries: number
  productionQuantity: number
  salesQuantity: number
  selfUseQuantity: number
  transportAmount: number
  activeProducts: number
  activeClients: number
}

export interface ProductionRecentEntry {
  id: string
  workDate: string
  type: string
  productName: string
  quantity: number
  unit: string
  amount: number
  siteName: string | null
  createdByName: string | null
  memo: string | null
}

export interface ProductionReferenceOption {
  id: string
  name: string
}

export interface ProductionDashboardRecords {
  summary: ProductionDashboardSummary
  recentEntries: ProductionRecentEntry[]
  sites: ProductionReferenceOption[]
  products: ProductionReferenceOption[]
  clients: ProductionReferenceOption[]
}

interface ProductionEntryRow {
  id: string
  work_date: string
  product_name: string
  production_type: string
  quantity: number | string | null
  unit: string | null
  amount: number | null
  memo: string | null
  site?: { name?: string | null } | Array<{ name?: string | null }> | null
  creator?: { name?: string | null } | Array<{ name?: string | null }> | null
}

interface CountResponse {
  count: number | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function countOf(response: CountResponse | null): number {
  return response?.count ?? 0
}

function mapRecentEntry(row: ProductionEntryRow): ProductionRecentEntry {
  const site = firstRelation(row.site)
  const creator = firstRelation(row.creator)

  return {
    id: row.id,
    workDate: row.work_date,
    type: row.production_type,
    productName: row.product_name,
    quantity: toNumber(row.quantity),
    unit: row.unit ?? '',
    amount: row.amount ?? 0,
    siteName: site?.name ?? null,
    createdByName: creator?.name ?? null,
    memo: row.memo,
  }
}

async function safeCount(
  query: PromiseLike<CountResponse & { error?: unknown }>
): Promise<number> {
  try {
    const response = await query
    if (response.error) return 0
    return countOf(response)
  } catch {
    return 0
  }
}

async function safeOptions(
  query: PromiseLike<{ data: Array<{ id: string; name: string }> | null; error?: unknown }>
): Promise<ProductionReferenceOption[]> {
  try {
    const { data, error } = await query
    if (error || !data) return []
    return data.map(row => ({ id: row.id, name: row.name }))
  } catch {
    return []
  }
}

async function getEntries(supabase: SupabaseClient): Promise<ProductionEntryRow[]> {
  try {
    const { data, error } = await supabase
      .from('production_entries')
      .select(`
        id, work_date, product_name, production_type, quantity, unit, amount, memo,
        site:sites(name),
        creator:workers(name)
      `)
      .order('work_date', { ascending: false })
      .limit(80)

    if (error || !data) return []
    return data as ProductionEntryRow[]
  } catch {
    return []
  }
}

export async function getProductionDashboardRecords(
  supabase: SupabaseClient
): Promise<ProductionDashboardRecords> {
  const [entries, activeProducts, activeClients, sites, products, clients] = await Promise.all([
    getEntries(supabase),
    safeCount(supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true)),
    safeCount(supabase.from('production_clients').select('id', { count: 'exact', head: true }).eq('active', true)),
    safeOptions(supabase.from('sites').select('id, name').order('name').limit(100)),
    safeOptions(supabase.from('products').select('id, name').eq('active', true).order('name').limit(100)),
    safeOptions(supabase.from('production_clients').select('id, name').eq('active', true).order('name').limit(100)),
  ])

  const summary = entries.reduce<ProductionDashboardSummary>(
    (acc, row) => {
      const quantity = toNumber(row.quantity)
      const amount = row.amount ?? 0
      acc.totalEntries += 1

      if (row.production_type === '생산') acc.productionQuantity += quantity
      if (row.production_type === '판매') acc.salesQuantity += quantity
      if (row.production_type === '자체사용') acc.selfUseQuantity += quantity
      if (row.production_type === '운송비') acc.transportAmount += amount

      return acc
    },
    {
      totalEntries: 0,
      productionQuantity: 0,
      salesQuantity: 0,
      selfUseQuantity: 0,
      transportAmount: 0,
      activeProducts,
      activeClients,
    }
  )

  return {
    summary,
    recentEntries: entries.slice(0, 8).map(mapRecentEntry),
    sites,
    products,
    clients,
  }
}
