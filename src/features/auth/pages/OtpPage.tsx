import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { OtpCodeInput } from '@/features/auth/components/OtpCodeInput'
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
  const didExpire = useRef(false)

  // Countdown timer
  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1 && !didExpire.current) {
          didExpire.current = true
          setStatus('expired')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendSeconds])

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
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
    didExpire.current = false
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
          <div onPaste={handlePaste}>
            <OtpCodeInput
              value={digits}
              onChange={(next) => {
                setDigits(next)
                if (status !== 'loading' && status !== 'success') {
                  setStatus('idle')
                }
              }}
              disabled={status === 'loading' || status === 'success'}
              hasError={status === 'invalid' || status === 'expired'}
            />
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
