import type {
  ApplePayPaymentRequest,
  CardPaymentRequest,
  CreatePaymentRequest,
  PaymentResult,
} from '@/domain/models'
import type { PaymentService } from '@/services/interfaces'

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration))

const paymentStore = new Map<string, PaymentResult>()

const createResult = (
  amount: number,
  paymentMethod: PaymentResult['paymentMethod'],
  overrides?: Partial<PaymentResult>,
): PaymentResult => ({
  paymentId: `pay_${crypto.randomUUID()}`,
  status: 'SUCCEEDED',
  amount,
  paymentMethod,
  processedAt: new Date().toISOString(),
  ...overrides,
})

class MockPaymentService implements PaymentService {
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (request.paymentMethod === 'APPLE_PAY') {
      return this.processApplePay({ ...request, paymentMethod: 'APPLE_PAY' })
    }

    return Promise.reject(new Error('Card details are required to process a card payment.'))
  }

  async processApplePay(request: ApplePayPaymentRequest): Promise<PaymentResult> {
    void request.orderId
    void request.tip
    await wait(800)

    const result = createResult(request.amount, 'APPLE_PAY')
    paymentStore.set(result.paymentId, result)
    return result
  }

  async processCardPayment(request: CardPaymentRequest): Promise<PaymentResult> {
    void request.orderId
    void request.tip
    const digitsOnly = request.cardDetails.cardNumber.replace(/\D/g, '')

    await wait(800)

    const result = digitsOnly.endsWith('0000')
      ? createResult(request.amount, 'CARD', {
          status: 'FAILED',
          failureReason: 'Card declined',
        })
      : digitsOnly.endsWith('0002')
        ? createResult(request.amount, 'CARD', {
            status: 'CANCELLED',
            failureReason: 'Payment cancelled',
          })
        : createResult(request.amount, 'CARD')

    paymentStore.set(result.paymentId, result)
    return result
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    const payment = paymentStore.get(paymentId)

    if (!payment) {
      throw new Error('Payment could not be located.')
    }

    return payment
  }
}

export const mockPaymentService = new MockPaymentService()
