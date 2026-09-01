import type { PaymentSummary, PricingQuote, TipSelection } from '@/domain/models'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/format'

interface OrderSummaryPanelProps {
  quote: PricingQuote | null
  tip: TipSelection
  isWeightBased: boolean
}

const DELIVERY_FEE = 45

const formatLineAmount = (amount: number, negative = false) => `${negative ? '-' : ''}${formatCurrency(amount)}`

const getPaymentSummary = (quote: PricingQuote, tip: TipSelection): PaymentSummary => {
  const servicesSubtotal = quote.lineItems
    .filter((item) => item.pricingType === 'SERVICE')
    .reduce((sum, item) => sum + item.totalPrice, 0)
  const addonsSubtotal = quote.lineItems
    .filter((item) => item.pricingType === 'ADD_ON')
    .reduce((sum, item) => sum + item.totalPrice, 0)
  const promotionDiscount = Math.abs(
    quote.lineItems.find((item) => item.id === 'promotion-discount')?.totalPrice ?? 0,
  )
  const loyaltyDiscount = Math.abs(
    quote.lineItems.find((item) => item.id === 'loyalty-redemption')?.totalPrice ?? 0,
  )
  const freeDeliveryDiscount = quote.deliveryFee === 0 && quote.freeDeliveryGap === 0 ? DELIVERY_FEE : 0

  return {
    servicesSubtotal,
    addonsSubtotal,
    expressFee: quote.expressFee,
    deliveryFee: quote.deliveryFee,
    promotionDiscount,
    freeDeliveryDiscount,
    loyaltyDiscount,
    driverTip: tip.amount,
    payableTotal: quote.estimatedTotal + tip.amount,
  }
}

export const OrderSummaryPanel = ({ quote, tip, isWeightBased }: OrderSummaryPanelProps) => {
  if (!quote) {
    return (
      <aside className="xl:sticky xl:top-6">
        <Card variant="elevated" className="space-y-4">
          <h2 className="text-heading text-ink">Order summary</h2>
          <p className="text-body text-muted">Select services to see your order summary.</p>
        </Card>
      </aside>
    )
  }

  const paymentSummary = getPaymentSummary(quote, tip)
  const deliveryProgress = Math.min(100, (quote.subtotal / quote.freeDeliveryThreshold) * 100)
  const promotionName = quote.promotions.find((promotion) =>
    promotion.discountType === 'FIXED' || promotion.discountType === 'PERCENTAGE')

  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      <Card variant="elevated" className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-load-600">Order summary</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(paymentSummary.payableTotal)}</h2>
        </div>

        {isWeightBased ? (
          <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Estimated amount — final total confirmed after collection and weighing.
          </div>
        ) : null}

        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">Free delivery progress</span>
            <span className="font-semibold text-load-700">
              {quote.freeDeliveryGap > 0
                ? `${formatCurrency(quote.freeDeliveryGap)} to go`
                : 'Free delivery unlocked'}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-load-100">
            <div className="h-2 rounded-full bg-load-600" style={{ width: `${deliveryProgress}%` }} />
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Laundry services subtotal</span>
            <span className="font-semibold text-ink">{formatCurrency(paymentSummary.servicesSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Add-ons subtotal</span>
            <span className="font-semibold text-ink">{formatCurrency(paymentSummary.addonsSubtotal)}</span>
          </div>
          {paymentSummary.expressFee > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Express turnaround</span>
              <span className="font-semibold text-ink">{formatCurrency(paymentSummary.expressFee)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Pickup &amp; delivery fee</span>
            <span className="font-semibold text-ink">{formatCurrency(paymentSummary.deliveryFee)}</span>
          </div>
          {paymentSummary.promotionDiscount > 0 ? (
            <div className="flex items-center justify-between gap-3 text-load-700">
              <span>{promotionName ? `${promotionName.name} discount` : 'Promotion discount'}</span>
              <span className="font-semibold">{formatLineAmount(paymentSummary.promotionDiscount, true)}</span>
            </div>
          ) : null}
          {paymentSummary.freeDeliveryDiscount > 0 ? (
            <div className="flex items-center justify-between gap-3 text-load-700">
              <span>Free-delivery benefit</span>
              <span className="font-semibold">{formatLineAmount(paymentSummary.freeDeliveryDiscount, true)}</span>
            </div>
          ) : null}
          {paymentSummary.loyaltyDiscount > 0 ? (
            <div className="flex items-center justify-between gap-3 text-load-700">
              <span>Loyalty redemption</span>
              <span className="font-semibold">{formatLineAmount(paymentSummary.loyaltyDiscount, true)}</span>
            </div>
          ) : null}
          {paymentSummary.driverTip > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Driver tip</span>
              <span className="font-semibold text-ink">{formatCurrency(paymentSummary.driverTip)}</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-load-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-semibold text-ink">Total</span>
            <span className="text-xl font-semibold text-ink">{formatCurrency(paymentSummary.payableTotal)}</span>
          </div>
        </div>
      </Card>
    </aside>
  )
}
