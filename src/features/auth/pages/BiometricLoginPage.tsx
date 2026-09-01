import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { appPaths } from '@/app/router/paths'
import { mockAuthService } from '@/services/mock'

export const BiometricLoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle')
  const [method, setMethod] = useState<'FACE_ID' | 'FINGERPRINT'>('FACE_ID')

  const handleBiometric = async () => {
    setStatus('scanning')
    try {
      const response = await mockAuthService.biometricLogin('mock-face-id-credential')
      if (response.status === 'success' && response.data) {
        setStatus('success')
        // Use login to set the session
        await login({ mobileNumber: response.data.mobileNumber, password: 'Load@1234' })
        setTimeout(() => navigate(appPaths.customerHome, { replace: true }), 800)
      } else {
        setStatus('failed')
      }
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel text-center">
          <h1 className="text-heading text-ink">Welcome back</h1>
          <p className="mt-2 text-body text-muted">Login using biometrics</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-pill bg-load-50 p-1">
            <button
              type="button"
              onClick={() => setMethod('FACE_ID')}
              className={`h-9 rounded-pill text-xs font-semibold transition ${method === 'FACE_ID' ? 'bg-white text-load-700 shadow-card' : 'text-muted'}`}
            >
              Face ID
            </button>
            <button
              type="button"
              onClick={() => setMethod('FINGERPRINT')}
              className={`h-9 rounded-pill text-xs font-semibold transition ${method === 'FINGERPRINT' ? 'bg-white text-load-700 shadow-card' : 'text-muted'}`}
            >
              Fingerprint
            </button>
          </div>

          {/* biometric graphic */}
          <button
            type="button"
            onClick={handleBiometric}
            disabled={status === 'scanning' || status === 'success'}
            className="mx-auto mt-10 flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-load-200 bg-load-50 transition hover:border-load-400 hover:bg-load-100 disabled:cursor-not-allowed"
            aria-label="Authenticate with Face ID"
          >
            <span className="text-5xl" aria-hidden="true">
              {status === 'success' ? '✓' : status === 'failed' ? '✗' : method === 'FACE_ID' ? '🔐' : '🖐️'}
            </span>
            <span className="mt-2 text-caption font-semibold text-load-600">
              {status === 'scanning' ? 'Scanning…' : status === 'success' ? 'Verified' : status === 'failed' ? 'Failed' : method === 'FACE_ID' ? 'Face ID' : 'Fingerprint'}
            </span>
          </button>

          {status === 'failed' ? (
            <p role="alert" className="mt-6 text-sm text-red-600">
              Biometric authentication failed. Please try again.
            </p>
          ) : null}

          <div className="mt-8">
            <Link to={appPaths.login} className="text-sm font-medium text-load-600 hover:text-load-700">
              Use Password Instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
