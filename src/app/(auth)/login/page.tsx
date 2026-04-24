'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { getLoginRedirectPath } from '@/lib/routes'
import { AlertBox } from '@/components/ui'
import {
  useFormValidation,
  emailValidation,
  passwordValidation,
  type FormField,
} from '@/hooks'

/* ── Form Field Config ── */
const LOGIN_FIELDS: FormField[] = [
  {
    name: 'email',
    label: '이메일',
    type: 'email',
    placeholder: 'email@example.com',
    autoComplete: 'username',
    rules: [emailValidation],
    errorMessages: {},
  },
  {
    name: 'password',
    label: '비밀번호',
    type: 'password',
    placeholder: '비밀번호',
    autoComplete: 'current-password',
    rules: [passwordValidation],
    errorMessages: {},
  },
]

/* ── Validation Messages ── */
const EMPTY_FIELD_MESSAGE = '이메일과 비밀번호를 입력해주세요.'

/* ── Component ── */
export default function LoginPage() {
  const router = useRouter()
  const { signIn, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { values, errors, handleChange, handleBlur, validateAll, hasErrors } =
    useFormValidation(LOGIN_FIELDS)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitError('')

      /* Validate all fields */
      const validationErrors = validateAll()
      if (Object.keys(validationErrors).length > 0) {
        const hasEmptyField = !values.email || !values.password
        if (hasEmptyField) {
          setSubmitError(EMPTY_FIELD_MESSAGE)
        }
        return
      }

      /* Sign in */
      const result = await signIn(values.email.trim().toLowerCase(), values.password)
      if (!result.success) {
        setSubmitError(result.error || '로그인에 실패했습니다.')
        return
      }

      router.push(getLoginRedirectPath(result.success ? 'home' : ''))
    },
    [values, signIn, router, validateAll]
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/images/logo.png" alt="INOPNC" className="h-10 mx-auto" />
          <p className="text-[var(--color-text-secondary)] mt-3">계정으로 로그인하세요.</p>
        </div>

        {/* Login Form */}
        <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                value={values.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                className={`w-full h-12 pl-4 pr-4 rounded-xl border bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)] ${
                  errors.email ? 'border-[var(--color-danger)] ring-2 ring-[var(--color-danger-ring)]' : 'border-[var(--form-border)]'
                }`}
                placeholder="email@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2"
              >
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={showPassword ? 'off' : 'current-password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={values.password}
                  onChange={handleChange('password')}
                  onBlur={handleBlur('password')}
                  className={`w-full h-12 pl-4 pr-14 rounded-xl border bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)] ${
                    errors.password ? 'border-[var(--color-danger)] ring-2 ring-[var(--color-danger-ring)]' : 'border-[var(--form-border)]'
                  }`}
                  placeholder="비밀번호"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[var(--form-icon)] hover:text-[var(--form-icon-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{errors.password}</p>
              )}
            </div>

            {/* Submit Error */}
            {submitError && <AlertBox message={submitError} variant="danger" />}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[var(--color-primary-strong)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-4 text-center">
            <span className="text-[var(--color-text-secondary)] text-sm">아직 계정이 없으신가요? </span>
            <Link href="/register" className="text-[var(--color-primary-strong)] text-sm font-semibold hover:underline">
              회원가입
            </Link>
          </div>
        </div>

        {/* Support Contact */}
        <div className="mt-6 p-4 bg-[var(--color-bg-surface)] rounded-xl">
          <p className="text-xs text-[var(--color-text-sub)] text-center">
            실행오류시{' '}
            <a href="mailto:khy972@inopnc.com" className="text-[var(--color-primary-strong)] hover:underline font-semibold">
              관리자에게 연락하세요
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
