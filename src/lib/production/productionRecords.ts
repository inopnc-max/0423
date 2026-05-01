import type { SupabaseClient } from '@supabase/supabase-js'

export type ProductionEntryType = '생산' | '판매' | '자체사용' | '운송비'

export type StockMovementType = 'production' | 'sale' | 'self_use'

function getStockMovementType(type: ProductionEntryType): StockMovementType | null {
  if (type === '생산') return 'production'
  if (type === '판매') return 'sale'
  if (type === '자체사용') return 'self_use'
  return null
}

async function getProductIdByName(
  supabase: SupabaseClient,
  productName: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('name', productName)
    .eq('active', true)
    .single()

  if (error || !data) return null
  return data.id
}

async function recordStockMovement(
  supabase: SupabaseClient,
  entryId: string,
  productionType: ProductionEntryType,
  productName: string,
  quantity: number,
  workDate: string,
  siteId: string | null | undefined,
  memo: string | null | undefined,
  createdBy: string
): Promise<void> {
  const movementType = getStockMovementType(productionType)
  if (!movementType) return

  const productId = await getProductIdByName(supabase, productName)
  if (!productId) {
    console.warn(`[productionRecords] Product not found: ${productName}`)
    return
  }

  const { error } = await supabase.rpc('record_production_stock_movement', {
    p_product_id: productId,
    p_movement_date: workDate,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_unit_price: 0,
    p_source_table: 'production_entries',
    p_source_id: entryId,
    p_site_id: siteId ?? null,
    p_created_by: createdBy,
    p_notes: memo ?? null,
  })

  if (error) {
    console.error('[productionRecords] Failed to record stock movement:', error)
  }
}

async function upsertStockMovement(
  supabase: SupabaseClient,
  entryId: string,
  productionType: ProductionEntryType,
  productName: string,
  quantity: number,
  workDate: string,
  siteId: string | null | undefined,
  memo: string | null | undefined,
  createdBy: string
): Promise<void> {
  const movementType = getStockMovementType(productionType)

  if (!movementType) {
    await reverseStockMovement(supabase, entryId)
    return
  }

  const productId = await getProductIdByName(supabase, productName)
  if (!productId) {
    console.warn(`[productionRecords] Product not found: ${productName}`)
    return
  }

  const { error } = await supabase.rpc('upsert_production_stock_movement', {
    p_product_id: productId,
    p_movement_date: workDate,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_unit_price: 0,
    p_source_table: 'production_entries',
    p_source_id: entryId,
    p_site_id: siteId ?? null,
    p_created_by: createdBy,
    p_notes: memo ?? null,
  })

  if (error) {
    console.error('[productionRecords] Failed to upsert stock movement:', error)
  }
}

async function reverseStockMovement(
  supabase: SupabaseClient,
  entryId: string
): Promise<void> {
  const { error } = await supabase.rpc('reverse_production_stock_movement', {
    p_source_table: 'production_entries',
    p_source_id: entryId,
  })

  if (error) {
    console.error('[productionRecords] Failed to reverse stock movement:', error)
  }
}

export interface ProductionEntrySaveInput {
  workDate: string
  productionType: ProductionEntryType
  productName: string
  quantity: number
  unit?: string
  amount?: number
  siteId?: string | null
  memo?: string | null
  createdBy: string
}

export interface ProductionEntryUpdateInput {
  workDate: string
  productionType: ProductionEntryType
  productName: string
  quantity: number
  unit?: string
  amount?: number
  siteId?: string | null
  memo?: string | null
  createdBy: string
}

export async function updateProductionEntry(
  supabase: SupabaseClient,
  id: string,
  input: ProductionEntryUpdateInput
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
    .update(payload)
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await upsertStockMovement(
    supabase,
    id,
    input.productionType,
    input.productName,
    input.quantity,
    input.workDate,
    input.siteId,
    input.memo,
    input.createdBy
  )

  return { id: data.id }
}

export async function deleteProductionEntry(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  await reverseStockMovement(supabase, id)

  const { error } = await supabase
    .from('production_entries')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
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
    created_by: input.createdBy,
  }

  const { data, error } = await supabase
    .from('production_entries')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await recordStockMovement(
    supabase,
    data.id,
    input.productionType,
    input.productName,
    input.quantity,
    input.workDate,
    input.siteId,
    input.memo,
    input.createdBy
  )

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
  createdBy: string | null
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
  creator?: { name?: string | null; id?: string | null } | Array<{ name?: string | null; id?: string | null }> | null
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
    createdBy: creator?.id ?? null,
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
        creator:workers(id, name)
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
    recentEntries: entries.map(mapRecentEntry),
    sites,
    products,
    clients,
  }
}
