import { ORDER_STATUS_MODEL, ORDER_STATUS_SEQUENCE, getFriendlyOrderStatus } from '@/domain/orderStatus'

describe('order status model', () => {
  it('keeps the MVP workflow order intact', () => {
    expect(ORDER_STATUS_SEQUENCE[0]).toBe('BOOKING_RECEIVED')
    expect(ORDER_STATUS_SEQUENCE[ORDER_STATUS_SEQUENCE.length - 1]).toBe('CANCELLED')
  })

  it('exposes customer-friendly labels', () => {
    expect(getFriendlyOrderStatus('READY_FOR_DISPATCH')).toBe('Ready for delivery')
    expect(ORDER_STATUS_MODEL.WASHING.description).toContain('wash cycle')
  })
})
