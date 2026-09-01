import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { Toast } from '@/components/ui/Toast'
import type { CardPaymentDetails, PaymentMethodType, PaymentResult, TipSelection } from '@/domain/models'
import { CardPaymentForm } from '@/features/customer/checkout/CardPaymentForm'
import { DriverTipSelector } from '@/features/customer/checkout/DriverTipSelector'
import { PaymentMethodSelector } from '@/features/customer/checkout/PaymentMethodSelector'
import { mockDomainEventService, mockInvoiceService, mockPaymentService, mockPosService } from '@/services/mock'
import { updateStoredOrder } from '@/services/mock/orderStore'
import { formatCurrency } from '@/utils/format'

const isSuccessfulPayment = (result: PaymentResult) =>
  result.status === 'SUCCEEDED' || result.status === 'AUTHORIZED'

export const CustomerInvoicePayPage = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [tip, setTip] = useState<TipSelection>({ type: 'NONE', amount: 0 })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>('APPLE_PAY')
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const invoiceQuery = useQuery({
    queryKey: ['customer-invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        return null
      }

      return mockInvoiceService.getInvoice(invoiceId)
    },
    enabled: Boolean(invoiceId),
    retry: false,
  })
  const paymentMutation = useMutation({
    mutationFn: async ({
      method,
      cardDetails,
    }: {
      method: PaymentMethodType
      cardDetails?: CardPaymentDetails
    }) => {
      const invoice = invoiceQuery.data
      if (!invoice) {
        throw new Error('Invoice unavailable.')
      }

      const result = method === 'APPLE_PAY'
        ? await mockPaymentService.processApplePay({
            orderId: invoice.orderId,
            amount: invoice.finalTotal,
            paymentMethod: 'APPLE_PAY',
            tip,
          })
        : await mockPaymentService.processCardPayment({
            orderId: invoice.orderId,
            amount: invoice.finalTotal,
            paymentMethod: 'CARD',
            tip,
            cardDetails: cardDetails!,
          })

      if (isSuccessfulPayment(result)) {
        await mockPosService.updateInvoice(invoice.id, {
          status: 'PAID',
          paymentStatus: 'CONFIRMED',
          posSyncStatus: 'SYNCED',
        })
        updateStoredOrder(invoice.orderId, (order) => ({
          ...order,
          paymentStatus: 'CONFIRMED',
          ...(order.invoiceId ? {} : { invoiceId: invoice.id }),
        }))
        await mockDomainEventService.emit('PAYMENT_CONFIRMED', invoice.orderId, { invoiceId: invoice.id })
      }

      return result
    },
    onSuccess: async (result) => {
      setPaymentResult(result)
      if (isSuccessfulPayment(result) && invoiceId) {
        setToast({ message: 'Payment complete!', tone: 'success' })
        await queryClient.invalidateQueries({ queryKey: ['customer-invoice', invoiceId] })
        await queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
        return
      }

      setToast({ message: result.failureReason ?? 'Payment failed. Please try again.', tone: 'error' })
    },
    onError: (error) => {
      setToast({ message: error instanceof Error ? error.message : 'Payment failed. Please try again.', tone: 'error' })
    },
  })

  if (!invoiceId) {
    return <ErrorState title="Invoice unavailable" message="An invoice reference is required to load this page." />
  }

  if (invoiceQuery.isLoading) {
    return <LoadingState />
  }

  if (invoiceQuery.isError) {
    const message = invoiceQuery.error instanceof Error ? invoiceQuery.error.message : 'Unknown error'
    if (/not found/i.test(message)) {
      return (
        <div className="space-y-4">
          <EmptyState
            title="Invoice not found"
            description="We could not find the invoice you want to pay."
          />
          <div>
            <Link
              to={appPaths.customerOrders}
              className="inline-flex items-center justify-center rounded-pill bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
            >
              Back to orders
            </Link>
          </div>
        </div>
      )
    }

    return <ErrorState title="Unable to load invoice" message={message} />
  }

  const invoice = invoiceQuery.data

  if (!invoice) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Invoice not found"
          description="We could not find the invoice you want to pay."
        />
        <div>
          <Link
            to={appPaths.customerOrders}
            className="inline-flex items-center justify-center rounded-pill bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            Back to orders
          </Link>
        </div>
      </div>
    )
  }

  if (paymentResult && isSuccessfulPayment(paymentResult)) {
    return (
      <SectionCard title="Payment complete!" description={`Your payment for order #${invoice.orderId} has been confirmed.`}>
        <div className="space-y-4">
          <Card variant="flat" className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Service</span>
              <span className="font-semibold text-ink">{invoice.serviceLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Final total</span>
              <span className="font-semibold text-ink">{formatCurrency(invoice.finalTotal)}</span>
            </div>
            {tip.amount > 0 ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Tip</span>
                <span className="font-semibold text-ink">{formatCurrency(tip.amount)}</span>
              </div>
            ) : null}
          </Card>
          <Link
            to={appPaths.customerOrders}
            className="inline-flex items-center justify-center rounded-pill bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            View my orders
          </Link>
        </div>
      </SectionCard>
    )
  }

  const alreadyPaid = invoice.status === 'PAID' || invoice.paymentStatus === 'CONFIRMED'
  const showRetry = paymentResult?.status === 'FAILED' || paymentResult?.status === 'CANCELLED'

  if (alreadyPaid) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Invoice already paid"
          description="This invoice has already been confirmed."
        />
        <div>
          <Link
            to={appPaths.customerOrders}
            className="inline-flex items-center justify-center rounded-pill bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            Back to orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      <SectionCard
        title="Pay your invoice"
        description="Complete payment once your laundry has been weighed and your final invoice is ready."
        action={(
          <Link
            to={appPaths.customerOrders}
            className="rounded-full border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
          >
            Back to orders
          </Link>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-ink">Order:</span> #{invoice.orderId}</p>
            <p><span className="font-semibold text-ink">Service:</span> {invoice.serviceLabel}</p>
          </div>
          <div className="rounded-3xl bg-load-50 px-6 py-5 text-right">
            <p className="text-sm text-load-700">Final total</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{formatCurrency(invoice.finalTotal)}</p>
          </div>
        </div>
      </SectionCard>

      <DriverTipSelector value={tip} onChange={setTip} />

      <PaymentMethodSelector
        selected={paymentMethod}
        onChange={(method) => {
          setPaymentMethod(method)
          setPaymentResult(null)
        }}
        payableTotal={invoice.finalTotal}
        onApplePay={() => {
          void paymentMutation.mutateAsync({ method: 'APPLE_PAY' })
        }}
        isProcessing={paymentMutation.isPending}
      />

      {paymentMethod === 'CARD' ? (
        <CardPaymentForm
          onSubmit={(cardDetails) => {
            void paymentMutation.mutateAsync({ method: 'CARD', cardDetails })
          }}
          isProcessing={paymentMutation.isPending}
          onCancel={() => {
            setPaymentMethod('APPLE_PAY')
            setPaymentResult(null)
          }}
        />
      ) : null}

      {showRetry ? (
        <Card className="space-y-4 border-status-error/40">
          <div>
            <h3 className="text-title text-status-error">
              {paymentResult?.status === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed'}
            </h3>
            <p className="mt-1 text-body text-muted">
              {paymentResult?.failureReason ?? 'Please try again with the same or a different payment method.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPaymentResult(null)
                setToast(null)
              }}
            >
              Retry
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPaymentMethod('APPLE_PAY')
                setPaymentResult(null)
              }}
            >
              Use another method
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
