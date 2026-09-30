import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { BookingSummaryCard } from '@/features/customer/booking/BookingSummaryCard'
import { BasketEditor } from '@/features/customer/booking/BasketEditor'
import { AddressSetupForm } from '@/features/customer/booking/AddressSetupForm'
import { evaluateDeliverySchedule, getWindowSlotsForDate, minBookablePickupDate } from '@/features/customer/booking/bookingOptions'
import { useCustomerOrderDraft } from '@/features/customer/booking/CustomerOrderDraftContext'
import type { LaundryOrder } from '@/domain/models'
import type { FulfilmentType } from '@/domain/models/booking'
import { MAX_RECENT_ADDRESSES, sortAddressesByRecency } from '@/domain/address'
import { buildCustomerEstimatePresentation } from '@/domain/estimatePresentation'
import type { CustomerEstimatePresentation } from '@/domain/estimatePresentation'
import { appPaths } from '@/app/router/paths'
import { mockCatalogueService } from '@/services/mock'
import { apiCustomerOrderService } from '@/services/api/customerOrderService'
import { formatCurrency } from '@/utils/format'

type BookingStep = 1 | 2

const STEP_LABELS: Record<BookingStep, string> = {
  1: 'Collection & delivery',
  2: 'Review',
}

/** Extracts the `YYYY-MM-DD` date part from a `'YYYY-MM-DD | HH:MM - HH:MM'` window label. */
const extractDatePart = (windowLabel: string): string => windowLabel.split('|')[0]?.trim() ?? ''

export const CustomerBookingPage = () => {
  const { user, saveAddress, touchAddressRecency } = useAuth()
  const queryClient = useQueryClient()
  const {
    draft,
    hasSelectedServices,
    setFulfilmentType,
    setPickupAddressId,
    setDeliveryAddressId,
    setPickupWindow,
    setDeliveryWindow,
    setCustomerInstructions,
    resetDraft,
  } = useCustomerOrderDraft()
  const [step, setStep] = useState<BookingStep>(1)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [placedOrder, setPlacedOrder] = useState<LaundryOrder | null>(null)
  // Snapshot of the estimate presentation at the moment of booking — the
  // confirmation screen must show the exact same headline the Customer saw
  // on Review, regardless of what the (Customer-scoped) order projection
  // returned by the backend can express as a bare scalar.
  const [confirmedEstimate, setConfirmedEstimate] = useState<CustomerEstimatePresentation | null>(null)
  const [pickupDateInput, setPickupDateInput] = useState<string>(() => extractDatePart(draft.pickupWindow))
  const [deliveryDateInput, setDeliveryDateInput] = useState<string>(() => extractDatePart(draft.deliveryWindow))
  const [showAllPickupAddresses, setShowAllPickupAddresses] = useState(false)
  const [showAllDeliveryAddresses, setShowAllDeliveryAddresses] = useState(false)
  const catalogueQuery = useQuery({
    queryKey: ['service-catalogue'],
    queryFn: () => mockCatalogueService.getCatalogue(),
  })

  const quoteRequest = useMemo(() => {
    if (draft.serviceSelections.length === 0) {
      return null
    }

    return {
      serviceSelections: draft.serviceSelections,
      addOnSelections: draft.addOnSelections,
      expressRequested: draft.expressRequested,
    }
  }, [draft.serviceSelections, draft.addOnSelections, draft.expressRequested])

  const quoteQuery = useQuery({
    queryKey: ['pricing-quote', quoteRequest],
    queryFn: async () => {
      if (!quoteRequest) {
        return null
      }

      const response = await mockCatalogueService.getQuote(quoteRequest)
      if (response.status === 'error' || !response.data) {
        throw new Error(response.error?.message ?? 'Unable to calculate quote.')
      }

      return response.data
    },
    enabled: Boolean(quoteRequest),
  })

  const reviewEstimate = useMemo(
    () => buildCustomerEstimatePresentation(quoteQuery.data ?? null),
    [quoteQuery.data],
  )

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiCustomerOrderService.placeOrder({
        customerId: user!.id,
        serviceSelections: draft.serviceSelections,
        addOnSelections: draft.expressRequested
          ? [...draft.addOnSelections, { addOnId: 'addon-express', quantity: 1 }]
          : draft.addOnSelections,
        fulfilmentType: draft.fulfilmentType,
        pickupAddressId: draft.pickupAddressId,
        pickupWindow: draft.pickupWindow,
        ...(draft.fulfilmentType === 'DELIVERY'
          ? { deliveryAddressId: draft.deliveryAddressId, deliveryWindow: draft.deliveryWindow }
          : {}),
      })

      if (response.status === 'error' || !response.data) {
        throw new Error(response.error?.message ?? 'Unable to place order.')
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
    },
  })

  // Route safety: a Customer must have selected at least one service via the
  // category catalogue before *entering* Collection & Delivery or Review.
  // Captured once per mount (not re-evaluated on every render) so that
  // subsequently emptying the basket via the in-page basket editor keeps the
  // Customer on this page (with an "Add items" CTA) instead of bouncing them
  // back to Services mid-edit.
  const hadItemsOnEntryRef = useRef<boolean | null>(null)
  if (hadItemsOnEntryRef.current === null) {
    hadItemsOnEntryRef.current = hasSelectedServices
  }

  if (!user) {
    return <ErrorState title="Customer account unavailable" message="Please sign in again to continue." />
  }

  if (!hadItemsOnEntryRef.current && !placedOrder) {
    return <Navigate to={appPaths.customerServices} replace />
  }

  if (catalogueQuery.isLoading) {
    return <LoadingState />
  }

  if (catalogueQuery.isError || catalogueQuery.data?.status === 'error' || !catalogueQuery.data?.data) {
    return (
      <ErrorState
        title="Unable to load booking options"
        message={catalogueQuery.error instanceof Error ? catalogueQuery.error.message : 'Unknown error'}
      />
    )
  }

  const { services, addOns } = catalogueQuery.data.data
  const hasAddresses = user.addresses.length > 0
  const sortedAddresses = sortAddressesByRecency(user.addresses)
  const visiblePickupAddresses = showAllPickupAddresses ? sortedAddresses : sortedAddresses.slice(0, MAX_RECENT_ADDRESSES)
  const visibleDeliveryAddresses = showAllDeliveryAddresses ? sortedAddresses : sortedAddresses.slice(0, MAX_RECENT_ADDRESSES)

  const handleSelectPickupAddress = (addressId: string) => {
    setPickupAddressId(addressId)
    void touchAddressRecency(addressId)
  }

  const handleSelectDeliveryAddress = (addressId: string) => {
    setDeliveryAddressId(addressId)
    void touchAddressRecency(addressId)
  }
  const expressAddOn = addOns.find((addOn) => addOn.id === 'addon-express')
  const showConfirmation = placedOrder !== null

  const goNext = () => {
    if (step === 1) {
      if (!hasSelectedServices) {
        setToast({ message: 'Your basket is empty. Add at least one service to continue.', tone: 'error' })
        return
      }
      if (!draft.pickupAddressId) {
        setToast({ message: 'Please select a pickup address.', tone: 'error' })
        return
      }
      if (!draft.pickupWindow) {
        setToast({ message: 'Please select a pickup window.', tone: 'error' })
        return
      }
      if (draft.fulfilmentType === 'DELIVERY') {
        if (!draft.deliveryAddressId) {
          setToast({ message: 'Please select a delivery address.', tone: 'error' })
          return
        }
        if (!draft.deliveryWindow) {
          setToast({ message: 'Please select a delivery window.', tone: 'error' })
          return
        }
        const scheduleEvaluation = evaluateDeliverySchedule(draft.pickupWindow, draft.deliveryWindow, {
          pickupAddressId: draft.pickupAddressId,
          deliveryAddressId: draft.deliveryAddressId,
        })
        if (!scheduleEvaluation.feasible) {
          setToast({ message: scheduleEvaluation.reason ?? 'Delivery window must be after the pickup window.', tone: 'error' })
          return
        }
      }
    }
    setToast(null)
    setStep((s) => (s + 1) as BookingStep)
  }

  const goBack = () => setStep((s) => (s - 1) as BookingStep)

  const handlePickupDateChange = (nextDate: string) => {
    setPickupDateInput(nextDate)
    setPickupWindow('')
  }

  const handleDeliveryDateChange = (nextDate: string) => {
    setDeliveryDateInput(nextDate)
    setDeliveryWindow('')
  }

  const confirmOrder = async () => {
    try {
      setToast(null)
      const estimateAtBooking = buildCustomerEstimatePresentation(quoteQuery.data ?? null)
      const order = await placeOrderMutation.mutateAsync()
      setConfirmedEstimate(estimateAtBooking)
      setPlacedOrder(order)
      resetDraft()
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Unable to place order.', tone: 'error' })
    }
  }

  const resetBookingFlow = () => {
    setPlacedOrder(null)
    setToast(null)
    setStep(1)
    setPickupDateInput('')
    setDeliveryDateInput('')
  }

  // ── Confirmation screen ─────────────────────────────────────────────────────
  if (showConfirmation && placedOrder) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card variant="elevated" className="w-full max-w-lg space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-status-success/15">
            <span className="text-3xl text-status-success" aria-hidden="true">✓</span>
          </div>
          <div>
            <h2 className="text-heading text-ink">Your booking is confirmed.</h2>
            <p className="mt-2 text-body text-muted">
              Once your items are received and processed at LOAD, we&apos;ll notify you when your final invoice is ready
              {' '}
              {placedOrder.fulfilmentType === 'STORE_COLLECTION'
                ? '— you can pay at the LOAD store when collecting your completed order.'
                : 'for payment.'}
            </p>
          </div>
          <div className="rounded-card bg-load-50 p-4 text-left text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-load-100 pb-3">
              <span className="text-muted">Order reference</span>
              <span className="text-title text-ink">#{placedOrder.orderNumber ?? placedOrder.id}</span>
            </div>
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Estimated amount</span>
                <span className="font-semibold text-load-700">
                  {confirmedEstimate?.headline ?? formatCurrency(placedOrder.estimatedTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Pickup window</span>
                <span className="font-semibold text-ink">{placedOrder.pickupWindow.windowLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Fulfilment</span>
                <span className="font-semibold text-ink">
                  {placedOrder.fulfilmentType === 'STORE_COLLECTION' ? 'Collect from LOAD' : (placedOrder.deliveryWindow?.windowLabel ?? 'To be confirmed')}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Link to={appPaths.customerOrders} className="block">
              <Button fullWidth>Track order</Button>
            </Link>
            <Button variant="ghost" fullWidth onClick={resetBookingFlow}>
              Book another
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Address modal */}
      <Modal open={showAddressModal} onClose={() => setShowAddressModal(false)} title="Add new address">
        <AddressSetupForm
          onSave={async (values) => {
            const address = await saveAddress({
              label: values.label,
              line1: values.line1,
              suburb: values.suburb,
              city: values.city,
              province: values.province,
              postalCode: values.postalCode,
              ...(values.deliveryInstructions ? { deliveryInstructions: values.deliveryInstructions } : {}),
              isDefault: false,
            })
            if (address) {
              setPickupAddressId(address.id)
              setDeliveryAddressId(address.id)
            }
            setShowAddressModal(false)
          }}
        />
      </Modal>

      {/* Toast notifications */}
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      {/* Stepper header */}
      <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
        <div className="flex items-center gap-2 overflow-x-auto">
          {([1, 2] as BookingStep[]).map((num) => {
            const isDone = step > num
            const isCurrent = step === num
            return (
              <div key={num} className="flex flex-shrink-0 items-center gap-2">
                {num > 1 ? (
                  <div className={`h-px w-8 transition ${step >= num ? 'bg-load-600' : 'bg-load-100'}`} />
                ) : null}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                    isDone
                      ? 'bg-load-600 text-white'
                      : isCurrent
                        ? 'bg-load-600 text-white ring-4 ring-load-100'
                        : 'border border-load-200 bg-load-50 text-muted'
                  }`}
                >
                  {isDone ? '✓' : num}
                </div>
                <span
                  className={`text-sm font-semibold transition ${
                    isCurrent ? 'text-load-700' : isDone ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {STEP_LABELS[num]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* No addresses prompt (shown above stepper content when there are no saved addresses) */}
      {!hasAddresses && step === 1 ? (
        <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
          <EmptyState
            title="No saved addresses yet"
            description="Add a pickup address before scheduling your collection."
          />
          <div className="mt-6">
            <AddressSetupForm
              onSave={async (values) => {
                const address = await saveAddress({
                  label: values.label,
                  line1: values.line1,
                  suburb: values.suburb,
                  city: values.city,
                  province: values.province,
                  postalCode: values.postalCode,
                  ...(values.deliveryInstructions ? { deliveryInstructions: values.deliveryInstructions } : {}),
                  isDefault: true,
                })
                if (address) {
                  setPickupAddressId(address.id)
                  setDeliveryAddressId(address.id)
                }
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">

          {/* ── Step 1: Collection & delivery ─────────────────────────────── */}
          {step === 1 ? (
            <>
              {/* Your basket — pre-confirmation basket editing (quantity +/- and remove) */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-heading text-ink">Your basket</h2>
                    <p className="mt-1 text-body text-muted">Adjust quantities or remove items before scheduling collection.</p>
                  </div>
                  <Link
                    to={appPaths.customerServices}
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-pill border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
                  >
                    Add items
                  </Link>
                </div>
                <div className="mt-5">
                  <BasketEditor services={services} addOns={addOns} />
                </div>
              </div>

              {/* Fulfilment choice */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">How should we return your order?</h2>
                <p className="mt-1 text-body text-muted">LOAD always collects from you first — choose how the completed order comes back.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {([
                    { value: 'DELIVERY' as FulfilmentType, label: 'Pickup & Delivery', description: 'We deliver your completed order back to you.' },
                    { value: 'STORE_COLLECTION' as FulfilmentType, label: 'Pickup & Collect In Store', description: 'Collect your completed order from the LOAD store.' },
                  ]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFulfilmentType(option.value)}
                      aria-pressed={draft.fulfilmentType === option.value}
                      className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                        draft.fulfilmentType === option.value
                          ? 'border-load-500 bg-load-50 shadow-card'
                          : 'border-card-border bg-white hover:border-load-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink">{option.label}</p>
                      <p className="mt-1 text-caption text-muted">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup address */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-heading text-ink">Pickup address</h2>
                    <p className="mt-1 text-body text-muted">Where should the driver collect?</p>
                  </div>
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowAddressModal(true)}>
                    Add address
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {visiblePickupAddresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => handleSelectPickupAddress(address.id)}
                      className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                        draft.pickupAddressId === address.id
                          ? 'border-load-500 bg-load-50 shadow-card'
                          : 'border-card-border bg-white hover:border-load-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink">{address.label}</p>
                      <p className="mt-1 text-body text-muted">{address.line1}, {address.suburb}</p>
                      {address.city ? <p className="text-caption text-muted">{address.city}</p> : null}
                    </button>
                  ))}
                </div>
                {sortedAddresses.length > MAX_RECENT_ADDRESSES ? (
                  <button
                    type="button"
                    onClick={() => setShowAllPickupAddresses((current) => !current)}
                    className="mt-3 text-sm font-semibold text-load-700 hover:underline"
                  >
                    {showAllPickupAddresses ? 'Show fewer addresses' : `View all addresses (${sortedAddresses.length})`}
                  </button>
                ) : null}
              </div>

              {/* Delivery address — only relevant for DELIVERY fulfilment */}
              {draft.fulfilmentType === 'DELIVERY' ? (
                <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                  <h2 className="text-heading text-ink">Delivery address</h2>
                  <p className="mt-1 text-body text-muted">Where should clean laundry be delivered?</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {visibleDeliveryAddresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => handleSelectDeliveryAddress(address.id)}
                        className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                          draft.deliveryAddressId === address.id
                            ? 'border-load-500 bg-load-50 shadow-card'
                            : 'border-card-border bg-white hover:border-load-200'
                        }`}
                      >
                        <p className="text-sm font-semibold text-ink">{address.label}</p>
                        <p className="mt-1 text-body text-muted">{address.line1}, {address.suburb}</p>
                      </button>
                    ))}
                  </div>
                  {sortedAddresses.length > MAX_RECENT_ADDRESSES ? (
                    <button
                      type="button"
                      onClick={() => setShowAllDeliveryAddresses((current) => !current)}
                      className="mt-3 text-sm font-semibold text-load-700 hover:underline"
                    >
                      {showAllDeliveryAddresses ? 'Show fewer addresses' : `View all addresses (${sortedAddresses.length})`}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Pickup window */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">Pickup window</h2>
                <p className="mt-1 text-body text-muted">Choose a collection date and time (Africa/Johannesburg).</p>
                <div className="mt-5">
                  <label htmlFor="pickup-date" className="block text-sm font-medium text-ink">
                    Pickup date
                  </label>
                  <input
                    id="pickup-date"
                    type="date"
                    min={minBookablePickupDate()}
                    value={pickupDateInput}
                    onChange={(e) => handlePickupDateChange(e.target.value)}
                    className="mt-2 w-full max-w-xs rounded-card border border-card-border bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-load-400 focus:ring-2 focus:ring-load-100"
                  />
                </div>
                {pickupDateInput ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {getWindowSlotsForDate(pickupDateInput).map((windowLabel) => (
                      <button
                        key={windowLabel}
                        type="button"
                        onClick={() => setPickupWindow(windowLabel)}
                        className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                          draft.pickupWindow === windowLabel
                            ? 'border-load-500 bg-load-50 shadow-card'
                            : 'border-card-border bg-white hover:border-load-200'
                        }`}
                      >
                        <p className="text-body text-ink">{windowLabel.split('|')[1]?.trim()}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Delivery window — only relevant for DELIVERY fulfilment */}
              {draft.fulfilmentType === 'DELIVERY' ? (
                <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                  <h2 className="text-heading text-ink">Delivery window</h2>
                  <p className="mt-1 text-body text-muted">
                    Choose a delivery date and time — LOAD needs at least 24 hours to process your order after pickup.
                  </p>
                  <div className="mt-5">
                    <label htmlFor="delivery-date" className="block text-sm font-medium text-ink">
                      Delivery date
                    </label>
                    <input
                      id="delivery-date"
                      type="date"
                      min={pickupDateInput || minBookablePickupDate()}
                      value={deliveryDateInput}
                      onChange={(e) => handleDeliveryDateChange(e.target.value)}
                      className="mt-2 w-full max-w-xs rounded-card border border-card-border bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-load-400 focus:ring-2 focus:ring-load-100"
                    />
                  </div>
                  {deliveryDateInput ? (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {getWindowSlotsForDate(deliveryDateInput).map((windowLabel) => {
                          const evaluation = evaluateDeliverySchedule(draft.pickupWindow, windowLabel, {
                            pickupAddressId: draft.pickupAddressId,
                            deliveryAddressId: draft.deliveryAddressId,
                          })
                          const isValidDelivery = evaluation.feasible
                          return (
                            <button
                              key={windowLabel}
                              type="button"
                              disabled={!isValidDelivery}
                              aria-disabled={!isValidDelivery}
                              onClick={() => {
                                if (!isValidDelivery) return
                                setDeliveryWindow(windowLabel)
                              }}
                              className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                                draft.deliveryWindow === windowLabel
                                  ? 'border-load-500 bg-load-50 shadow-card'
                                  : isValidDelivery
                                    ? 'border-card-border bg-white hover:border-load-200'
                                    : 'border-card-border bg-slate-50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <p className="text-body text-ink">{windowLabel.split('|')[1]?.trim()}</p>
                            </button>
                          )
                        })}
                      </div>
                      {getWindowSlotsForDate(deliveryDateInput).every(
                        (windowLabel) =>
                          !evaluateDeliverySchedule(draft.pickupWindow, windowLabel, {
                            pickupAddressId: draft.pickupAddressId,
                            deliveryAddressId: draft.deliveryAddressId,
                          }).feasible,
                      ) ? (
                        <p className="mt-3 text-sm text-amber-700">
                          No delivery windows are available on this date — please choose a later date.
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* Customer instructions */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">Instructions (optional)</h2>
                <textarea
                  value={draft.customerInstructions}
                  onChange={(e) => setCustomerInstructions(e.target.value)}
                  placeholder="e.g. Gate code, preferred contact method…"
                  rows={3}
                  className="mt-3 w-full rounded-card border border-card-border bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-load-400 focus:ring-2 focus:ring-load-100"
                />
              </div>

              <div className="flex justify-between gap-3">
                <Link to={appPaths.customerServices}>
                  <Button variant="outline" type="button">← Back</Button>
                </Link>
                <Button type="button" onClick={goNext} disabled={!hasSelectedServices}>
                  Continue to Review →
                </Button>
              </div>
            </>
          ) : null}

          {/* ── Step 2: Review & confirm ───────────────────────────────────── */}
          {step === 2 ? (
            <>
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card space-y-6">
                <div>
                  <h2 className="text-heading text-ink">Review your order</h2>
                  <p className="mt-1 text-body text-muted">Check your booking details before confirming your LOAD order.</p>
                </div>

                <Card variant="flat" className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-title text-ink">Selected services</h3>
                      <p className="mt-1 text-body text-muted">These items will be collected during your chosen pickup window.</p>
                    </div>
                    <Link
                      to={appPaths.customerServices}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-pill border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
                    >
                      Edit items
                    </Link>
                  </div>
                  <BasketEditor services={services} addOns={addOns} />
                  {draft.expressRequested && expressAddOn ? (
                    <div className="flex items-center justify-between gap-3 rounded-card border border-card-border bg-white p-3 text-sm">
                      <span className="text-slate-600">Express turnaround</span>
                      <span className="font-semibold text-ink">{formatCurrency(expressAddOn.price)}</span>
                    </div>
                  ) : null}
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card variant="flat" className="space-y-2">
                    <h3 className="text-title text-ink">Collection</h3>
                    <p className="text-sm text-slate-600">{draft.pickupWindow}</p>
                    <p className="text-sm text-slate-600">
                      {user.addresses.find((address) => address.id === draft.pickupAddressId)?.line1 ?? 'Address pending'}
                    </p>
                  </Card>
                  <Card variant="flat" className="space-y-2">
                    <h3 className="text-title text-ink">Fulfilment</h3>
                    {draft.fulfilmentType === 'STORE_COLLECTION' ? (
                      <p className="text-sm font-semibold text-load-700">Collect from LOAD</p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600">{draft.deliveryWindow}</p>
                        <p className="text-sm text-slate-600">
                          {user.addresses.find((address) => address.id === draft.deliveryAddressId)?.line1 ?? 'Address pending'}
                        </p>
                      </>
                    )}
                  </Card>
                </div>

                {draft.customerInstructions ? (
                  <Card variant="flat" className="space-y-1">
                    <h3 className="text-title text-ink">Customer instructions</h3>
                    <p className="text-sm text-slate-600">{draft.customerInstructions}</p>
                  </Card>
                ) : null}

                <Card variant="flat" className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">{reviewEstimate.totalLabel}</span>
                    <span className="text-xl font-semibold text-ink">
                      {reviewEstimate.headline}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {reviewEstimate.breakdown.map((line) => (
                      <div key={line.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                        <span>{line.label}</span>
                        <span className="font-semibold text-ink">{line.valueText}</span>
                      </div>
                    ))}
                  </div>
                  {reviewEstimate.hasWeightBasedItems ? (
                    <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <p className="font-semibold">Final price based on actual weight after collection.</p>
                    </div>
                  ) : null}
                  {reviewEstimate.hasQuoteOnlyItems ? (
                    <div className="rounded-card border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold">Final price confirmed after assessment.</p>
                    </div>
                  ) : null}
                  <p className="text-sm text-slate-600">
                    Your final invoice will be confirmed after your items are received and processed by LOAD.
                  </p>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" type="button" onClick={goBack} disabled={placeOrderMutation.isPending}>
                  ← Back
                </Button>
                <Button
                  type="button"
                  onClick={() => void confirmOrder()}
                  loading={placeOrderMutation.isPending}
                  disabled={!hasAddresses || !hasSelectedServices}
                >
                  Confirm Booking
                </Button>
              </div>
            </>
          ) : null}

        </div>

        {step === 2 ? (
          <Card className="space-y-4 xl:sticky xl:top-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-load-600">Estimated pricing</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                {quoteQuery.data ? reviewEstimate.headline : 'Awaiting estimate'}
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Your final invoice will be confirmed after your items are received and processed by LOAD.
            </p>
          </Card>
        ) : (
          <BookingSummaryCard
            canSubmit={false}
            isSubmitting={placeOrderMutation.isPending || quoteQuery.isFetching}
            onSubmit={() => undefined}
            quote={quoteQuery.data ?? null}
          />
        )}
      </div>
    </div>
  )
}
