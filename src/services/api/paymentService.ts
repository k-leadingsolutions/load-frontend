import type { ApplePayPaymentRequest, CardPaymentRequest, CreatePaymentRequest, PaymentResult } from '@/domain/models'
import { apiRequest } from '@/services/api/httpClient'
import type { PaymentResponseDto } from '@/services/api/types'

/**
 * Real Customer payment integration. The backend endpoint
 * (`POST /api/customer/orders/{orderId}/payments`) takes NO request body: it
 * always charges the order's own `finalInvoiceTotal` and rejects if the
 * invoice is not READY or payment already CONFIRMED. Client-supplied amount,
 * card details, and tip are therefore never sent — the backend is the sole
 * source of the charged amount (see PaymentService.pay()).
 */
const pay = async (request: CreatePaymentRequest): Promise<PaymentResult> => {
  try {
    const dto = await apiRequest<PaymentResponseDto>(`/api/customer/orders/${request.orderId}/payments`, {
      method: 'POST',
      realm: 'customer',
    })

    return {
      paymentId: dto.id,
      status: dto.status === 'CONFIRMED' ? 'SUCCEEDED' : dto.status === 'FAILED' ? 'FAILED' : 'CANCELLED',
      amount: dto.amount,
      paymentMethod: request.paymentMethod,
      processedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      paymentId: '',
      status: 'FAILED',
      amount: request.amount,
      paymentMethod: request.paymentMethod,
      processedAt: new Date().toISOString(),
      failureReason: error instanceof Error ? error.message : 'Payment failed.',
    }
  }
}

export const apiPaymentService = {
  createPayment: pay,
  processApplePay: (request: ApplePayPaymentRequest): Promise<PaymentResult> => pay(request),
  processCardPayment: (request: CardPaymentRequest): Promise<PaymentResult> => pay(request),
  /**
   * The backend has no payment-lookup-by-id endpoint yet (see integration
   * report gap). Real payment status is only ever available synchronously
   * from the `pay()` response itself, so this is not called by any current
   * production caller.
   */
  getPaymentStatus: async (): Promise<PaymentResult> => {
    throw new Error('Payment status lookup is not yet available from the backend.')
  },
}
