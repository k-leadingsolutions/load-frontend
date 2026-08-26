import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { BookingSummaryCard } from '@/features/customer/booking/BookingSummaryCard'
import { AddressSetupForm } from '@/features/customer/booking/AddressSetupForm'
import { bookingWindows } from '@/features/customer/booking/bookingOptions'
import { QuantitySelector } from '@/features/customer/booking/QuantitySelector'
import type { CardPaymentDetails, LaundryOrder, PaymentMethodType, PaymentResult, TipSelection } from '@/domain/models'
import { DriverTipSelector } from '@/features/customer/checkout/DriverTipSelector'
import { OrderSummaryPanel } from '@/features/customer/checkout/OrderSummaryPanel'
import { PaymentMethodSelector } from '@/features/customer/checkout/PaymentMethodSelector'
import { appPaths } from '@/app/router/paths'
import { mockCatalogueService, mockCustomerOrderService, mockPaymentService } from '@/services/mock'
import { formatCurrency } from '@/utils/format'

const bookingSchema = z
  .object({
    pricingModel: z.enum(['PER_BASKET', 'PER_ITEM', 'PER_KILOGRAM']),
    basketSizeId: z.string().optional(),
    basketQuantity: z.number().int().min(1),
    serviceQuantities: z.record(z.string(), z.number().int().min(0)),
    addOnQuantities: z.record(z.string(), z.number().int().min(0)),
    pickupAddressId: z.string().min(1, 'Pickup address is required.'),
    deliveryAddressId: z.string().min(1, 'Delivery address is required.'),
    pickupWindow: z.string().min(1, 'Pickup window is required.'),
    deliveryWindow: z.string().min(1, 'Delivery window is required.'),
    promotionCode: z.string().optional(),
    expressRequested: z.boolean(),
    useLoyaltyPoints: z.boolean(),
  })
  .superRefine((values, context) => {
    const hasServiceSelection = Object.values(values.serviceQuantities).some((quantity) => quantity > 0)

    if (values.pricingModel === 'PER_BASKET' && !values.basketSizeId) {
      context.addIssue({
        code: 'custom',
        message: 'Choose a basket size.',
        path: ['basketSizeId'],
      })
    }

    if (values.pricingModel !== 'PER_BASKET' && !hasServiceSelection) {
      context.addIssue({
        code: 'custom',
        message: 'Select at least one service item.',
        path: ['serviceQuantities'],
      })
    }
  })

type BookingFormValues = z.infer<typeof bookingSchema>
type BookingStep = 1 | 2 | 3

const STEP_LABELS: Record<BookingStep, string> = {
  1: 'Service selection',
  2: 'Schedule & address',
  3: 'Review & pay',
}

const PRICING_OPTIONS = [
  {
    key: 'PER_BASKET' as const,
    title: 'Pay per basket',
    description: 'Best for mixed household loads with predictable pricing.',
  },
  {
    key: 'PER_ITEM' as const,
    title: 'Pay per item or service',
    description: 'Best for garment-specific cleaning and ironing.',
  },
  {
    key: 'PER_KILOGRAM' as const,
    title: 'Pay per kilogram',
    description: 'Estimated now, confirmed after collection and weighing.',
  },
]

export const CustomerBookingPage = () => {
  const { user, saveAddress } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<BookingStep>(1)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [placedOrder, setPlacedOrder] = useState<LaundryOrder | null>(null)
  const [tip, setTip] = useState<TipSelection>({ type: 'NONE', amount: 0 })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)
  const catalogueQuery = useQuery({
    queryKey: ['service-catalogue'],
    queryFn: () => mockCatalogueService.getCatalogue(),
  })
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      pricingModel: 'PER_BASKET',
      basketSizeId: 'basket-12kg',
      basketQuantity: 1,
      serviceQuantities: {},
      addOnQuantities: {},
      pickupAddressId: user?.defaultAddressId ?? '',
      deliveryAddressId: user?.defaultAddressId ?? '',
      pickupWindow: bookingWindows[0]!,
      deliveryWindow: bookingWindows[1]!,
      promotionCode: 'FIRSTLOAD',
      expressRequested: false,
      useLoyaltyPoints: false,
    },
  })
  const watchedValues = useWatch({ control })

  const quoteRequest = useMemo(() => {
    const serviceSelections = Object.entries(watchedValues.serviceQuantities ?? {})
      .filter(([, quantity]) => (quantity ?? 0) > 0)
      .map(([serviceId, quantity]) => ({
        serviceId,
        quantity: quantity ?? 0,
      }))

    const addOnSelections = Object.entries(watchedValues.addOnQuantities ?? {})
      .filter(([, quantity]) => (quantity ?? 0) > 0)
      .map(([addOnId, quantity]) => ({
        addOnId,
        quantity: quantity ?? 0,
      }))

    const hasBasketSelection = watchedValues.pricingModel === 'PER_BASKET' && Boolean(watchedValues.basketSizeId)
    const hasItemSelection = serviceSelections.length > 0

    if (!hasBasketSelection && !hasItemSelection) {
      return null
    }

    return {
      ...(watchedValues.pricingModel === 'PER_BASKET' && watchedValues.basketSizeId
        ? { basketSizeId: watchedValues.basketSizeId }
        : {}),
      ...(watchedValues.pricingModel === 'PER_BASKET'
        ? { basketQuantity: watchedValues.basketQuantity }
        : {}),
      serviceSelections: watchedValues.pricingModel === 'PER_BASKET'
        ? []
        : serviceSelections,
      addOnSelections,
      ...(watchedValues.promotionCode ? { promotionCode: watchedValues.promotionCode } : {}),
      expressRequested: watchedValues.expressRequested ?? false,
      ...((watchedValues.useLoyaltyPoints ?? false) ? { useLoyaltyPoints: true } : {}),
    }
  }, [watchedValues])

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

  const placeOrderMutation = useMutation({
    mutationFn: async (values: BookingFormValues) => {
      const serviceSelections = Object.entries(values.serviceQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([serviceId, quantity]) => ({
          serviceId,
          quantity,
        }))
      const addOnSelections = Object.entries(values.addOnQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([addOnId, quantity]) => ({
          addOnId,
          quantity,
        }))
      const finalAddOnSelections = values.expressRequested
        ? [...addOnSelections, { addOnId: 'addon-express', quantity: 1 }]
        : addOnSelections
      const response = await mockCustomerOrderService.placeOrder({
        customerId: user!.id,
        ...(values.pricingModel === 'PER_BASKET' && values.basketSizeId ? { basketSizeId: values.basketSizeId } : {}),
        serviceSelections,
        addOnSelections: finalAddOnSelections,
        pickupAddressId: values.pickupAddressId,
        deliveryAddressId: values.deliveryAddressId,
        pickupWindow: values.pickupWindow,
        deliveryWindow: values.deliveryWindow,
        ...(values.promotionCode ? { promotionCode: values.promotionCode } : {}),
        ...(values.useLoyaltyPoints ? { useLoyaltyPoints: true } : {}),
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

  if (!user) {
    return <ErrorState title="Customer account unavailable" message="Please sign in again to continue." />
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

  const { basketSizes, services, addOns, promotions } = catalogueQuery.data.data
  const hasAddresses = user.addresses.length > 0
  const serviceQuantitiesError = typeof errors.serviceQuantities?.message === 'string' ? errors.serviceQuantities.message : null
  const visibleAddOns = addOns.filter((addOn) => addOn.id !== 'addon-express')
  const expressAddOn = addOns.find((addOn) => addOn.id === 'addon-express')
  const isWeightBasedOrder = watchedValues.pricingModel === 'PER_KILOGRAM'
  const payableTotal = (quoteQuery.data?.estimatedTotal ?? 0) + tip.amount
  const showPaymentFailure = paymentResult?.status === 'FAILED' || paymentResult?.status === 'CANCELLED'
  const showConfirmation = Boolean(placedOrder)
    && (isWeightBasedOrder || paymentResult?.status === 'SUCCEEDED' || paymentResult?.status === 'AUTHORIZED')

  const updateQuantity = (field: 'serviceQuantities' | 'addOnQuantities', itemId: string, quantity: number) => {
    const current = getValues(field)
    setValue(field, { ...current, [itemId]: quantity }, { shouldDirty: true, shouldValidate: true })
  }

  const goNext = () => {
    const values = getValues()
    if (step === 1) {
      const hasServiceSelection = Object.values(values.serviceQuantities).some((q) => q > 0)
      if (values.pricingModel === 'PER_BASKET' && !values.basketSizeId) {
        setToast({ message: 'Please choose a basket size to continue.', tone: 'error' })
        return
      }
      if (values.pricingModel !== 'PER_BASKET' && !hasServiceSelection) {
        setToast({ message: 'Please select at least one service to continue.', tone: 'error' })
        return
      }
    }
    if (step === 2) {
      if (!values.pickupAddressId) {
        setToast({ message: 'Please select a pickup address.', tone: 'error' })
        return
      }
      if (!values.deliveryAddressId) {
        setToast({ message: 'Please select a delivery address.', tone: 'error' })
        return
      }
    }
    setStep((s) => (s + 1) as BookingStep)
  }

  const goBack = () => setStep((s) => (s - 1) as BookingStep)

  const ensureOrder = async (values: BookingFormValues) => {
    if (placedOrder) {
      return placedOrder
    }

    const order = await placeOrderMutation.mutateAsync(values)
    setPlacedOrder(order)
    return order
  }

  const processCheckout = async (method: PaymentMethodType, cardDetails?: CardPaymentDetails) => {
    const submitPayment = handleSubmit(async (values) => {
      try {
        setToast(null)
        setPaymentResult(null)
        const order = await ensureOrder(values)
        setIsPaymentProcessing(true)

        const result = method === 'APPLE_PAY'
          ? await mockPaymentService.processApplePay({
              orderId: order.id,
              amount: payableTotal,
              paymentMethod: 'APPLE_PAY',
              tip,
            })
          : await mockPaymentService.processCardPayment({
              orderId: order.id,
              amount: payableTotal,
              paymentMethod: 'CARD',
              tip,
              cardDetails: cardDetails!,
            })

        setPaymentMethod(method)
        setPaymentResult(result)
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : 'Unable to complete payment.', tone: 'error' })
      } finally {
        setIsPaymentProcessing(false)
      }
    })

    await submitPayment()
  }

  const confirmWeightBasedOrder = async () => {
    const submitOrder = handleSubmit(async (values) => {
      try {
        setToast(null)
        await ensureOrder(values)
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : 'Unable to place order.', tone: 'error' })
      }
    })

    await submitOrder()
  }

  const resetBookingFlow = () => {
    setPlacedOrder(null)
    setPaymentMethod(null)
    setPaymentResult(null)
    setTip({ type: 'NONE', amount: 0 })
    setIsPaymentProcessing(false)
    setStep(1)
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
            <h2 className="text-heading text-ink">{paymentResult ? 'Payment successful' : 'Order confirmed'}</h2>
            <p className="mt-2 text-body text-muted">
              {paymentResult
                ? 'Your booking and payment are confirmed. We’ll keep you updated every step of the way.'
                : 'Your booking has been confirmed. Final payment will be requested once the order is weighed.'}
            </p>
          </div>
          <div className="rounded-card bg-load-50 p-4 text-left text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-load-100 pb-3">
              <span className="text-muted">Order reference</span>
              <span className="text-title text-ink">#{placedOrder.id}</span>
            </div>
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">{paymentResult ? 'Amount paid' : 'Estimated amount'}</span>
                <span className="font-semibold text-load-700">{formatCurrency(payableTotal)}</span>
              </div>
              {paymentResult ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Payment method</span>
                  <span className="font-semibold text-ink">
                    {paymentResult.paymentMethod === 'APPLE_PAY' ? 'Apple Pay' : 'Credit / Debit Card'}
                  </span>
                </div>
              ) : null}
              {tip.amount > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Driver tip</span>
                  <span className="font-semibold text-ink">{formatCurrency(tip.amount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Loyalty points earned</span>
                <span className="font-semibold text-ink">{placedOrder.loyaltyPointsEarned}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Pickup window</span>
                <span className="font-semibold text-ink">{placedOrder.pickupWindow.windowLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Delivery window</span>
                <span className="font-semibold text-ink">{placedOrder.deliveryWindow.windowLabel}</span>
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
          onSave={(values) => {
            const address = saveAddress({
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
              setValue('pickupAddressId', address.id, { shouldValidate: true })
              setValue('deliveryAddressId', address.id, { shouldValidate: true })
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
          {([1, 2, 3] as BookingStep[]).map((num) => {
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
      {!hasAddresses && step === 2 ? (
        <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
          <EmptyState
            title="No saved addresses yet"
            description="Add a pickup address before scheduling your collection."
          />
          <div className="mt-6">
            <AddressSetupForm
              onSave={(values) => {
                const address = saveAddress({
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
                  setValue('pickupAddressId', address.id, { shouldValidate: true })
                  setValue('deliveryAddressId', address.id, { shouldValidate: true })
                }
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">

          {/* ── Step 1: Service selection ──────────────────────────────────── */}
          {step === 1 ? (
            <>
              {/* Pricing model tiles */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">Choose pricing mode</h2>
                <p className="mt-1 text-body text-muted">Switch between basket pricing and pay-per-item pricing without leaving the booking flow.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {PRICING_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setValue('pricingModel', option.key, { shouldDirty: true, shouldValidate: true })}
                      className={`rounded-card border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                        watchedValues.pricingModel === option.key
                          ? 'border-load-500 bg-load-50 shadow-card'
                          : 'border-card-border bg-white hover:border-load-200'
                      }`}
                    >
                      <p className="text-title text-ink">{option.title}</p>
                      <p className="mt-2 text-body text-muted">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basket sizes or per-item services */}
              {watchedValues.pricingModel === 'PER_BASKET' ? (
                <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                  <h2 className="text-heading text-ink">Basket pricing</h2>
                  <p className="mt-1 text-body text-muted">Choose the basket size that best matches this collection.</p>
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {basketSizes.map((basket) => (
                      <button
                        key={basket.id}
                        type="button"
                        onClick={() => setValue('basketSizeId', basket.id, { shouldDirty: true, shouldValidate: true })}
                        className={`rounded-card border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                          watchedValues.basketSizeId === basket.id
                            ? 'border-load-500 bg-load-50 shadow-card'
                            : 'border-card-border bg-white hover:border-load-200'
                        }`}
                      >
                        <p className="text-title text-ink">{basket.name}</p>
                        <p className="mt-1 text-body text-muted">{basket.recommendedFor}</p>
                        <p className="mt-4 text-lg font-semibold text-load-700">{formatCurrency(basket.price)}</p>
                        <p className="text-body text-muted">{basket.capacityLabel}</p>
                      </button>
                    ))}
                  </div>
                  {errors.basketSizeId?.message ? (
                    <p className="mt-3 text-caption text-status-error">{errors.basketSizeId.message}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                  <h2 className="text-heading text-ink">Item and service pricing</h2>
                  <p className="mt-1 text-body text-muted">Pick the exact garment-care services needed for this order.</p>
                  <div className="mt-5 grid gap-4">
                    {services.map((service) => (
                      <QuantitySelector
                        key={service.id}
                        label={service.name}
                        description={`${service.shortDescription} · ${service.turnaroundLabel}${service.pricingModel === 'PER_KILOGRAM' ? ' · Final amount confirmed after weighing' : ''}`}
                        priceLabel={`${formatCurrency(service.basePrice)} / ${service.unitLabel}`}
                        quantity={watchedValues.serviceQuantities?.[service.id] ?? 0}
                        onChange={(quantity) => updateQuantity('serviceQuantities', service.id, quantity)}
                      />
                    ))}
                  </div>
                  {serviceQuantitiesError ? (
                    <p className="mt-3 text-caption text-status-error">{serviceQuantitiesError}</p>
                  ) : null}
                </div>
              )}

              {/* Add-ons */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">Add-ons and upsells</h2>
                <p className="mt-1 text-body text-muted">Boost order value with premium add-ons and express turnaround.</p>
                <div className="mt-5 grid gap-4">
                  {visibleAddOns.map((addOn) => (
                    <QuantitySelector
                      key={addOn.id}
                      label={addOn.name}
                      description={addOn.description}
                      priceLabel={formatCurrency(addOn.price)}
                      quantity={watchedValues.addOnQuantities?.[addOn.id] ?? 0}
                      suggestionTag={addOn.suggestionTag}
                      onChange={(quantity) => updateQuantity('addOnQuantities', addOn.id, quantity)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={goNext}>
                  Next: Schedule &amp; address →
                </Button>
              </div>
            </>
          ) : null}

          {/* ── Step 2: Schedule & address ─────────────────────────────────── */}
          {step === 2 ? (
            <>
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
                  {user.addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setValue('pickupAddressId', address.id, { shouldValidate: true })}
                      className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                        watchedValues.pickupAddressId === address.id
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
                {errors.pickupAddressId?.message ? (
                  <p className="mt-3 text-caption text-status-error">{errors.pickupAddressId.message}</p>
                ) : null}
              </div>

              {/* Delivery address */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">Delivery address</h2>
                <p className="mt-1 text-body text-muted">Where should clean laundry be delivered?</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {user.addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setValue('deliveryAddressId', address.id, { shouldValidate: true })}
                      className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                        watchedValues.deliveryAddressId === address.id
                          ? 'border-load-500 bg-load-50 shadow-card'
                          : 'border-card-border bg-white hover:border-load-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink">{address.label}</p>
                      <p className="mt-1 text-body text-muted">{address.line1}, {address.suburb}</p>
                    </button>
                  ))}
                </div>
                {errors.deliveryAddressId?.message ? (
                  <p className="mt-3 text-caption text-status-error">{errors.deliveryAddressId.message}</p>
                ) : null}
              </div>

              {/* Pickup window */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">Pickup window</h2>
                <p className="mt-1 text-body text-muted">Choose a convenient collection time.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {bookingWindows.map((windowLabel) => (
                    <button
                      key={windowLabel}
                      type="button"
                      onClick={() => setValue('pickupWindow', windowLabel, { shouldValidate: true })}
                      className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                        watchedValues.pickupWindow === windowLabel
                          ? 'border-load-500 bg-load-50 shadow-card'
                          : 'border-card-border bg-white hover:border-load-200'
                      }`}
                    >
                      <p className="text-body text-ink">{windowLabel}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery window */}
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
                <h2 className="text-heading text-ink">Delivery window</h2>
                <p className="mt-1 text-body text-muted">Choose a convenient delivery time.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {bookingWindows.map((windowLabel) => (
                    <button
                      key={windowLabel}
                      type="button"
                      onClick={() => setValue('deliveryWindow', windowLabel, { shouldValidate: true })}
                      className={`rounded-card border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-load-300 ${
                        watchedValues.deliveryWindow === windowLabel
                          ? 'border-load-500 bg-load-50 shadow-card'
                          : 'border-card-border bg-white hover:border-load-200'
                      }`}
                    >
                      <p className="text-body text-ink">{windowLabel}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" type="button" onClick={goBack}>
                  ← Back
                </Button>
                <Button type="button" onClick={goNext}>
                  Next: Review &amp; pay →
                </Button>
              </div>
            </>
          ) : null}

          {/* ── Step 3: Review & pay ───────────────────────────────────────── */}
          {step === 3 ? (
            <>
              <div className="rounded-panel border border-card-border bg-white p-5 shadow-card space-y-5">
                <div>
                  <h2 className="text-heading text-ink">Promotion &amp; rewards</h2>
                  <p className="mt-1 text-body text-muted">Apply a promotion code or redeem loyalty rewards at checkout.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-caption font-semibold text-ink">Promotion code</p>
                    <select
                      {...register('promotionCode')}
                      className="h-control w-full rounded-input border border-input-border bg-white px-4 text-body text-ink outline-none transition focus:border-input-focus focus:shadow-input"
                    >
                      <option value="">No promotion</option>
                      {promotions.map((promotion) => (
                        <option key={promotion.code} value={promotion.code}>
                          {promotion.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-card border p-4 transition ${
                      watchedValues.useLoyaltyPoints
                        ? 'border-load-500 bg-load-50'
                        : 'border-card-border bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">Redeem loyalty rewards</p>
                      <p className="mt-0.5 text-caption text-muted">Apply available reward balance to this order.</p>
                    </div>
                    <input type="checkbox" {...register('useLoyaltyPoints')} className="sr-only" />
                    <div
                      className={`relative h-6 w-10 flex-shrink-0 rounded-pill transition ${
                        watchedValues.useLoyaltyPoints ? 'bg-load-600' : 'bg-load-100'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
                          watchedValues.useLoyaltyPoints ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </div>
                  </label>
                </div>

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-card border p-4 transition ${
                    watchedValues.expressRequested ? 'border-load-500 bg-load-50' : 'border-card-border bg-white'
                  }`}
                >
                  <input type="checkbox" {...register('expressRequested')} />
                  <div>
                    <p className="text-sm font-semibold text-ink">Express turnaround</p>
                    <p className="text-caption text-muted">
                      Priority same-day processing where available — {formatCurrency(expressAddOn?.price ?? 79)}
                    </p>
                  </div>
                </label>
              </div>

              <DriverTipSelector value={tip} onChange={setTip} />

              {isWeightBasedOrder ? (
                <Card className="space-y-3">
                  <h3 className="text-title text-ink">Payment Method</h3>
                  <p className="text-body text-muted">
                    Final payment is not required yet. We’ll confirm the total after collection and weighing.
                  </p>
                </Card>
              ) : (
                <PaymentMethodSelector
                  selected={paymentMethod}
                  onChange={(method) => {
                    setPaymentMethod(method)
                    setPaymentResult(null)
                  }}
                  payableTotal={payableTotal}
                  onApplePay={() => {
                    void processCheckout('APPLE_PAY')
                  }}
                  onCardSubmit={(details) => {
                    void processCheckout('CARD', details)
                  }}
                  onCardCancel={() => {
                    setPaymentMethod(null)
                    setPaymentResult(null)
                  }}
                  isProcessing={isPaymentProcessing || placeOrderMutation.isPending}
                />
              )}

              {showPaymentFailure ? (
                <Card className="space-y-4 border-status-error/40">
                  <div>
                    <h3 className="text-title text-status-error">
                      {paymentResult?.status === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed'}
                    </h3>
                    <p className="mt-1 text-body text-muted">
                      {paymentResult?.failureReason ?? 'Please review your payment details and try again.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPaymentResult(null)
                        setToast({ message: 'Please review your payment details and try again.', tone: 'error' })
                      }}
                    >
                      Retry
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setPaymentMethod(null)
                        setPaymentResult(null)
                      }}
                    >
                      Change method
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setPaymentResult(null)
                        goBack()
                      }}
                    >
                      Back to checkout
                    </Button>
                  </div>
                </Card>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" type="button" onClick={goBack} disabled={isPaymentProcessing}>
                  ← Back
                </Button>
                {isWeightBasedOrder ? (
                  <Button
                    type="button"
                    onClick={() => {
                      void confirmWeightBasedOrder()
                    }}
                    loading={placeOrderMutation.isPending}
                    disabled={!quoteQuery.data || !hasAddresses}
                  >
                    Confirm Order
                  </Button>
                ) : paymentMethod === null ? (
                  <Button type="button" disabled>
                    Select payment method
                  </Button>
                ) : paymentMethod === 'CARD' ? (
                  <p className="text-sm text-muted">Enter your card details above to complete your booking.</p>
                ) : null}
              </div>
            </>
          ) : null}

        </div>

        {step === 3 ? (
          <OrderSummaryPanel
            quote={quoteQuery.data ?? null}
            tip={tip}
            isWeightBased={Boolean(quoteQuery.data?.estimatedWeightKg) || isWeightBasedOrder}
          />
        ) : (
          <BookingSummaryCard
            canSubmit={false}
            isSubmitting={isSubmitting || placeOrderMutation.isPending || quoteQuery.isFetching}
            onSubmit={() => undefined}
            quote={quoteQuery.data ?? null}
          />
        )}
      </div>
    </div>
  )
}
