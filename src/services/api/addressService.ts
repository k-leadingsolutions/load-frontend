import type { Address } from '@/domain/models'
import { addressFromDto } from '@/services/api/adapters'
import { apiRequest } from '@/services/api/httpClient'
import type { AddressResponseDto } from '@/services/api/types'

export interface CreateAddressInput {
  label: string
  line1: string
  suburb: string
  city: string
  postalCode: string
}

/**
 * Real backend-backed Customer address book. `province`/`deliveryInstructions`/
 * `isDefault` are not yet persisted server-side (backend schema gap — see
 * integration report); they are tracked client-side only until the backend
 * adds them.
 */
export const apiAddressService = {
  createAddress: async (input: CreateAddressInput, isDefault: boolean): Promise<Address> => {
    const dto = await apiRequest<AddressResponseDto>('/api/customer/addresses', {
      method: 'POST',
      realm: 'customer',
      body: { ...input, line2: null },
    })
    return addressFromDto(dto, isDefault)
  },

  listAddresses: async (): Promise<Address[]> => {
    const dtos = await apiRequest<AddressResponseDto[]>('/api/customer/addresses', { realm: 'customer' })
    return dtos.map((dto, index) => addressFromDto(dto, index === 0))
  },
}
