import { useState, useCallback } from 'react'

export interface ValidationRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
}

function validate(value: string, rules: ValidationRules): string {
  const v = value.trim()
  if (rules.required && !v) return 'Required'
  if (rules.minLength != null && v.length < rules.minLength) return `Min ${rules.minLength} characters`
  if (rules.maxLength != null && v.length > rules.maxLength) return `Max ${rules.maxLength} characters`
  if (rules.pattern && v && !rules.pattern.test(v)) return rules.patternMessage ?? 'Invalid format'
  return ''
}

export function useFieldValidation(initialValue: string = '', rules: ValidationRules = {}) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = e.target.value
      setValue(next)
      if (touched) setError(validate(next, rules))
    },
    [rules, touched]
  )

  const onBlur = useCallback(() => {
    setTouched(true)
    setError(validate(value, rules))
  }, [value, rules])

  const validateField = useCallback(() => {
    setTouched(true)
    const err = validate(value, rules)
    setError(err)
    return err
  }, [value, rules])

  const setValueExternal = useCallback((v: string) => {
    setValue(v)
    if (touched) setError(validate(v, rules))
  }, [rules, touched])

  return { value, error, onChange, onBlur, setValue: setValueExternal, validate: validateField }
}
