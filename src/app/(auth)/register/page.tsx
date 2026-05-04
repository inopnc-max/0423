'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signUpWithEmail } from '@/lib/auth-utils'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    phone: '',
    affiliation: '',
    title: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password || !form.name || !form.company) {
      setError('필수 항목을 입력해주세요.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!form.affiliation || !form.title) {
      setError('소속과 직함은 필수 입력 항목입니다.')
      return
    }

    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const result = await signUpWithEmail(supabase, form.email, form.password, {
        name: form.name,
        company: form.company,
        role: 'partner',
        phone: form.phone,
        affiliation: form.affiliation,
        title: form.title,
      })

      if (!result.success) {
        setError(result.error || '회원가입에 실패했습니다.')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [form])

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
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
            className="inline-block w-full py-3 bg-[var(--color-navy)] text-white font-medium rounded-lg hover:bg-[var(--color-navy-hover)] transition"
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo_w.png"
            alt="INOPNC Logo"
            width={160}
            height={48}
            priority
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="6자 이상"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="비밀번호 재입력"
                  disabled={loading}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="이름"
                  disabled={loading}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="(예: (주)이노피앤씨)"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  소속 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="affiliation"
                  value={form.affiliation}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="팀장, 매니저 등"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  직함 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="현장소장, 대리 등"
                  disabled={loading}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  연락처
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="010-0000-0000"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Show/Hide Password Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="w-4 h-4"
              />
              <label htmlFor="showPassword" className="text-sm text-[var(--color-text-secondary)]">
                비밀번호 표시
              </label>
            </div>

            {/* Error */}
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
              {loading ? '등록 중...' : '파트너 등록'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-[var(--color-accent)] hover:underline">
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
