function normalizeSupabaseUrl(url: string | undefined) {
  return (url || '').trim().replace(/\/rest\/v1\/?$/, '')
}

function requireEnvValue(value: string, errorMessage: string) {
  if (!value) {
    throw new Error(errorMessage)
  }

  return value
}

export function getSupabaseUrl() {
  return requireEnvValue(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
    'Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).'
  )
}

export function getSupabasePublishableKey() {
  return requireEnvValue(
    (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
    ).trim(),
    'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
  )
}

export function getSupabaseServiceRoleKey() {
  return requireEnvValue(
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    'Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).'
  )
}

export function getSupabasePublicConfig() {
  return {
    url: getSupabaseUrl(),
    publishableKey: getSupabasePublishableKey(),
  }
}

export { normalizeSupabaseUrl }
