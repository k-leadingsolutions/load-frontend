import type { CardPaymentDetails, PaymentMethodType } from '@/domain/models'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CardPaymentForm } from '@/features/customer/checkout/CardPaymentForm'
import { formatCurrency } from '@/utils/format'

interface PaymentMethodSelectorProps {
  selected: PaymentMethodType | null
  onChange: (method: PaymentMethodType) => void
  payableTotal: number
  onApplePay?: () => void
  onCardSubmit?: (details: CardPaymentDetails) => void
  onCardCancel?: () => void
  isProcessing?: boolean
}

const tileClassName = (selected: boolean) =>
  `rounded-card border p-4 text-left transition ${
    selected ? 'border-load-500 bg-load-50 shadow-card' : 'border-card-border bg-white hover:border-load-200'
  }`

export const PaymentMethodSelector = ({
  selected,
  onChange,
  payableTotal,
  onApplePay,
  onCardSubmit,
  onCardCancel,
  isProcessing = false,
}: PaymentMethodSelectorProps) => (
  <Card className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-title text-ink">Payment Method</h3>
        <p className="mt-1 text-body text-muted">Choose how you would like to complete checkout.</p>
      </div>
      <Badge tone="success">Secure payment</Badge>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      <button type="button" className={tileClassName(selected === 'APPLE_PAY')} onClick={() => onChange('APPLE_PAY')}>
        <p className="text-lg font-semibold text-ink"> Apple Pay</p>
        <p className="mt-1 text-body text-muted">Fast checkout using Apple Pay.</p>
      </button>

      <button type="button" className={tileClassName(selected === 'CARD')} onClick={() => onChange('CARD')}>
        <p className="text-lg font-semibold text-ink">💳 Credit / Debit Card</p>
        <p className="mt-1 text-body text-muted">Pay securely with your saved or new card.</p>
      </button>
    </div>

    {selected === 'APPLE_PAY' && onApplePay ? (
      <Button
        type="button"
        className="w-full bg-ink text-white hover:bg-slate-900"
        onClick={onApplePay}
        loading={isProcessing}
      >
        Pay {formatCurrency(payableTotal)} with Apple Pay
      </Button>
    ) : null}

    {selected === 'CARD' && onCardSubmit && onCardCancel ? (
      <CardPaymentForm onSubmit={onCardSubmit} isProcessing={isProcessing} onCancel={onCardCancel} />
    ) : null}
  </Card>
)
