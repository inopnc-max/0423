'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { getLoginRedirectPath } from '@/lib/routes'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    const result = await signIn(email, password)
    if (!result.success) {
      setError(result.error || '로그인에 실패했습니다.')
      return
    }

    const redirectPath = getLoginRedirectPath(result.success ? 'home' : '')
    router.push(redirectPath)
  }, [email, password, signIn, router])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-navy)]">INOPNC</h1>
          <p className="text-[var(--color-text-secondary)] mt-2">통합앱에 로그인하세요</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                placeholder="email@example.com"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  placeholder="비밀번호"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-[var(--color-danger)] bg-red-50 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--color-navy)] text-white font-medium rounded-lg
                         hover:bg-[var(--color-navy-hover)] transition disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-4 text-center">
            <span className="text-[var(--color-text-secondary)] text-sm">파트너 등록은 </span>
            <Link href="/register" className="text-[var(--color-accent)] text-sm font-medium hover:underline">
              여기서 신청
            </Link>
          </div>
        </div>

        {/* Support Contact */}
        <div className="mt-6 p-4 bg-white/50 rounded-xl">
          <p className="text-xs text-[var(--color-text-secondary)] text-center">
            실행오류시{' '}
            <a
              href="mailto:khy972@inopnc.com"
              className="text-[var(--color-accent)] hover:underline font-medium"
            >
              관리자에게 연락하세요
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
