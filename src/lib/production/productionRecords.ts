import type { SupabaseClient } from '@supabase/supabase-js'

export type ProductionEntryType = '생산' | '판매' | '자체사용' | '운송비'

export type StockMovementType = 'production' | 'sale' | 'self_use'

export interface StockMovementResult {
  success: boolean
  movementCreated: boolean
  movementReverted: boolean
  error?: { code: string; message: string }
}

export interface SaveProductionEntryResult {
  id: string
  movementResult: StockMovementResult
}

export interface UpdateProductionEntryResult {
  id: string
  movementResult: StockMovementResult
}

function getStockMovementType(type: ProductionEntryType): StockMovementType | null {
  if (type === '생산') return 'production'
  if (type === '판매') return 'sale'
  if (type === '자체사용') return 'self_use'
  return null
}

async function recordStockMovement(
  supabase: SupabaseClient,
  entryId: string,
  productionType: ProductionEntryType,
  productId: string | null | undefined,
  quantity: number,
  workDate: string,
  siteId: string | null | undefined,
  memo: string | null | undefined,
  createdBy: string
): Promise<StockMovementResult> {
  const movementType = getStockMovementType(productionType)
  if (!movementType) {
    return { success: true, movementCreated: false, movementReverted: false }
  }

  if (!productId) {
    console.warn(`[productionRecords] Product ID not provided for stock movement: entry=${entryId}, type=${productionType}`)
    return {
      success: false,
      movementCreated: false,
      movementReverted: false,
      error: { code: 'MISSING_PRODUCT_ID', message: `품목 ID가 없습니다: ${productionType}` }
    }
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
    return {
      success: false,
      movementCreated: false,
      movementReverted: false,
      error: { code: 'RPC_ERROR', message: error.message }
    }
  }

  return { success: true, movementCreated: true, movementReverted: false }
}

async function upsertStockMovement(
  supabase: SupabaseClient,
  entryId: string,
  productionType: ProductionEntryType,
  productId: string | null | undefined,
  quantity: number,
  workDate: string,
  siteId: string | null | undefined,
  memo: string | null | undefined,
  createdBy: string
): Promise<StockMovementResult> {
  const movementType = getStockMovementType(productionType)

  if (!movementType) {
    const reverseResult = await reverseStockMovement(supabase, entryId)
    return { success: true, movementCreated: false, movementReverted: reverseResult.reversed }
  }

  if (!productId) {
    console.warn(`[productionRecords] Product ID not provided for stock movement upsert: entry=${entryId}, type=${productionType}`)
    const reverseResult = await reverseStockMovement(supabase, entryId)
    return {
      success: false,
      movementCreated: false,
      movementReverted: reverseResult.reversed,
      error: { code: 'MISSING_PRODUCT_ID', message: `품목 ID가 없습니다: ${productionType}` }
    }
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
    return {
      success: false,
      movementCreated: false,
      movementReverted: false,
      error: { code: 'RPC_ERROR', message: error.message }
    }
  }

  return { success: true, movementCreated: true, movementReverted: false }
}

async function reverseStockMovement(
  supabase: SupabaseClient,
  entryId: string
): Promise<{ reversed: boolean }> {
  const { error } = await supabase.rpc('reverse_production_stock_movement', {
    p_source_table: 'production_entries',
    p_source_id: entryId,
  })

  if (error) {
    console.error('[productionRecords] Failed to reverse stock movement:', error)
    return { reversed: false }
  }

  return { reversed: true }
}

export interface ProductionEntrySaveInput {
  workDate: string
  productionType: ProductionEntryType
  productId?: string | null
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
  productId?: string | null
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
): Promise<UpdateProductionEntryResult> {
  const { data, error } = await supabase.rpc('update_production_entry_with_movement', {
    p_id: id,
    p_work_date: input.workDate,
    p_production_type: input.productionType,
    p_product_id: input.productId ?? null,
    p_product_name: input.productName,
    p_quantity: input.quantity,
    p_unit: input.unit ?? '개',
    p_amount: input.amount ?? 0,
    p_site_id: input.siteId ?? null,
    p_memo: input.memo ?? null,
    p_created_by: input.createdBy,
  })

  if (error) {
    console.error('[productionRecords] update_production_entry_with_movement failed:', error)
    throw new Error(error.message)
  }

  const result = data as { id: string; movement_created: boolean; movement_id: string | null }
  return {
    id: result.id,
    movementResult: {
      success: true,
      movementCreated: result.movement_created,
      movementReverted: false
    }
  }
}

export async function deleteProductionEntry(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.rpc('delete_production_entry_with_movement', {
    p_id: id,
  })

  if (error) {
    console.error('[productionRecords] delete_production_entry_with_movement failed:', error)
    throw new Error(error.message)
  }
}

export async function saveProductionEntry(
  supabase: SupabaseClient,
  input: ProductionEntrySaveInput
): Promise<SaveProductionEntryResult> {
  const { data, error } = await supabase.rpc('save_production_entry_with_movement', {
    p_work_date: input.workDate,
    p_production_type: input.productionType,
    p_product_id: input.productId ?? null,
    p_product_name: input.productName,
    p_quantity: input.quantity,
    p_unit: input.unit ?? '개',
    p_amount: input.amount ?? 0,
    p_site_id: input.siteId ?? null,
    p_memo: input.memo ?? null,
    p_created_by: input.createdBy,
  })

  if (error) {
    console.error('[productionRecords] save_production_entry_with_movement failed:', error)
    throw new Error(error.message)
  }

  const result = data as { id: string; movement_created: boolean; movement_id: string | null }
  return {
    id: result.id,
    movementResult: {
      success: true,
      movementCreated: result.movement_created,
      movementReverted: false
    }
  }
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

export async function ensureProductionProduct(
  supabase: SupabaseClient,
  productName: string
): Promise<ProductionReferenceOption> {
  const normalizedName = productName.trim()
  if (!normalizedName) {
    throw new Error('품목명을 입력해주세요.')
  }

  const code = normalizedName.toUpperCase().replace(/\s+/g, '-')

  const { data: existing, error: selectError } = await supabase
    .from('products')
    .select('id, name')
    .eq('code', code)
    .maybeSingle()

  if (selectError) {
    throw new Error(selectError.message)
  }

  if (existing) {
    return { id: existing.id, name: existing.name }
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      code,
      name: normalizedName,
      unit: 'EA',
      unit_price: 0,
      category: '직접입력',
      active: true,
    })
    .select('id, name')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? '품목 생성에 실패했습니다.')
  }

  return { id: data.id, name: data.name }
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

interface ProductionEntryAggregationRow {
  production_type: string
  quantity: number | string | null
  amount: number | null
}

async function getSummaryAggregation(
  supabase: SupabaseClient
): Promise<Pick<ProductionDashboardSummary, 'totalEntries' | 'productionQuantity' | 'salesQuantity' | 'selfUseQuantity' | 'transportAmount'>> {
  try {
    const { data, error } = await supabase
      .from('production_entries')
      .select('production_type, quantity, amount')

    if (error || !data) {
      return { totalEntries: 0, productionQuantity: 0, salesQuantity: 0, selfUseQuantity: 0, transportAmount: 0 }
    }

    const rows = data as ProductionEntryAggregationRow[]
    return rows.reduce(
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
      { totalEntries: 0, productionQuantity: 0, salesQuantity: 0, selfUseQuantity: 0, transportAmount: 0 }
    )
  } catch {
    return { totalEntries: 0, productionQuantity: 0, salesQuantity: 0, selfUseQuantity: 0, transportAmount: 0 }
  }
}

export async function getProductionDashboardRecords(
  supabase: SupabaseClient
): Promise<ProductionDashboardRecords> {
  const [entries, aggregation, activeProducts, activeClients, sites, products, clients] = await Promise.all([
    getEntries(supabase),
    getSummaryAggregation(supabase),
    safeCount(supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true)),
    safeCount(supabase.from('production_clients').select('id', { count: 'exact', head: true }).eq('active', true)),
    safeOptions(supabase.from('sites').select('id, name').order('name').limit(100)),
    safeOptions(supabase.from('products').select('id, name').eq('active', true).order('name').limit(100)),
    safeOptions(supabase.from('production_clients').select('id, name').eq('active', true).order('name').limit(100)),
  ])

  const summary: ProductionDashboardSummary = {
    ...aggregation,
    activeProducts,
    activeClients,
  }

  return {
    summary,
    recentEntries: entries.map(mapRecentEntry),
    sites,
    products,
    clients,
  }
}
