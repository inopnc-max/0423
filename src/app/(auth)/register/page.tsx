'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, User, Briefcase, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signUpWithEmail, INOPNC_COMPANY, type SignupRole } from '@/lib/auth-utils'
import { AlertBox } from '@/components/ui'

/* ── Role Config ── */
const ROLE_OPTIONS: { value: SignupRole; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: 'worker',
    label: '작업자',
    desc: '(주)이노피앤씨 소속 작업자',
    icon: User,
  },
  {
    value: 'site_manager',
    label: '현장관리자',
    desc: '(주)이노피앤씨 소속 현장관리자',
    icon: Briefcase,
  },
  {
    value: 'partner',
    label: '파트너',
    desc: '협력업체 소속',
    icon: Building2,
  },
]

/* ── Form Config ── */
interface FormValues {
  email: string
  password: string
  confirmPassword: string
  name: string
  company: string
  phone: string
  title: string
}

/* ── Validation ── */
const EMPTY_FIELD_MESSAGE = '필수 항목을 입력해주세요.'
const PASSWORD_MISMATCH_MESSAGE = '비밀번호가 일치하지 않습니다.'
const PASSWORD_TOO_SHORT_MESSAGE = '비밀번호는 6자 이상이어야 합니다.'

function validateForm(values: FormValues, role: SignupRole): string | null {
  if (!values.email || !values.password || !values.confirmPassword || !values.name) {
    return EMPTY_FIELD_MESSAGE
  }

  if (values.password !== values.confirmPassword) {
    return PASSWORD_MISMATCH_MESSAGE
  }

  if (values.password.length < 6) {
    return PASSWORD_TOO_SHORT_MESSAGE
  }

  if (role === 'partner' && !values.company.trim()) {
    return EMPTY_FIELD_MESSAGE
  }

  return null
}

/* ── Component ── */
export default function RegisterPage() {
  const [step, setStep] = useState<'role' | 'form'>('role')
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null)
  const [values, setValues] = useState<FormValues>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    phone: '',
    title: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRoleSelect = (role: SignupRole) => {
    setSelectedRole(role)
    setStep('form')
  }

  const handleBackToRole = () => {
    setStep('role')
    setSelectedRole(null)
    setError('')
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return

    setError('')
    const validationError = validateForm(values, selectedRole)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const result = await signUpWithEmail(supabase, values.email, values.password, {
        name: values.name,
        role: selectedRole,
        company: selectedRole === 'partner' ? values.company : INOPNC_COMPANY,
        phone: values.phone || undefined,
        title: values.title || undefined,
      })

      if (!result.success) {
        setError(result.error || '회원가입에 실패했습니다.')
        return
      }

      setSuccess(true)
    } catch {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [values, selectedRole])

  /* ── Success ── */
  if (success) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center p-4">
        <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-navy)] mb-2">회원가입 완료</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            이메일 인증을 완료한 후 로그인해주세요.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-3 bg-[var(--color-primary-strong)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-hover)] transition"
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  /* ── Role Selection ── */
  if (step === 'role') {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/images/logo.png" alt="INOPNC" className="h-10 mx-auto" />
            <p className="text-[var(--color-text-secondary)] mt-3">회원 유형을 선택하세요.</p>
          </div>

          {/* Role Options */}
          <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-lg p-6 space-y-3">
            {ROLE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRoleSelect(value)}
                className="w-full p-4 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-page)] transition text-left flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-page)] flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[var(--color-primary-strong)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--color-text-main)]">{label}</p>
                  <p className="text-sm text-[var(--color-text-sub)]">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Login Link */}
          <div className="mt-4 text-center">
            <span className="text-[var(--color-text-secondary)] text-sm">이미 계정이 있으신가요? </span>
            <Link href="/login" className="text-[var(--color-primary-strong)] text-sm font-semibold hover:underline">
              로그인
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ── Registration Form ── */
  const roleLabel = selectedRole ? ROLE_OPTIONS.find(r => r.value === selectedRole)?.label : ''

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/images/logo.png" alt="INOPNC" className="h-10 mx-auto" />
          <p className="text-[var(--color-text-secondary)] mt-3">{roleLabel} 등록</p>
        </div>

        {/* Form */}
        <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                value={values.email}
                onChange={handleChange}
                className="w-full h-12 pl-4 pr-4 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                placeholder="email@example.com"
                disabled={loading}
              />
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={showPassword ? 'off' : 'new-password'}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={values.password}
                    onChange={handleChange}
                    className="w-full h-12 pl-4 pr-12 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                    placeholder="6자 이상"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete={showPassword ? 'off' : 'new-password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={values.confirmPassword}
                  onChange={handleChange}
                  className="w-full h-12 pl-4 pr-4 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                  placeholder="비밀번호 재입력"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                autoComplete="name"
                value={values.name}
                onChange={handleChange}
                className="w-full h-12 pl-4 pr-4 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                placeholder="이름"
                disabled={loading}
              />
            </div>

            {/* Company (Partner only) */}
            {selectedRole === 'partner' && (
              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  id="company"
                  type="text"
                  name="company"
                  autoComplete="organization"
                  value={values.company}
                  onChange={handleChange}
                  className="w-full h-12 pl-4 pr-4 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                  placeholder="예 : 이노피앤씨"
                  disabled={loading}
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2">
                직함
              </label>
              <input
                id="title"
                type="text"
                name="title"
                value={values.title}
                onChange={handleChange}
                className="w-full h-12 pl-4 pr-4 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                placeholder="현장소장, 대리 등"
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-[var(--color-text-sub)] mb-2">
                연락처
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={handleChange}
                className="w-full h-12 pl-4 pr-4 rounded-xl border border-[var(--form-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-main)] text-base font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                placeholder="010-0000-0000"
                disabled={loading}
              />
            </div>

            {/* Show/Hide Password */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="w-4 h-4"
              />
              <label htmlFor="showPassword" className="text-sm text-[var(--color-text-sub)]">
                비밀번호 표시
              </label>
            </div>

            {/* Error */}
            {error && <AlertBox message={error} variant="danger" />}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[var(--color-primary-strong)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50"
            >
              {loading ? '등록 중...' : `${roleLabel} 등록`}
            </button>

            {/* Back to Role Selection */}
            <button
              type="button"
              onClick={handleBackToRole}
              className="w-full py-2 text-sm text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] transition"
            >
              ← 회원 유형 다시 선택
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-4 text-center">
            <span className="text-[var(--color-text-secondary)] text-sm">이미 계정이 있으신가요? </span>
            <Link href="/login" className="text-[var(--color-primary-strong)] text-sm font-semibold hover:underline">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
