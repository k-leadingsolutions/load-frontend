import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { mockAuthService } from '@/services/mock'

type OtpState = 'idle' | 'loading' | 'success' | 'invalid' | 'expired'

const RESEND_SECONDS = 25

export const OtpPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { mobileNumber?: string } | null
  const mobileNumber = locationState?.mobileNumber ?? '+27 82 ••• ••••'

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [status, setStatus] = useState<OtpState>('idle')
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS)
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null)) // eslint-disable-line react-hooks/rules-of-hooks

  // Countdown timer
  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setInterval(() => setResendSeconds((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendSeconds])

  const handleDigitInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    setStatus('idle')
    if (value && index < 5) {
      refs[index + 1]?.current?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1]?.current?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      refs[5]?.current?.focus()
    }
  }

  const handleVerify = useCallback(async () => {
    const code = digits.join('')
    if (code.length < 6) return
    setStatus('loading')
    try {
      const result = await mockAuthService.verifyOtp(mobileNumber, code)
      if (result.valid) {
        setStatus('success')
        setTimeout(() => navigate(appPaths.customerHome, { replace: true }), 1000)
      } else {
        setStatus('invalid')
      }
    } catch {
      setStatus('invalid')
    }
  }, [digits, mobileNumber, navigate])

  const handleResend = async () => {
    setResendSeconds(RESEND_SECONDS)
    setDigits(Array(6).fill(''))
    setStatus('idle')
    await mockAuthService.sendOtp(mobileNumber)
  }

  const code = digits.join('')
  const isComplete = code.length === 6

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
          {/* Header */}
          <h1 className="text-heading text-ink">Verify Your Number</h1>
          <p className="mt-2 text-body text-muted">
            We've sent a 6-digit code to{' '}
            <span className="font-semibold text-load-600">{mobileNumber}</span>
          </p>

          {/* Status messages */}
          {status === 'invalid' ? (
            <div role="alert" className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Invalid code. Please try again.
            </div>
          ) : null}
          {status === 'expired' ? (
            <div role="alert" className="mt-4 rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Code expired. Tap "Resend code" below.
            </div>
          ) : null}
          {status === 'success' ? (
            <div role="status" className="mt-4 rounded-card border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              ✓ Verified! Redirecting…
            </div>
          ) : null}

          {/* OTP digit inputs */}
          <div className="mt-6 flex justify-between gap-2" onPaste={handlePaste} aria-label="Enter 6-digit verification code">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={status === 'loading' || status === 'success'}
                className={`h-12 w-12 rounded-card border text-center text-lg font-semibold text-ink transition focus:border-load-500 focus:outline-none focus:ring-2 focus:ring-load-200
                  ${status === 'invalid' ? 'border-red-400 bg-red-50' : 'border-card-border bg-load-50'}
                  ${status === 'success' ? 'border-green-400 bg-green-50' : ''}
                `}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Resend */}
          <div className="mt-4 text-center">
            {resendSeconds > 0 ? (
              <p className="text-body text-muted">
                Resend code in{' '}
                <span className="font-semibold text-load-600">
                  00:{String(resendSeconds).padStart(2, '0')}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-sm font-semibold text-load-600 hover:text-load-700"
              >
                Resend code
              </button>
            )}
          </div>

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={!isComplete || status === 'loading' || status === 'success'}
            className="mt-6 h-12 w-full rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Verifying…' : status === 'success' ? '✓ Verified' : 'Verify'}
          </button>

          {/* Hint for demo */}
          <p className="mt-4 text-center text-caption text-muted">
            Demo: enter any 6 digits to verify
          </p>
        </div>
      </div>
    </div>
  )
}
