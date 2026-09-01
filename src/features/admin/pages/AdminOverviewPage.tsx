import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import type { ManagedUser } from '@/domain/models'
import {
  mockCustomerProfiles,
  mockDeliveryZones,
  mockManagedUsers,
} from '@/services/mock/data'
import { listAllStoredOrders } from '@/services/mock/orderStore'
import { mockCatalogueService } from '@/services/mock'
import { mockAdminService } from '@/services/mock'
import { formatCurrency } from '@/utils/format'

export const AdminOverviewPage = () => {
  const [catalogueSaved, setCatalogueSaved] = useState(false)
  const [pricingSaved, setPricingSaved] = useState(false)
  const [peopleSaved, setPeopleSaved] = useState(false)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => mockAdminService.getMetrics(),
  })
  const catalogueQuery = useQuery({
    queryKey: ['admin-catalogue'],
    queryFn: () => mockCatalogueService.getCatalogue(),
  })
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(mockManagedUsers)
  const [deliveryZones, setDeliveryZones] = useState(mockDeliveryZones)

  const orderRows = useMemo(() => listAllStoredOrders(), [])

  return (
    <div className="space-y-6">
      <SectionCard title="Admin foundation" description="Catalogue, pricing, promotion, loyalty, and revenue control baseline.">
        {isLoading ? <LoadingState /> : null}
        {isError ? (
          <ErrorState title="Unable to load admin metrics" message={error instanceof Error ? error.message : 'Unknown error'} />
        ) : null}
        {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
          <EmptyState title="No metrics available" description="Admin metrics will appear here once connected." />
        ) : null}
        {!isLoading && !isError && data?.data ? (
          <div className="grid gap-4 md:grid-cols-3">
            {data.data.map((metric) => (
              <article key={metric.id} className="rounded-3xl border border-load-100 bg-white p-5">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{metric.value}</p>
                <p className="mt-2 text-sm text-load-700">{metric.changeLabel}</p>
              </article>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Catalogue, pricing, and delivery configuration"
        description="Manage services, categories, basket sizes, add-ons, pricing, delivery zones, and delivery fees."
      >
        {catalogueQuery.isLoading ? <LoadingState /> : null}
        {catalogueQuery.isError || catalogueQuery.data?.status === 'error' || !catalogueQuery.data?.data ? (
          <ErrorState
            title="Unable to load catalogue data"
            message={catalogueQuery.error instanceof Error ? catalogueQuery.error.message : 'Unknown error'}
          />
        ) : (
          <div className="space-y-6">
            {catalogueSaved ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                Catalogue and pricing changes saved for the current mock session.
              </div>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-load-100 bg-white p-5">
                <p className="font-semibold text-ink">Services and categories</p>
                <div className="mt-4 space-y-3">
                  {catalogueQuery.data.data.services.map((service) => (
                    <div key={service.id} className="rounded-2xl bg-load-50/60 p-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{service.name}</p>
                          <p>{service.shortDescription}</p>
                        </div>
                        <p className="font-semibold text-load-700">{formatCurrency(service.basePrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {catalogueQuery.data.data.categories.map((category) => (
                    <span key={category.id} className="rounded-full bg-load-50 px-3 py-2 text-xs font-semibold text-load-700">
                      {category.name}
                    </span>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-load-100 bg-white p-5">
                <p className="font-semibold text-ink">Basket sizes and add-ons</p>
                <div className="mt-4 space-y-3">
                  {catalogueQuery.data.data.basketSizes.map((basket) => (
                    <div key={basket.id} className="rounded-2xl bg-load-50/60 p-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{basket.name}</p>
                          <p>{basket.capacityLabel} · {basket.recommendedFor}</p>
                        </div>
                        <p className="font-semibold text-load-700">{formatCurrency(basket.price)}</p>
                      </div>
                    </div>
                  ))}
                  {catalogueQuery.data.data.addOns.map((addOn) => (
                    <div key={addOn.id} className="rounded-2xl bg-white p-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{addOn.name}</p>
                          <p>{addOn.description}</p>
                        </div>
                        <p className="font-semibold text-load-700">{formatCurrency(addOn.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="rounded-3xl border border-load-100 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink">Delivery zones and fees</p>
                <button
                  type="button"
                  onClick={() => setCatalogueSaved(true)}
                  className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700"
                >
                  Save catalogue changes
                </button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {deliveryZones.map((zone) => (
                  <div key={zone.id} className="rounded-2xl bg-load-50/60 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-ink">{zone.name}</p>
                    <label className="mt-3 block">
                      Fee
                      <input
                        type="number"
                        value={zone.fee}
                        onChange={(event) => {
                          const nextFee = Number(event.target.value)
                          setDeliveryZones((current) =>
                            current.map((item) => (item.id === zone.id ? { ...item, fee: nextFee } : item)),
                          )
                        }}
                        className="mt-2 w-full rounded-2xl border border-load-200 px-3 py-2"
                      />
                    </label>
                    <label className="mt-3 block">
                      Free delivery threshold
                      <input
                        type="number"
                        value={zone.freeDeliveryThreshold}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value)
                          setDeliveryZones((current) =>
                            current.map((item) => (item.id === zone.id ? { ...item, freeDeliveryThreshold: nextValue } : item)),
                          )
                        }}
                        className="mt-2 w-full rounded-2xl border border-load-200 px-3 py-2"
                      />
                    </label>
                    <label className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={zone.active}
                        onChange={() => {
                          setDeliveryZones((current) =>
                            current.map((item) => (item.id === zone.id ? { ...item, active: !item.active } : item)),
                          )
                        }}
                      />
                      Zone active
                    </label>
                  </div>
                ))}
              </div>
            </article>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Promotions, loyalty, people, customers, and orders"
        description="Admin controls for commercial levers, team access, customer visibility, and current order oversight."
      >
        {catalogueQuery.data?.data ? (
          <div className="space-y-6">
            {pricingSaved ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                Promotion and loyalty settings saved for the current mock session.
              </div>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-load-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">Promotions and loyalty rules</p>
                  <button
                    type="button"
                    onClick={() => setPricingSaved(true)}
                    className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
                  >
                    Save pricing rules
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {catalogueQuery.data.data.promotions.map((promotion) => (
                    <div key={promotion.code} className="rounded-2xl bg-load-50/60 p-4 text-sm text-slate-600">
                      <p className="font-semibold text-ink">{promotion.name}</p>
                      <p className="mt-1">{promotion.description}</p>
                      <p className="mt-2 text-load-700">Value: {promotion.discountType === 'PERCENTAGE' ? `${promotion.value}%` : formatCurrency(promotion.value)}</p>
                    </div>
                  ))}
                  {catalogueQuery.data.data.loyaltyRules.map((rule) => (
                    <div key={rule.id} className="rounded-2xl bg-white p-4 text-sm text-slate-600">
                      <p className="font-semibold text-ink">{rule.description}</p>
                      <p className="mt-2">Earn rate: {rule.earnRate} pts per rand</p>
                      <p>Reward value: {rule.redemptionValue}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-load-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">Users, drivers, and employees</p>
                  <button
                    type="button"
                    onClick={() => setPeopleSaved(true)}
                    className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
                  >
                    Save people changes
                  </button>
                </div>
                {peopleSaved ? (
                  <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    Team changes saved for the current mock session.
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  {managedUsers.map((person) => (
                    <div key={person.id} className="rounded-2xl bg-load-50/60 p-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{person.name}</p>
                          <p>{person.role} · {person.detail}</p>
                        </div>
                        <select
                          value={person.status}
                          onChange={(event) => {
                            const nextStatus = event.target.value as ManagedUser['status']
                            setManagedUsers((current) =>
                              current.map((item) => (item.id === person.id ? { ...item, status: nextStatus } : item)),
                            )
                          }}
                          className="rounded-2xl border border-load-200 px-3 py-2"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INVITED">INVITED</option>
                          <option value="OFF_SHIFT">OFF_SHIFT</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-load-100 bg-white p-5">
                <p className="font-semibold text-ink">Customers</p>
                <div className="mt-4 space-y-3">
                  {mockCustomerProfiles.map((customer) => (
                    <div key={customer.id} className="rounded-2xl bg-load-50/60 p-4 text-sm text-slate-600">
                      <p className="font-semibold text-ink">{customer.firstName} {customer.lastName}</p>
                      <p>{customer.mobileNumber}</p>
                      <p>{customer.addresses[0]?.suburb ?? 'No suburb set'} · {customer.loyalty.tier}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-load-100 bg-white p-5">
                <p className="font-semibold text-ink">Orders</p>
                <div className="mt-4 space-y-3">
                  {orderRows.length === 0 ? (
                    <EmptyState title="No orders" description="Orders will appear here once customers start booking." />
                  ) : (
                    orderRows.map((order) => (
                      <div key={order.id} className="rounded-2xl bg-load-50/60 p-4 text-sm text-slate-600">
                        <p className="font-semibold text-ink">#{order.id}</p>
                        <p>{order.friendlyStatus}</p>
                        <p>{formatCurrency(order.estimatedTotal)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Roadmap placeholders" description="Visible future modules without expanding MVP build scope.">
        <ul className="grid gap-3 md:grid-cols-2 text-sm text-slate-600">
          <li className="rounded-2xl bg-load-50 px-4 py-3">CRM — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Multi-store support — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Franchise management — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Advanced executive analytics — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Live vehicle tracking — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Machine Control Centre — future capability placeholder</li>
        </ul>
      </SectionCard>
    </div>
  )
}
