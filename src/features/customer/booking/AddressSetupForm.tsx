import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthInput } from '@/features/auth/components/AuthInput'

const addressSchema = z.object({
  label: z.string().min(2, 'Address label is required.'),
  line1: z.string().min(5, 'Street address is required.'),
  suburb: z.string().min(2, 'Suburb is required.'),
  city: z.string().min(2, 'City is required.'),
  province: z.string().min(2, 'Province is required.'),
  postalCode: z.string().min(4, 'Postal code is required.'),
  deliveryInstructions: z.string().optional(),
})

type AddressFormValues = z.infer<typeof addressSchema>

interface AddressSetupFormProps {
  onSave: (values: AddressFormValues) => void
}

export const AddressSetupForm = ({ onSave }: AddressSetupFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
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

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((values) => {
        onSave(values)
        reset(values)
      })}
    >
      <AuthInput id="address-label" label="Address label" error={errors.label?.message} {...register('label')} />
      <AuthInput id="address-line1" label="Street address" error={errors.line1?.message} {...register('line1')} />
      <AuthInput id="address-suburb" label="Suburb" error={errors.suburb?.message} {...register('suburb')} />
      <AuthInput id="address-city" label="City" error={errors.city?.message} {...register('city')} />
      <AuthInput id="address-province" label="Province" error={errors.province?.message} {...register('province')} />
      <AuthInput id="address-postal" label="Postal code" error={errors.postalCode?.message} {...register('postalCode')} />
      <div className="sm:col-span-2">
        <AuthInput
          id="address-instructions"
          label="Delivery instructions"
          error={errors.deliveryInstructions?.message}
          hint="Optional notes for the driver or access control."
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
