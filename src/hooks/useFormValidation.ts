'use client'

import { useState, useCallback } from 'react'

/* ── Validation Rules ── */
export type ValidationRule = (value: string) => string | undefined

export const emailValidation: ValidationRule = (value) => {
  if (!value) return undefined
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  return isValid ? undefined : '유효한 이메일 주소를 입력해주세요.'
}

export const passwordValidation: ValidationRule = (value) => {
  if (!value) return undefined
  return value.length < 6 ? '비밀번호는 6자 이상이어야 합니다.' : undefined
}

/* ── Field Config ── */
export interface FormField {
  name: string
  label: string
  type: string
  placeholder: string
  autoComplete: string
  rules: ValidationRule[]
  errorMessages: Record<string, string>
}

/* ── Hook ── */
export function useFormValidation(fields: FormField[]) {
  const initialValues = Object.fromEntries(fields.map((f) => [f.name, '']))
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback(
    (name: string, value: string): string | undefined => {
      const field = fields.find((f) => f.name === name)
      if (!field) return undefined

      for (const rule of field.rules) {
        const error = rule(value)
        if (error) return error
      }
      return undefined
    },
    [fields]
  )

  const handleChange = useCallback(
    (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setValues((prev) => ({ ...prev, [name]: value }))

      if (touched[name]) {
        const error = validateField(name, value)
        setErrors((prev) => ({ ...prev, [name]: error || '' }))
      }
    },
    [touched, validateField]
  )

  const handleBlur = useCallback(
    (name: string) => () => {
      setTouched((prev) => ({ ...prev, [name]: true }))
      const error = validateField(name, values[name])
      setErrors((prev) => ({ ...prev, [name]: error || '' }))
    },
    [values, validateField]
  )

  const validateAll = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {}
    const newTouched: Record<string, boolean> = {}

    for (const field of fields) {
      newTouched[field.name] = true
      const error = validateField(field.name, values[field.name])
      if (error) newErrors[field.name] = error
    }

    setTouched((prev) => ({ ...prev, ...newTouched }))
    setErrors((prev) => ({ ...prev, ...newErrors }))
    return newErrors
  }, [fields, values, validateField])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    validateField,
    reset,
    hasErrors: Object.values(errors).some(Boolean),
  }
}
