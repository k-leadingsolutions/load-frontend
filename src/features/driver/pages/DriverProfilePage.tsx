import { useNavigate } from 'react-router-dom'
import { SectionCard } from '@/components/ui/SectionCard'
import { appPaths } from '@/app/router/paths'
import { useDriverAuth } from '@/app/providers/useDriverAuth'

export const DriverProfilePage = () => {
  const navigate = useNavigate()
  const { logout, user } = useDriverAuth()

  return (
    <SectionCard title="Driver profile" description="Identity and session controls. Logistics only — no payments, pricing, or customer profile data.">
      <div className="space-y-2 text-sm text-muted">
        <p className="font-semibold text-ink">{user?.name ?? 'Driver'}</p>
        <p>{user?.mobileNumber}</p>
        <p>Driver ID: {user?.driverId}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          logout()
          navigate(appPaths.driverLogin, { replace: true })
        }}
        className="mt-4 rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
      >
        Log out
      </button>
    </SectionCard>
  )
}
