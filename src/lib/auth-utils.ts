import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeRole, type Role } from './roles'

export interface AuthSession {
  userId: string
  email: string
  role: Role
  company: string
  siteIds: string[]
  profile: {
    name: string
    phone?: string
    daily?: number
    affiliation?: string
    title?: string
  }
}

export interface WorkerProfile {
  id: string
  email: string
  name: string
  role: Role
  company: string
  phone?: string
  daily?: number
  site_ids: string[]
  affiliation?: string
  title?: string
}

/* ─── Session Builders ─── */

function extractProfileFromMetadata(
  email: string,
  metadata?: Record<string, unknown>
): AuthSession['profile'] {
  return {
    name:
      typeof metadata?.name === 'string' && metadata.name.length > 0
        ? metadata.name
        : email.split('@')[0] || 'User',
    phone: typeof metadata?.phone === 'string' ? metadata.phone : undefined,
    daily: typeof metadata?.daily === 'number' ? metadata.daily : undefined,
    affiliation: typeof metadata?.affiliation === 'string' ? metadata.affiliation : undefined,
    title: typeof metadata?.title === 'string' ? metadata.title : undefined,
  }
}

export function buildMetadataSession(
  userId: string,
  email: string,
  metadata?: Record<string, unknown>
): AuthSession | null {
  const roleValue = typeof metadata?.role === 'string' ? metadata.role : ''
  if (!roleValue) return null

  const siteIds = Array.isArray(metadata?.site_ids)
    ? metadata.site_ids.filter((id): id is string => typeof id === 'string')
    : []

  return {
    userId,
    email,
    role: normalizeRole(roleValue),
    company: typeof metadata?.company === 'string' ? metadata.company : '',
    siteIds,
    profile: extractProfileFromMetadata(email, metadata),
  }
}

export function buildProfileSession(
  userId: string,
  email: string,
  profile: WorkerProfile | null
): AuthSession | null {
  if (!profile) return null

  return {
    userId,
    email,
    role: normalizeRole(profile.role),
    company: profile.company,
    siteIds: profile.site_ids || [],
    profile: {
      name: profile.name,
      phone: profile.phone,
      daily: profile.daily,
      affiliation: profile.affiliation,
      title: profile.title,
    },
  }
}

export async function fetchWorkerProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkerProfile | null> {
  const { data, error } = await supabase
    .from('workers')
    .select('id, email, name, role, company, phone, daily, site_ids, affiliation, title')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return { ...data, role: normalizeRole(data.role) } as WorkerProfile
}

export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user)
    return { success: false, error: authError?.message || '로그인에 실패했습니다.' }

  const profile = await fetchWorkerProfile(supabase, authData.user.id)
  if (!profile) {
    await supabase.auth.signOut()
    return { success: false, error: '사용자 프로필을 찾을 수 없습니다.' }
  }

  return {
    success: true,
    session: {
      userId: authData.user.id,
      email: authData.user.email || email,
      role: normalizeRole(profile.role),
      company: profile.company,
      siteIds: profile.site_ids || [],
      profile: {
        name: profile.name,
        phone: profile.phone,
        daily: profile.daily,
        affiliation: profile.affiliation,
        title: profile.title,
      },
    },
  }
}

export async function signUpWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string,
  metadata: {
    name: string
    company: string
    role: string
    phone?: string
    affiliation?: string
    title?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })

  if (error) return { success: false, error: error.message }

  if (data.user) {
    await supabase.from('workers').upsert({
      id: data.user.id,
      email,
      name: metadata.name,
      company: metadata.company,
      role: metadata.role,
      phone: metadata.phone,
      affiliation: metadata.affiliation,
      title: metadata.title,
    })
  }

  return { success: true }
}
