'use client'

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Product {
  id: string
  code: string
  name: string
  unit: string
  unit_price: number
  category: string | null
  safety_stock: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ProductOption {
  id: string
  name: string
}

export interface CreateProductInput {
  name: string
  unit?: string
  category?: string
  unit_price?: number
}

export interface UpdateProductInput {
  name?: string
  unit?: string
  category?: string
  unit_price?: number
  active?: boolean
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    unit: row.unit as string,
    unit_price: Number(row.unit_price) || 0,
    category: row.category as string | null,
    safety_stock: Number(row.safety_stock) || 0,
    active: row.active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

interface ProductRow {
  id: string
  name: string
}

function toOption(product: ProductRow): ProductOption {
  return { id: product.id, name: product.name }
}

export async function getProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error || !data) {
    console.error('[productManagement] getProducts failed:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(mapProduct)
}

export async function getActiveProducts(supabase: SupabaseClient): Promise<ProductOption[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (error || !data) {
    return []
  }

  return ((data as unknown) as ProductRow[]).map(toOption)
}

export async function createProduct(
  supabase: SupabaseClient,
  input: CreateProductInput
): Promise<Product> {
  const code = input.name.trim().toUpperCase().replace(/\s+/g, '-')

  const { data, error } = await supabase
    .from('products')
    .insert({
      code,
      name: input.name.trim(),
      unit: input.unit ?? 'EA',
      category: input.category ?? null,
      unit_price: input.unit_price ?? 0,
      active: true,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? '품목 생성에 실패했습니다.')
  }

  return mapProduct(data as Record<string, unknown>)
}

export async function updateProduct(
  supabase: SupabaseClient,
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name.trim()
  if (input.unit !== undefined) updateData.unit = input.unit
  if (input.category !== undefined) updateData.category = input.category
  if (input.unit_price !== undefined) updateData.unit_price = input.unit_price
  if (input.active !== undefined) updateData.active = input.active

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? '품목 수정에 실패했습니다.')
  }

  return mapProduct(data as Record<string, unknown>)
}

export async function toggleProductActive(
  supabase: SupabaseClient,
  id: string,
  active: boolean
): Promise<Product> {
  return updateProduct(supabase, id, { active })
}

export async function deleteProduct(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
