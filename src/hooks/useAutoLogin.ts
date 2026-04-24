'use client'

import { useCallback, useEffect, useState } from 'react'

const AUTO_LOGIN_KEY = 'supabase_autologin_enabled'

export function useAutoLogin() {
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(AUTO_LOGIN_KEY)
    setAutoLoginEnabled(stored === 'true')
    setIsHydrated(true)
  }, [])

  const enableAutoLogin = useCallback(() => {
    localStorage.setItem(AUTO_LOGIN_KEY, 'true')
    setAutoLoginEnabled(true)
  }, [])

  const disableAutoLogin = useCallback(() => {
    localStorage.setItem(AUTO_LOGIN_KEY, 'false')
    setAutoLoginEnabled(false)
  }, [])

  const toggleAutoLogin = useCallback(() => {
    if (autoLoginEnabled) {
      disableAutoLogin()
    } else {
      enableAutoLogin()
    }
  }, [autoLoginEnabled, enableAutoLogin, disableAutoLogin])

  return {
    autoLoginEnabled,
    isHydrated,
    enableAutoLogin,
    disableAutoLogin,
    toggleAutoLogin,
  }
}
