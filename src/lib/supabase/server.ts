import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicConfig } from './config'

interface MutableCookie {
  name: string
  value: string
  options?: Record<string, unknown>
}

export async function createServerClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabasePublicConfig()

  return createSupabaseServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: MutableCookie[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore cookie writes in Server Components where mutation is not allowed.
          }
        },
      },
    }
  )
}
