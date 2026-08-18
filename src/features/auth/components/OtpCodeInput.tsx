import { useRef } from 'react'

interface OtpCodeInputProps {
  disabled?: boolean
  hasError?: boolean
  value: string[]
  onChange: (digits: string[]) => void
}

export const OtpCodeInput = ({ disabled = false, hasError = false, onChange, value }: OtpCodeInputProps) => {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const setDigit = (index: number, nextValue: string) => {
    if (!/^\d?$/.test(nextValue)) return
    const next = [...value]
    next[index] = nextValue
    onChange(next)
    if (nextValue && index < 5) refs.current[index + 1]?.focus()
  }

  return (
    <div className="mt-6 flex justify-between gap-2" aria-label="Enter 6-digit verification code">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={refs[index]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => setDigit(index, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus()
          }}
          disabled={disabled}
          ref={(element) => { refs.current[index] = element }}
          className={`h-control w-12 rounded-card border text-center text-lg font-semibold text-ink transition focus:border-load-500 focus:outline-none focus:ring-2 focus:ring-load-200 ${hasError ? 'border-red-300 bg-red-50' : 'border-card-border bg-load-50'}`}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
