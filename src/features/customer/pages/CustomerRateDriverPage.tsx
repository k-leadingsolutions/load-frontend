import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { appPaths, buildPath } from '@/app/router/paths'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import type { DriverRating, TipSelection } from '@/domain/models'
import { DriverTipSelector } from '@/features/customer/checkout/DriverTipSelector'
import { mockCustomerOrderService } from '@/services/mock'
import { getStoredDriverRating, saveStoredDriverRating } from '@/services/mock/driverRatings'

const ratingSchema = z.object({
  rating: z.number().int().min(1, 'Choose a star rating.').max(5, 'Choose a star rating.'),
  comment: z.string().trim().max(200, 'Keep comments under 200 characters.').optional(),
})

type RatingFormValues = z.infer<typeof ratingSchema>

const rateableStatuses = ['DELIVERED', 'COMPLETED']

export const CustomerRateDriverPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const [tip, setTip] = useState<TipSelection>({ type: 'NONE', amount: 0 })
  const [submitted, setSubmitted] = useState(false)
  const existingRating = orderId ? getStoredDriverRating(orderId) : undefined
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: existingRating?.rating ?? 0,
      comment: existingRating?.comment ?? '',
    },
  })
  const orderQuery = useQuery({
    queryKey: ['customer-order', orderId],
    queryFn: async () => {
      if (!orderId) {
        return null
      }

      const response = await mockCustomerOrderService.getOrder(orderId)
      if (response.status === 'error' || !response.data) {
        return null
      }

      return response.data
    },
    enabled: Boolean(orderId),
  })

  if (!orderId) {
    return <ErrorState title="Order unavailable" message="An order reference is required to rate your driver." />
  }

  if (orderQuery.isLoading) {
    return <LoadingState />
  }

  if (orderQuery.isError) {
    return (
      <ErrorState
        title="Unable to load order"
        message={orderQuery.error instanceof Error ? orderQuery.error.message : 'Unknown error'}
      />
    )
  }

  const order = orderQuery.data

  if (!order) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Order not found"
          description="We could not find the order you want to review."
        />
        <div>
          <Link
            to={appPaths.customerOrders}
            className="inline-flex items-center justify-center rounded-pill bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            View orders
          </Link>
        </div>
      </div>
    )
  }

  if (!rateableStatuses.includes(order.status)) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Rating unavailable"
          description="Driver ratings open once your order has been delivered."
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

  if (submitted || existingRating) {
    return (
      <SectionCard title="Thank you for your feedback!" description={`Your rating for order #${order.id} has been recorded.`}>
        <Link
          to={appPaths.customerOrders}
          className="inline-flex items-center justify-center rounded-pill bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
        >
          View orders
        </Link>
      </SectionCard>
    )
  }

  const rating = watch('rating')

  return (
    <div className="space-y-6">
      <SectionCard title="Rate your driver" description={`Share feedback for order #${order.id}.`}>
        <form
          className="space-y-6"
          onSubmit={handleSubmit((values) => {
            const nextRating: DriverRating = {
              orderId: order.id,
              rating: values.rating as DriverRating['rating'],
              tipAmount: tip.amount,
              submittedAt: new Date().toISOString(),
              ...(values.comment ? { comment: values.comment } : {}),
            }
            saveStoredDriverRating(nextRating)
            setSubmitted(true)
          })}
        >
          <div className="space-y-3">
            <div>
              <h3 className="text-title text-ink">Star rating</h3>
              <p className="mt-1 text-sm text-slate-600">Let us know how your delivery experience went.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Rate ${value} stars`}
                  onClick={() => setValue('rating', value, { shouldDirty: true, shouldValidate: true })}
                  className={`rounded-full px-3 py-2 text-2xl transition ${
                    value <= rating ? 'bg-load-50 text-load-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            {errors.rating?.message ? <p className="text-caption text-status-error">{errors.rating.message}</p> : null}
          </div>

          <Card variant="flat" className="space-y-3">
            <label htmlFor="driver-rating-comment" className="text-sm font-semibold text-ink">
              Comment
            </label>
            <textarea
              id="driver-rating-comment"
              {...register('comment')}
              rows={4}
              maxLength={200}
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
              placeholder="Optional feedback for your driver"
            />
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>Optional</span>
              <span>{watch('comment')?.length ?? 0}/200</span>
            </div>
            {errors.comment?.message ? <p className="text-caption text-status-error">{errors.comment.message}</p> : null}
          </Card>

          <DriverTipSelector value={tip} onChange={setTip} />

          <Button type="submit" loading={isSubmitting}>
            Submit rating
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Need something else?" description="You can still open your invoice or return to your orders anytime.">
        <div className="flex flex-wrap gap-3">
          {order.invoiceId ? (
            <Link
              to={buildPath.customerInvoice(order.invoiceId)}
              className="inline-flex items-center justify-center rounded-pill border-2 border-load-600 bg-white px-5 py-3 text-sm font-semibold text-load-600 transition hover:bg-load-50"
            >
              Open invoice
            </Link>
          ) : null}
          <Link
            to={appPaths.customerOrders}
            className="inline-flex items-center justify-center rounded-pill border-2 border-load-600 bg-white px-5 py-3 text-sm font-semibold text-load-600 transition hover:bg-load-50"
          >
            Back to orders
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}
