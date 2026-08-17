import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/app/providers/useAuth'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { BookingSummaryCard } from '@/features/customer/booking/BookingSummaryCard'
import { AddressSetupForm } from '@/features/customer/booking/AddressSetupForm'
import { bookingWindows, premiumBookingHighlights } from '@/features/customer/booking/bookingOptions'
import { QuantitySelector } from '@/features/customer/booking/QuantitySelector'
import { mockCatalogueService, mockCustomerOrderService } from '@/services/mock'
import { formatCurrency } from '@/utils/format'

const bookingSchema = z
  .object({
    pricingMode: z.enum(['BASKET', 'ITEM']),
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

    if (values.pricingMode === 'BASKET' && !values.basketSizeId) {
      context.addIssue({
        code: 'custom',
        message: 'Choose a basket size.',
        path: ['basketSizeId'],
      })
    }

    if (values.pricingMode === 'ITEM' && !hasServiceSelection) {
      context.addIssue({
        code: 'custom',
        message: 'Select at least one service item.',
        path: ['serviceQuantities'],
      })
    }
  })

type BookingFormValues = z.infer<typeof bookingSchema>

export const CustomerBookingPage = () => {
  const { user, saveAddress } = useAuth()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
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
      pricingMode: 'BASKET',
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

    const hasBasketSelection = watchedValues.pricingMode === 'BASKET' && Boolean(watchedValues.basketSizeId)
    const hasItemSelection = serviceSelections.length > 0

    if (!hasBasketSelection && !hasItemSelection) {
      return null
    }

    return {
      ...(watchedValues.pricingMode === 'BASKET' && watchedValues.basketSizeId
        ? { basketSizeId: watchedValues.basketSizeId }
        : {}),
      ...(watchedValues.pricingMode === 'BASKET'
        ? { basketQuantity: watchedValues.basketQuantity }
        : {}),
      serviceSelections: watchedValues.pricingMode === 'ITEM' ? serviceSelections : [],
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
      const response = await mockCustomerOrderService.placeOrder({
        customerId: user!.id,
        ...(values.pricingMode === 'BASKET' && values.basketSizeId ? { basketSizeId: values.basketSizeId } : {}),
        serviceSelections,
        addOnSelections,
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
    onSuccess: (order) => {
      setPlacedOrderId(order.id)
      setSubmitError(null)
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

  const updateQuantity = (field: 'serviceQuantities' | 'addOnQuantities', itemId: string, quantity: number) => {
    const current = getValues(field)
    setValue(field, { ...current, [itemId]: quantity }, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    try {
      await placeOrderMutation.mutateAsync(values)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to place order.')
    }
  })

  return (
    <div className="space-y-6">
      {placedOrderId ? (
        <SectionCard
          title="Order booked"
          description="Your order has been created with a customer-friendly status and is ready for the next MVP workflow stages."
        >
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
            Booking received for order <span className="font-semibold">#{placedOrderId}</span>.
          </div>
        </SectionCard>
      ) : null}

      {!hasAddresses ? (
        <SectionCard
          title="Save your first address"
          description="A saved address is required before pickup and delivery can be scheduled."
        >
          <EmptyState
            title="No saved addresses yet"
            description="Add a realistic pickup address now so the booking flow can estimate delivery and create your order."
          />
          <div className="mt-6">
            <AddressSetupForm
              onSave={(values) => {
                const nextAddress = {
                  label: values.label,
                  line1: values.line1,
                  suburb: values.suburb,
                  city: values.city,
                  province: values.province,
                  postalCode: values.postalCode,
                  ...(values.deliveryInstructions ? { deliveryInstructions: values.deliveryInstructions } : {}),
                  isDefault: true,
                }
                const address = saveAddress({
                  ...nextAddress,
                })

                if (address) {
                  setValue('pickupAddressId', address.id, { shouldValidate: true })
                  setValue('deliveryAddressId', address.id, { shouldValidate: true })
                }
              }}
            />
          </div>
        </SectionCard>
      ) : null}

      <form className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]" onSubmit={onSubmit}>
        <div className="space-y-6">
          <SectionCard
            title="Choose pricing mode"
            description="Switch between basket pricing and pay-per-item pricing without leaving the booking flow."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  key: 'BASKET' as const,
                  title: 'Pay per basket',
                  description: 'Best for mixed household loads with predictable pricing.',
                },
                {
                  key: 'ITEM' as const,
                  title: 'Pay per item or service',
                  description: 'Best for garment-specific cleaning and ironing.',
                },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setValue('pricingMode', option.key, { shouldDirty: true, shouldValidate: true })}
                  className={`rounded-3xl border p-5 text-left transition ${
                    watchedValues.pricingMode === option.key
                      ? 'border-load-500 bg-load-50 shadow-panel'
                      : 'border-load-100 bg-white hover:border-load-200'
                  }`}
                >
                  <p className="font-semibold text-ink">{option.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          {watchedValues.pricingMode === 'BASKET' ? (
            <SectionCard
              title="Basket pricing"
              description="Choose the basket size that best matches this collection."
            >
              <div className="grid gap-4 lg:grid-cols-3">
                {basketSizes.map((basket) => (
                  <button
                    key={basket.id}
                    type="button"
                    onClick={() => setValue('basketSizeId', basket.id, { shouldDirty: true, shouldValidate: true })}
                    className={`rounded-3xl border p-5 text-left transition ${
                      watchedValues.basketSizeId === basket.id
                        ? 'border-load-500 bg-load-50 shadow-panel'
                        : 'border-load-100 bg-white hover:border-load-200'
                    }`}
                  >
                    <p className="font-semibold text-ink">{basket.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{basket.recommendedFor}</p>
                    <p className="mt-4 text-lg font-semibold text-load-700">{formatCurrency(basket.price)}</p>
                    <p className="text-sm text-slate-500">{basket.capacityLabel}</p>
                  </button>
                ))}
              </div>
              {errors.basketSizeId?.message ? <p className="mt-3 text-sm text-rose-600">{errors.basketSizeId.message}</p> : null}
            </SectionCard>
          ) : (
            <SectionCard
              title="Item and service pricing"
              description="Pick the exact garment-care services needed for this order."
            >
              <div className="grid gap-4">
                {services.map((service) => (
                  <QuantitySelector
                    key={service.id}
                    label={service.name}
                    description={`${service.shortDescription} · ${service.turnaroundLabel}`}
                    priceLabel={`${formatCurrency(service.basePrice)} / ${service.unitLabel}`}
                    quantity={watchedValues.serviceQuantities?.[service.id] ?? 0}
                    onChange={(quantity) => updateQuantity('serviceQuantities', service.id, quantity)}
                  />
                ))}
              </div>
              {serviceQuantitiesError ? <p className="mt-3 text-sm text-rose-600">{serviceQuantitiesError}</p> : null}
            </SectionCard>
          )}

          <SectionCard
            title="Add-ons and upsells"
            description="Boost order value with premium add-ons and express turnaround."
          >
            <div className="grid gap-4">
              {addOns.map((addOn) => (
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
            <label className="mt-5 flex items-center gap-3 rounded-3xl border border-load-100 bg-load-50/60 p-4 text-sm text-slate-600">
              <input type="checkbox" {...register('expressRequested')} />
              Add express-service upsell for same-day priority where available ({formatCurrency(79)})
            </label>
          </SectionCard>

          <SectionCard
            title="Pickup, delivery, and checkout options"
            description="Select saved addresses, schedule both legs, and apply promotions or loyalty rewards."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Pickup address</span>
                <select
                  {...register('pickupAddressId')}
                  className="w-full rounded-2xl border border-load-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
                >
                  <option value="">Select pickup address</option>
                  {user.addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label} · {address.line1}, {address.suburb}
                    </option>
                  ))}
                </select>
                {errors.pickupAddressId?.message ? <p className="text-sm text-rose-600">{errors.pickupAddressId.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Delivery address</span>
                <select
                  {...register('deliveryAddressId')}
                  className="w-full rounded-2xl border border-load-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
                >
                  <option value="">Select delivery address</option>
                  {user.addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label} · {address.line1}, {address.suburb}
                    </option>
                  ))}
                </select>
                {errors.deliveryAddressId?.message ? <p className="text-sm text-rose-600">{errors.deliveryAddressId.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Pickup window</span>
                <select
                  {...register('pickupWindow')}
                  className="w-full rounded-2xl border border-load-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
                >
                  {bookingWindows.map((windowLabel) => (
                    <option key={windowLabel} value={windowLabel}>
                      {windowLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Delivery window</span>
                <select
                  {...register('deliveryWindow')}
                  className="w-full rounded-2xl border border-load-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
                >
                  {bookingWindows.map((windowLabel) => (
                    <option key={windowLabel} value={windowLabel}>
                      {windowLabel}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Promotion</span>
                <select
                  {...register('promotionCode')}
                  className="w-full rounded-2xl border border-load-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
                >
                  <option value="">No promotion</option>
                  {promotions.map((promotion) => (
                    <option key={promotion.code} value={promotion.code}>
                      {promotion.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3">
                <label className="flex items-center gap-3 rounded-3xl border border-load-100 bg-load-50/60 p-4 text-sm text-slate-600">
                  <input type="checkbox" {...register('useLoyaltyPoints')} />
                  Redeem available loyalty rewards during checkout
                </label>
                <div className="rounded-3xl border border-dashed border-load-200 p-4 text-sm text-slate-500">
                  Future-ready: LOAD Pass, referral rewards, and subscriptions remain placeholders for later modules.
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Revenue and convenience cues"
            description="Commercial features designed for launch-day conversion without expanding scope."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {premiumBookingHighlights.map((item) => (
                <div key={item} className="rounded-3xl bg-load-50 px-4 py-3 text-sm text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          {submitError ? <ErrorState title="Unable to place order" message={submitError} /> : null}
        </div>

        <BookingSummaryCard
          canSubmit={Boolean(quoteQuery.data) && hasAddresses}
          isSubmitting={isSubmitting || placeOrderMutation.isPending || quoteQuery.isFetching}
          onSubmit={() => {
            void onSubmit()
          }}
          quote={quoteQuery.data ?? null}
        />
      </form>
    </div>
  )
}
