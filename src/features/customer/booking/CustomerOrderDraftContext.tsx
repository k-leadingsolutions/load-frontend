import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { CustomerOrderDraft, FulfilmentType } from '@/domain/models/booking'
import { approvedLaundryServices } from '@/services/mock/approvedLaundryCatalogue'
import { isDeliveryWindowAfterPickup } from '@/features/customer/booking/bookingOptions'

/**
 * Client-side Customer laundry order draft — the single source of truth for
 * "what has this Customer selected so far" while browsing the category
 * catalogue and completing the Collection & Delivery / Review steps.
 *
 * Deliberately in-memory only (no localStorage): the draft must survive
 * navigation between /customer/services, /customer/services/:categoryId and
 * /customer/booking within a session, but does not need to survive a full
 * browser reload. This intentionally mirrors, but does not couple to,
 * `CoffeeCartContext` (LOAD Coffee has its own product/modifier cart).
 */

const PRICING_MODELS_USING_QUANTITY = new Set(['PER_ITEM', 'FIXED_SERVICE', 'PER_BASKET'])

const isToggleOnlyService = (serviceId: string): boolean => {
  const service = approvedLaundryServices.find((item) => item.id === serviceId)
  if (!service) return false
  return !PRICING_MODELS_USING_QUANTITY.has(service.pricingModel)
}

const createEmptyDraft = (): CustomerOrderDraft => ({
  serviceSelections: [],
  addOnSelections: [],
  fulfilmentType: 'DELIVERY',
  pickupAddressId: '',
  deliveryAddressId: '',
  pickupWindow: '',
  deliveryWindow: '',
  customerInstructions: '',
  expressRequested: false,
})

interface CustomerOrderDraftContextValue {
  draft: CustomerOrderDraft
  /** Count of distinct services/add-ons selected — used for the "N items selected" indicator. */
  selectedCount: number
  hasSelectedServices: boolean
  getServiceQuantity: (serviceId: string) => number
  isServiceSelected: (serviceId: string) => boolean
  /** For PER_ITEM / FIXED_SERVICE — sets an explicit repeat-unit quantity. */
  setServiceQuantity: (serviceId: string, quantity: number) => void
  /** For PER_KILOGRAM / ASSESSMENT_REQUIRED / QUOTE_REQUIRED — Add/Remove toggle (never a declared quantity). */
  toggleService: (serviceId: string) => void
  getAddOnQuantity: (addOnId: string) => number
  setAddOnQuantity: (addOnId: string, quantity: number) => void
  setExpressRequested: (requested: boolean) => void
  setFulfilmentType: (fulfilmentType: FulfilmentType) => void
  setPickupAddressId: (addressId: string) => void
  setDeliveryAddressId: (addressId: string) => void
  setPickupWindow: (windowLabel: string) => void
  setDeliveryWindow: (windowLabel: string) => void
  setCustomerInstructions: (instructions: string) => void
  resetDraft: () => void
}

const CustomerOrderDraftContext = createContext<CustomerOrderDraftContextValue | undefined>(undefined)

export const CustomerOrderDraftProvider = ({ children }: PropsWithChildren) => {
  const [draft, setDraft] = useState<CustomerOrderDraft>(() => createEmptyDraft())

  const setServiceQuantity = useCallback((serviceId: string, quantity: number) => {
    setDraft((prev) => {
      const next = quantity > 0
        ? [
            ...prev.serviceSelections.filter((s) => s.serviceId !== serviceId),
            { serviceId, quantity },
          ]
        : prev.serviceSelections.filter((s) => s.serviceId !== serviceId)
      return { ...prev, serviceSelections: next }
    })
  }, [])

  const toggleService = useCallback((serviceId: string) => {
    setDraft((prev) => {
      const isSelected = prev.serviceSelections.some((s) => s.serviceId === serviceId)
      const next = isSelected
        ? prev.serviceSelections.filter((s) => s.serviceId !== serviceId)
        : [...prev.serviceSelections, { serviceId, quantity: 1 }]
      return { ...prev, serviceSelections: next }
    })
  }, [])

  const setAddOnQuantity = useCallback((addOnId: string, quantity: number) => {
    setDraft((prev) => {
      const next = quantity > 0
        ? [
            ...prev.addOnSelections.filter((a) => a.addOnId !== addOnId),
            { addOnId, quantity },
          ]
        : prev.addOnSelections.filter((a) => a.addOnId !== addOnId)
      return { ...prev, addOnSelections: next }
    })
  }, [])

  const setExpressRequested = useCallback((requested: boolean) => {
    setDraft((prev) => ({ ...prev, expressRequested: requested }))
  }, [])

  const setFulfilmentType = useCallback((fulfilmentType: FulfilmentType) => {
    setDraft((prev) => ({ ...prev, fulfilmentType }))
  }, [])

  const setPickupAddressId = useCallback((addressId: string) => {
    setDraft((prev) => ({ ...prev, pickupAddressId: addressId }))
  }, [])

  const setDeliveryAddressId = useCallback((addressId: string) => {
    setDraft((prev) => ({ ...prev, deliveryAddressId: addressId }))
  }, [])

  const setPickupWindow = useCallback((windowLabel: string) => {
    setDraft((prev) => {
      // If the existing delivery selection is no longer chronologically
      // after the newly-selected pickup window (including the same slot),
      // clear it rather than silently leaving an invalid combination.
      const deliveryStillValid = prev.deliveryWindow !== '' && isDeliveryWindowAfterPickup(windowLabel, prev.deliveryWindow)
      return {
        ...prev,
        pickupWindow: windowLabel,
        deliveryWindow: deliveryStillValid ? prev.deliveryWindow : '',
      }
    })
  }, [])

  const setDeliveryWindow = useCallback((windowLabel: string) => {
    setDraft((prev) => ({ ...prev, deliveryWindow: windowLabel }))
  }, [])

  const setCustomerInstructions = useCallback((instructions: string) => {
    setDraft((prev) => ({ ...prev, customerInstructions: instructions }))
  }, [])

  const resetDraft = useCallback(() => setDraft(createEmptyDraft()), [])

  const getServiceQuantity = useCallback(
    (serviceId: string) => draft.serviceSelections.find((s) => s.serviceId === serviceId)?.quantity ?? 0,
    [draft.serviceSelections],
  )

  const isServiceSelected = useCallback(
    (serviceId: string) => draft.serviceSelections.some((s) => s.serviceId === serviceId),
    [draft.serviceSelections],
  )

  const getAddOnQuantity = useCallback(
    (addOnId: string) => draft.addOnSelections.find((a) => a.addOnId === addOnId)?.quantity ?? 0,
    [draft.addOnSelections],
  )

  const selectedCount = useMemo(
    () => draft.serviceSelections.reduce((sum, selection) => {
      // Toggle-based selections (weight/assessment) always count as 1 "service",
      // never as a fabricated quantity.
      return sum + (isToggleOnlyService(selection.serviceId) ? 1 : selection.quantity)
    }, 0),
    [draft.serviceSelections],
  )

  const hasSelectedServices = draft.serviceSelections.length > 0

  const value = useMemo<CustomerOrderDraftContextValue>(
    () => ({
      draft,
      selectedCount,
      hasSelectedServices,
      getServiceQuantity,
      isServiceSelected,
      setServiceQuantity,
      toggleService,
      getAddOnQuantity,
      setAddOnQuantity,
      setExpressRequested,
      setFulfilmentType,
      setPickupAddressId,
      setDeliveryAddressId,
      setPickupWindow,
      setDeliveryWindow,
      setCustomerInstructions,
      resetDraft,
    }),
    [
      draft,
      selectedCount,
      hasSelectedServices,
      getServiceQuantity,
      isServiceSelected,
      setServiceQuantity,
      toggleService,
      getAddOnQuantity,
      setAddOnQuantity,
      setExpressRequested,
      setFulfilmentType,
      setPickupAddressId,
      setDeliveryAddressId,
      setPickupWindow,
      setDeliveryWindow,
      setCustomerInstructions,
      resetDraft,
    ],
  )

  return <CustomerOrderDraftContext.Provider value={value}>{children}</CustomerOrderDraftContext.Provider>
}

export const useCustomerOrderDraft = () => {
  const context = useContext(CustomerOrderDraftContext)
  if (!context) {
    throw new Error('useCustomerOrderDraft must be used within a CustomerOrderDraftProvider.')
  }
  return context
}

/** Exposed for pricing-model-aware UI components deciding stepper vs toggle interaction. */
export const usesQuantityInteraction = (pricingModel: string): boolean =>
  PRICING_MODELS_USING_QUANTITY.has(pricingModel)
