import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { appPaths } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import { SectionCard } from '@/components/ui/SectionCard'
import { AddressSetupForm } from '@/features/customer/booking/AddressSetupForm'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { formatCurrency, formatPoints } from '@/utils/format'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters.'),
  mobileNumber: z.string().regex(/^\+27\s\d{2}\s\d{3}\s\d{4}$/, 'Use South African format like +27 82 555 0142.'),
  email: z.email('Enter a valid email address.'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const rewardCards = [
  { title: 'Free express upgrade', description: 'Use rewards to move urgent bookings to the front of the queue.' },
  { title: 'Delivery fee off', description: 'Redeem loyalty rewards against last-mile delivery costs.' },
  { title: 'LOAD Pass teaser', description: 'Future roadmap placeholder for subscription-based premium care.' },
]

export const CustomerProfilePage = () => {
  const { user, saveAddress, updateProfile } = useAuth()
  const [profileSaved, setProfileSaved] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      mobileNumber: user?.mobileNumber ?? '',
      email: user?.email ?? '',
    },
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Profile details" description="Manage the customer account information used across booking and delivery.">
        {profileSaved ? (
          <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Profile updated successfully.
          </div>
        ) : null}
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit((values) => {
            updateProfile(values)
            setProfileSaved(true)
          })}
        >
          <AuthInput id="profile-firstName" label="First name" error={errors.firstName?.message} {...register('firstName')} />
          <AuthInput id="profile-lastName" label="Last name" error={errors.lastName?.message} {...register('lastName')} />
          <AuthInput id="profile-mobile" label="Mobile number" error={errors.mobileNumber?.message} {...register('mobileNumber')} />
          <AuthInput id="profile-email" label="Email address" type="email" error={errors.email?.message} {...register('email')} />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save profile
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Saved addresses" description="Keep pickup and delivery addresses ready for repeat bookings.">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {user.addresses.map((address) => (
              <article key={address.id} className="rounded-3xl border border-load-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{address.label}</p>
                  {address.isDefault ? (
                    <span className="rounded-full bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">Default</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{address.line1}</p>
                <p className="text-sm text-slate-600">
                  {address.suburb}, {address.city}, {address.province}
                </p>
              </article>
            ))}
          </div>
          <AddressSetupForm
            onSave={(values) => {
              saveAddress({
                label: values.label,
                line1: values.line1,
                suburb: values.suburb,
                city: values.city,
                province: values.province,
                postalCode: values.postalCode,
                ...(values.deliveryInstructions ? { deliveryInstructions: values.deliveryInstructions } : {}),
              })
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Loyalty wallet and rewards" description="Track points, previews, and future-facing reward opportunities.">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-gradient-to-br from-load-500 to-load-700 p-6 text-white shadow-glow">
            <p className="text-sm text-white/80">Current tier</p>
            <h3 className="mt-2 text-3xl font-semibold">{user.loyalty.tier}</h3>
            <p className="mt-4 text-sm text-white/80">Points</p>
            <p className="mt-1 text-2xl font-semibold">{formatPoints(user.loyalty.points)}</p>
            <p className="mt-4 text-sm text-white/80">LOAD Balance</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(user.loyalty.loadBalance)}</p>
          </div>
          <div className="grid gap-3">
            {rewardCards.map((reward, index) => (
              <article key={reward.title} className="rounded-3xl border border-load-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{reward.title}</p>
                  {index < user.loyalty.availableRewards ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Available</span>
                  ) : (
                    <span className="rounded-full bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">Preview</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">{reward.description}</p>
              </article>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Support" description="Get help with pricing, payments, and order tracking.">
        <Link
          to={appPaths.customerHelp}
          className="inline-flex items-center justify-center rounded-pill border-2 border-load-600 bg-white px-5 py-3 text-sm font-semibold text-load-600 transition hover:bg-load-50"
        >
          Help &amp; Support
        </Link>
      </SectionCard>
    </div>
  )
}
