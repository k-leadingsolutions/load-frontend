import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthInput } from '@/features/auth/components/AuthInput'

/** All 9 South African provinces, in the order commonly used on SA forms (ISO 3166-2:ZA). */
export const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const

/** Quick-select choices for the address label — a custom label remains editable in the same field. */
const ADDRESS_LABEL_PRESETS = ['Home', 'Work', 'Other'] as const

/** South African postal codes are exactly 4 digits (SAPO standard). */
const SA_POSTAL_CODE_PATTERN = /^\d{4}$/

const addressSchema = z.object({
  label: z.string().trim().min(2, 'Address label is required.'),
  line1: z.string().trim().min(5, 'Street address is required.'),
  suburb: z.string().trim().min(2, 'Suburb is required.'),
  city: z.string().trim().min(2, 'City / Town is required.'),
  province: z.string().trim().min(2, 'Province is required.'),
  postalCode: z
    .string()
    .trim()
    .regex(SA_POSTAL_CODE_PATTERN, 'Enter a valid 4-digit South African postal code.'),
  deliveryInstructions: z.string().trim().optional(),
})

type AddressFormValues = z.infer<typeof addressSchema>

interface AddressSetupFormProps {
  onSave: (values: AddressFormValues) => void | Promise<void>
}

export const AddressSetupForm = ({ onSave }: AddressSetupFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: 'Home',
      line1: '15 Kildare Road',
      suburb: 'Newlands',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '7700',
      deliveryInstructions: '',
    },
  })

  const currentLabel = watch('label')
  const [customLabelMode, setCustomLabelMode] = useState(
    () => !ADDRESS_LABEL_PRESETS.includes(currentLabel as (typeof ADDRESS_LABEL_PRESETS)[number]),
  )

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit(async (values) => {
        await onSave(values)
        reset(values)
      })}
    >
      <div className="sm:col-span-2">
        <span className="text-sm font-semibold text-ink">Address label</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {ADDRESS_LABEL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={!customLabelMode && currentLabel === preset}
              onClick={() => {
                setCustomLabelMode(false)
                setValue('label', preset, { shouldDirty: true, shouldValidate: true })
              }}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                !customLabelMode && currentLabel === preset
                  ? 'border-load-500 bg-load-50 text-load-700'
                  : 'border-load-200 bg-white text-muted hover:border-load-300'
              }`}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={customLabelMode}
            onClick={() => {
              setCustomLabelMode(true)
              setValue('label', '', { shouldDirty: true })
            }}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              customLabelMode
                ? 'border-load-500 bg-load-50 text-load-700'
                : 'border-load-200 bg-white text-muted hover:border-load-300'
            }`}
          >
            Custom
          </button>
        </div>
        {customLabelMode ? (
          <div className="mt-3">
            <AuthInput
              id="address-label"
              label="Custom label"
              placeholder="e.g. Mom's House"
              aria-required="true"
              error={errors.label?.message}
              {...register('label')}
            />
          </div>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <AuthInput
          id="address-line1"
          label="Street address"
          autoComplete="address-line1"
          placeholder="15 Kildare Road"
          aria-required="true"
          error={errors.line1?.message}
          {...register('line1')}
        />
      </div>
      <AuthInput
        id="address-suburb"
        label="Suburb"
        autoComplete="address-line2"
        placeholder="Newlands"
        aria-required="true"
        error={errors.suburb?.message}
        {...register('suburb')}
      />
      <AuthInput
        id="address-city"
        label="City / Town"
        autoComplete="address-level2"
        placeholder="Cape Town"
        aria-required="true"
        error={errors.city?.message}
        {...register('city')}
      />
      <label className="block space-y-2" htmlFor="address-province">
        <span className="text-sm font-semibold text-ink">Province</span>
        <select
          id="address-province"
          aria-required="true"
          aria-invalid={Boolean(errors.province)}
          aria-describedby={errors.province ? 'address-province-error' : undefined}
          className="h-control w-full rounded-2xl border border-load-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-load-500 focus:ring-4 focus:ring-load-100 disabled:border-disabled disabled:bg-slate-100"
          {...register('province')}
        >
          {SOUTH_AFRICAN_PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
        {errors.province ? (
          <p id="address-province-error" className="text-sm text-rose-600">
            {errors.province.message}
          </p>
        ) : null}
      </label>
      <AuthInput
        id="address-postal"
        label="Postal code"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={4}
        placeholder="7700"
        aria-required="true"
        error={errors.postalCode?.message}
        {...register('postalCode')}
      />
      <div className="sm:col-span-2">
        <AuthInput
          id="address-instructions"
          label="Delivery instructions (optional)"
          error={errors.deliveryInstructions?.message}
          hint="e.g. gate code, buzzer number, or where the driver should collect/deliver."
          placeholder="e.g. Gate code #4521, ring buzzer 3B"
          {...register('deliveryInstructions')}
        />
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full border border-load-200 bg-white px-5 py-3 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save address
        </button>
      </div>
    </form>
  )
}

