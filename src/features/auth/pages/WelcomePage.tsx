import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'

export const WelcomePage = () => (
  <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
    <div className="w-full max-w-sm text-center">
      <span className="text-5xl font-light tracking-tight text-load-600">load</span>
      <p className="mt-2 text-xs uppercase tracking-widest text-muted">Laundry · Coffee · More</p>

      <div className="mt-10">
        <h1 className="text-display text-ink">Life, well loaded.</h1>
        <p className="mt-4 text-body text-muted leading-relaxed">
          One app for laundry, coffee and more. We collect, clean,
          craft and deliver — so you can focus on what matters.
        </p>
      </div>

      {/* Decorative icon */}
      <div className="my-10 flex justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-load-100">
          <span className="text-5xl" aria-hidden="true">🧺</span>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          to={appPaths.register}
          className="flex h-12 w-full items-center justify-center rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700"
        >
          Create Account
        </Link>
        <Link
          to={appPaths.login}
          className="flex h-12 w-full items-center justify-center rounded-pill border-2 border-load-600 text-sm font-semibold text-load-600 transition hover:bg-load-50"
        >
          Log In
        </Link>
      </div>

      {/* Pagination dots */}
      <div className="mt-8 flex justify-center gap-2">
        <span className="h-2 w-6 rounded-pill bg-load-500" />
        <span className="h-2 w-2 rounded-pill bg-load-200" />
        <span className="h-2 w-2 rounded-pill bg-load-200" />
      </div>
    </div>
  </div>
)
