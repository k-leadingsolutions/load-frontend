import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type ToastTone = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  tone?: ToastTone
  duration?: number
  onDismiss: () => void
}

const toneMap: Record<ToastTone, { bg: string; text: string; icon: string }> = {
  success: { bg: 'bg-status-success',      text: 'text-white', icon: '✓' },
  error:   { bg: 'bg-status-error',        text: 'text-white', icon: '✕' },
  warning: { bg: 'bg-status-warning',      text: 'text-white', icon: '!' },
  info:    { bg: 'bg-load-600',            text: 'text-white', icon: 'i' },
}

export const Toast = ({ message, tone = 'info', duration = 3500, onDismiss }: ToastProps) => {
  const [visible, setVisible] = useState(true)
  const { bg, text, icon } = toneMap[tone]

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDismiss() }, duration)
    return () => clearTimeout(t)
  }, [duration, onDismiss])

  if (!visible) return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-safe-4 left-1/2 z-50 -translate-x-1/2 animate-slide-up`}
      style={{ bottom: '5rem' }}
    >
      <div className={`flex items-center gap-3 rounded-pill px-5 py-3 shadow-toast ${bg} ${text}`}>
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-bold" aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm font-semibold">{message}</span>
        <button
          type="button"
          onClick={() => { setVisible(false); onDismiss() }}
          aria-label="Dismiss notification"
          className="ml-2 text-white/70 hover:text-white transition"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  )
}
