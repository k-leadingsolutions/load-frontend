import type { Address } from '@/domain/models'
import { laundryOrderFromDto } from '@/services/api/adapters'
import { errorResponse, successResponse } from '@/services/api/envelope'
import { ApiRequestError, apiRequest } from '@/services/api/httpClient'
import type { CreateOrderRequestDto, OrderResponseDto, ServiceSelectionDto } from '@/services/api/types'
import { apiAddressService } from '@/services/api/addressService'
import type { CustomerOrderResponse, CustomerOrdersResponse, PlaceOrderRequest } from '@/services/contracts'
import { mockCatalogueService } from '@/services/mock'

/**
 * Splits a booking-flow window string of the form `"YYYY-MM-DD | label"`
 * (see `bookingOptions.ts`) into the separate date/label fields the backend
 * requires.
 */
const splitWindow = (window: string): { date: string; label: string } => {
  const [date, ...rest] = window.split('|').map((part) => part.trim())
  return { date: date ?? window, label: rest.length > 0 ? rest.join('|').trim() : window }
}

/**
 * The backend's `services` list is a single flat array with no separate
 * add-on concept. Frontend service and add-on selections are merged into
 * one list here; `unitLabel` is resolved from the (still-mocked) catalogue,
 * which is reference/master data rather than order-specific state.
 */
const buildServiceSelections = async (
  request: PlaceOrderRequest,
): Promise<ServiceSelectionDto[]> => {
  const catalogueResponse = await mockCatalogueService.getCatalogue()
  const services = catalogueResponse.data?.services ?? []
  const addOns = catalogueResponse.data?.addOns ?? []

  const unitLabelFor = (id: string): string =>
    services.find((service) => service.id === id)?.unitLabel ??
    addOns.find((addOn) => addOn.id === id)?.name ??
    'unit'

  return [
    ...request.serviceSelections.map((selection) => ({
      serviceId: selection.serviceId,
      quantity: selection.quantity,
      unitLabel: unitLabelFor(selection.serviceId),
    })),
    ...request.addOnSelections.map((selection) => ({
      serviceId: selection.addOnId,
      quantity: selection.quantity,
      unitLabel: unitLabelFor(selection.addOnId),
    })),
  ]
}

const resolveAddresses = async (): Promise<Map<string, Address>> => {
  const addresses = await apiAddressService.listAddresses()
  return new Map(addresses.map((address) => [address.id, address]))
}

export const apiCustomerOrderService = {
  listOrders: async (customerId: string): Promise<CustomerOrdersResponse> => {
    try {
      const dtos = await apiRequest<OrderResponseDto[]>('/api/customer/orders', { realm: 'customer' })
      const addressLookup = await resolveAddresses()
      return successResponse(dtos.map((dto) => laundryOrderFromDto(dto, customerId, addressLookup)))
    } catch (error) {
      return errorResponse({
        code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unable to load orders.',
      })
    }
  },

  getOrder: async (orderId: string): Promise<CustomerOrderResponse> => {
    try {
      const [dto, profile] = await Promise.all([
        apiRequest<OrderResponseDto>(`/api/customer/orders/${orderId}`, { realm: 'customer' }),
        apiRequest<{ userId: string }>('/api/customer/profile', { realm: 'customer' }),
      ])
      const addressLookup = await resolveAddresses()
      return successResponse(laundryOrderFromDto(dto, profile.userId, addressLookup))
    } catch (error) {
      return errorResponse({
        code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unable to load order.',
      })
    }
  },

  placeOrder: async (request: PlaceOrderRequest): Promise<CustomerOrderResponse> => {
    try {
      const pickup = splitWindow(request.pickupWindow)
      const delivery = request.deliveryWindow ? splitWindow(request.deliveryWindow) : undefined
      const services = await buildServiceSelections(request)

      const quote = await mockCatalogueService.getQuote({
        serviceSelections: request.serviceSelections,
        addOnSelections: request.addOnSelections,
        ...(request.promotionCode ? { promotionCode: request.promotionCode } : {}),
        expressRequested: false,
        ...(request.useLoyaltyPoints !== undefined ? { useLoyaltyPoints: request.useLoyaltyPoints } : {}),
      })
      const estimatedTotal = quote.data?.estimatedTotal ?? 0

      const body: CreateOrderRequestDto = {
        fulfilmentType: request.fulfilmentType ?? 'DELIVERY',
        pickupAddressId: request.pickupAddressId,
        pickupWindowDate: pickup.date,
        pickupWindowLabel: pickup.label,
        ...(request.deliveryAddressId ? { deliveryAddressId: request.deliveryAddressId } : {}),
        ...(delivery ? { deliveryWindowDate: delivery.date, deliveryWindowLabel: delivery.label } : {}),
        services,
        estimatedTotal,
      }

      const dto = await apiRequest<OrderResponseDto>('/api/customer/orders', {
        method: 'POST',
        realm: 'customer',
        body,
      })
      const addressLookup = await resolveAddresses()
      return successResponse(laundryOrderFromDto(dto, request.customerId, addressLookup))
    } catch (error) {
      return errorResponse({
        code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unable to place order.',
      })
    }
  },
}
