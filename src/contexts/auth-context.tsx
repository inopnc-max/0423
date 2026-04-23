'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchWorkerProfile,
  buildMetadataSession,
  buildProfileSession,
  type AuthSession,
} from '@/lib/auth-utils'
import { getLoginRedirectPath } from '@/lib/routes'

interface AuthContextType {
  user: AuthSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  canAccess: (requiredRoles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession?: AuthSession | null
}) {
  const [user, setUser] = useState<AuthSession | null>(initialSession ?? null)
  const [loading, setLoading] = useState(!initialSession)

  const buildSession = useCallback(
    async (userId: string, email: string, metadata?: Record<string, unknown>) => {
      const supabase = createClient()
      const profile = await fetchWorkerProfile(supabase, userId)
      const profileSession = buildProfileSession(userId, email, profile)
      if (profileSession) return profileSession

      const fallbackSession = buildMetadataSession(userId, email, metadata)
      if (fallbackSession) {
        console.warn('[auth] worker profile unavailable, using auth metadata fallback')
      }
      return fallbackSession
    },
    []
  )

  useEffect(() => {
    if (initialSession) {
      setUser(initialSession)
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }: { data: { session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null } }) => {
        if (session?.user) {
          const builtSession = await buildSession(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata
          )
          if (builtSession) setUser(builtSession)
        }
      })
      .catch((error: unknown) => {
        console.error('[auth] failed to restore session', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [initialSession, buildSession])

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (
      event: string,
      session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null
    ) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        window.location.href = '/login'
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        const builtSession = await buildSession(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata
        )
        if (builtSession) setUser(builtSession)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [buildSession])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !authUser) {
        return { success: false, error: error?.message || 'Login failed.' }
      }

      const profile = await fetchWorkerProfile(supabase, authUser.id)
      const profileSession = buildProfileSession(authUser.id, authUser.email || email, profile)
      if (profileSession) {
        setUser(profileSession)
        return { success: true }
      }

      const fallbackSession = buildMetadataSession(
        authUser.id,
        authUser.email || email,
        authUser.user_metadata
      )

      if (!fallbackSession) {
        await supabase.auth.signOut()
        return {
          success: false,
          error:
            'Login succeeded, but the app profile could not be loaded. Check the Supabase tables or schema cache.',
        }
      }

      console.warn('[auth] worker profile unavailable, using auth metadata fallback')
      setUser(fallbackSession)
      return { success: true }
    } catch (error) {
      console.error('[auth] sign in failed', error)
      return {
        success: false,
        error: 'Supabase connection failed. Check the project URL, keys, and schema state.',
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return

    const supabase = createClient()
    const profile = await fetchWorkerProfile(supabase, user.userId)
    const profileSession = buildProfileSession(user.userId, user.email, profile)
    if (profileSession) {
      setUser(profileSession)
    }
  }, [user])

  const canAccess = useCallback(
    (requiredRoles: string[]) => (user ? requiredRoles.includes(user.role) : false),
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshProfile, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be within AuthProvider')
  return ctx
}

export function useRequireRole(requiredRoles: string[], redirectTo?: string) {
  const { user, loading, canAccess } = useAuth()

  useEffect(() => {
    if (!loading && user && !canAccess(requiredRoles)) {
      window.location.href = redirectTo || getLoginRedirectPath(user.role)
    }
  }, [user, loading, canAccess, requiredRoles, redirectTo])

  return { user, loading, hasAccess: user ? canAccess(requiredRoles) : false }
}
