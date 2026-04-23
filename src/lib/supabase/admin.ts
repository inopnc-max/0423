import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './config'

const url = getSupabaseUrl()
const serviceRoleKey = getSupabaseServiceRoleKey()

export const supabaseAdmin = createClient(
  url,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
