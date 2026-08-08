import { Badge } from '@/components/ui/Badge'
import { productRouteMap } from '@/app/config/productBlueprint'

export const ProductRouteTable = () => (
  <div className="overflow-hidden rounded-3xl border border-load-100">
    <table className="min-w-full divide-y divide-load-100 text-left text-sm">
      <thead className="bg-load-50 text-slate-500">
        <tr>
          <th className="px-4 py-3 font-medium">Route</th>
          <th className="px-4 py-3 font-medium">Role</th>
          <th className="px-4 py-3 font-medium">Release</th>
          <th className="px-4 py-3 font-medium">Summary</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-load-50 bg-white">
        {productRouteMap.map((route) => (
          <tr key={route.path}>
            <td className="px-4 py-3">
              <p className="font-semibold text-ink">{route.title}</p>
              <p className="text-xs text-slate-500">{route.path}</p>
            </td>
            <td className="px-4 py-3 text-slate-600">{route.role}</td>
            <td className="px-4 py-3">
              <Badge tone={route.release === 'MVP' ? 'primary' : 'warning'}>{route.release}</Badge>
            </td>
            <td className="px-4 py-3 text-slate-600">{route.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
