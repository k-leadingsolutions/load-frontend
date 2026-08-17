import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'

export const SplashPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate(appPaths.welcome, { replace: true }), 2200)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-load-500 to-load-700">
      <div className="text-center">
        <h1 className="text-6xl font-light tracking-tight text-white">load</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.25em] text-white/70">
          Laundry · Coffee · More
        </p>
      </div>
      <p className="absolute bottom-16 text-sm text-white/60">Life, well loaded.</p>
    </div>
  )
}
