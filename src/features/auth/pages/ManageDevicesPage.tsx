import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'

interface MockDevice {
  id: string
  name: string
  location: string
  lastActive: string
  isCurrent: boolean
}

const MOCK_DEVICES: MockDevice[] = [
  { id: 'dev-01', name: 'iPhone 15 Pro', location: 'Cape Town, South Africa', lastActive: 'Active now', isCurrent: true },
  { id: 'dev-02', name: 'MacBook Pro', location: 'Cape Town, South Africa', lastActive: 'Active 2h ago', isCurrent: false },
  { id: 'dev-03', name: 'iPad Air', location: 'Johannesburg, South Africa', lastActive: 'Active 1d ago', isCurrent: false },
]

const DeviceIcon = ({ isCurrent }: { isCurrent: boolean }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isCurrent ? 'bg-load-100' : 'bg-slate-100'}`}>
    <span aria-hidden="true">{isCurrent ? '📱' : '💻'}</span>
  </div>
)

export const ManageDevicesPage = () => (
  <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
    <div className="w-full max-w-sm">
      <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
        <h1 className="text-heading text-ink">Manage Devices</h1>
        <p className="mt-2 text-body text-muted">These devices are logged in to your LOAD account.</p>

        <ul className="mt-6 divide-y divide-load-100" aria-label="Logged in devices">
          {MOCK_DEVICES.map((device) => (
            <li key={device.id} className="flex items-center gap-3 py-4">
              <DeviceIcon isCurrent={device.isCurrent} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink text-sm truncate">{device.name}</p>
                  {device.isCurrent ? (
                    <span className="rounded-pill bg-load-600 px-2 py-0.5 text-xs font-semibold text-white">This Device</span>
                  ) : null}
                </div>
                <p className="text-caption text-muted">{device.location}</p>
                <p className="text-caption text-muted">{device.lastActive}</p>
              </div>
              {!device.isCurrent ? (
                <button
                  type="button"
                  className="text-muted hover:text-red-600"
                  aria-label={`Sign out from ${device.name}`}
                >
                  ⋮
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="mt-4 h-12 w-full rounded-pill border-2 border-red-300 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Log Out All Other Devices
        </button>

        <p className="mt-3 text-center text-caption text-muted">
          For your security, we recommend logging out devices you no longer use.
        </p>

        <div className="mt-6 text-center">
          <Link to={appPaths.customerProfile} className="text-sm font-medium text-load-600 hover:text-load-700">
            Back to Profile
          </Link>
        </div>
      </div>
    </div>
  </div>
)
