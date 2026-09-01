import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import type { CardPaymentDetails } from '@/domain/models'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

const currentYear = new Date().getFullYear() % 100
const currentMonth = new Date().getMonth() + 1

const cardPaymentSchema = z
  .object({
    cardholderName: z.string().trim().min(2, 'Cardholder name is required.'),
    cardNumber: z
      .string()
      .trim()
      .min(1, 'Card number is required.')
      .refine((value) => {
        const digits = value.replace(/\D/g, '')
        return digits.length >= 13 && digits.length <= 19
      }, 'Enter a valid card number.'),
    expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Use a valid month.'),
    expiryYear: z.string().regex(/^\d{2}$/, 'Use a valid year.'),
    cvv: z.string().regex(/^\d{3,4}$/, 'Enter a valid CVV.'),
    saveCard: z.boolean(),
  })
  .superRefine((values, context) => {
    const year = Number(values.expiryYear)
    const month = Number(values.expiryMonth)

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      context.addIssue({
        code: 'custom',
        message: 'Card expiry cannot be in the past.',
        path: ['expiryYear'],
      })
    }
  })

type CardPaymentFormValues = z.infer<typeof cardPaymentSchema>

interface CardPaymentFormProps {
  onSubmit: (details: CardPaymentDetails) => void
  isProcessing: boolean
  onCancel: () => void
}

const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 19)
    .match(/.{1,4}/g)
    ?.join(' ') ?? ''

const formatExpiryPart = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)
const withError = (message?: string) => (message ? { error: message } : {})

export const CardPaymentForm = ({ onSubmit, isProcessing, onCancel }: CardPaymentFormProps) => {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CardPaymentFormValues>({
    resolver: zodResolver(cardPaymentSchema),
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      saveCard: false,
    },
  })

  return (
    <Card variant="flat" className="space-y-4">
      {/* Production payment provider integration pending backend implementation. */}
      <form
        className="space-y-4"
        onSubmit={handleSubmit((formValues) => {
          onSubmit(formValues)
        })}
      >
        <Controller
          name="cardholderName"
          control={control}
          render={({ field }) => (
            <Input
              label="Cardholder name"
              autoComplete="cc-name"
              {...field}
              {...withError(errors.cardholderName?.message)}
            />
          )}
        />

        <Controller
          name="cardNumber"
          control={control}
          render={({ field }) => (
            <Input
              label="Card number"
              autoComplete="cc-number"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              {...field}
              {...withError(errors.cardNumber?.message)}
              onChange={(event) => {
                const formattedValue = formatCardNumber(event.target.value)
                field.onChange(formattedValue)
                setValue('cardNumber', formattedValue, { shouldDirty: true, shouldValidate: true })
              }}
            />
          )}
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <Controller
            name="expiryMonth"
            control={control}
            render={({ field }) => (
              <Input
                label="Expiry month"
                autoComplete="cc-exp-month"
                inputMode="numeric"
                placeholder="MM"
                {...field}
                {...withError(errors.expiryMonth?.message)}
                onChange={(event) => {
                  const formattedValue = formatExpiryPart(event.target.value, 2)
                  field.onChange(formattedValue)
                  setValue('expiryMonth', formattedValue, { shouldDirty: true, shouldValidate: true })
                }}
              />
            )}
          />
          <span className="hidden pb-3 text-lg font-semibold text-muted sm:block">/</span>
          <Controller
            name="expiryYear"
            control={control}
            render={({ field }) => (
              <Input
                label="Expiry year"
                autoComplete="cc-exp-year"
                inputMode="numeric"
                placeholder="YY"
                {...field}
                {...withError(errors.expiryYear?.message)}
                onChange={(event) => {
                  const formattedValue = formatExpiryPart(event.target.value, 2)
                  field.onChange(formattedValue)
                  setValue('expiryYear', formattedValue, { shouldDirty: true, shouldValidate: true })
                }}
              />
            )}
          />
        </div>

        <Controller
          name="cvv"
          control={control}
          render={({ field }) => (
            <Input
              label="CVV"
              type="password"
              autoComplete="cc-csc"
              inputMode="numeric"
              placeholder="123"
              {...field}
              {...withError(errors.cvv?.message)}
            />
          )}
        />

        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" {...register('saveCard')} />
          <span>Save card for faster checkout next time</span>
        </label>

        <div className="rounded-card border border-load-100 bg-white px-4 py-3 text-sm text-muted">
          Secure payment — your details are processed by our payment provider.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" loading={isProcessing}>
            Pay by card
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
        </div>

        {isProcessing ? <p className="text-sm text-load-700">Processing payment…</p> : null}
      </form>
    </Card>
  )
}
