import { useState } from 'react'
import type { DriverAssignment, RescheduleReason } from '@/domain/models'

interface DriverAssignmentCardProps {
  assignment: DriverAssignment
  capturedWeightKg?: number | undefined
  isMutating: boolean
  onArrival: () => void
  onCaptureWeight?: (weightKg: number) => void
  onCollection: () => void
  onDelivery: (proof: string) => void
  onFailure: (reason: string) => void
  onVerify: (code: string) => void
  onReschedule: (reason: RescheduleReason, note?: string) => void
}

export const DriverAssignmentCard = ({
  assignment,
  capturedWeightKg,
  isMutating,
  onArrival,
  onCaptureWeight,
  onCollection,
  onDelivery,
  onFailure,
  onReschedule,
  onVerify,
}: DriverAssignmentCardProps) => {
  const [proof, setProof] = useState('')
  const [failureReason, setFailureReason] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState<RescheduleReason>('CUSTOMER_UNAVAILABLE')

  return (
    <article className="rounded-3xl border border-load-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {assignment.stopType} #{assignment.orderId}
          </p>
          <p className="mt-1 text-sm text-slate-500">{assignment.customerName} · {assignment.addressLine}</p>
        </div>
        <span className="rounded-full bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">
          {assignment.stopStatus}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>Scheduled window: {assignment.scheduledWindow}</p>
        <p>Route area: {assignment.area}</p>
        <p>Instructions: {assignment.customerInstructions ?? 'No special instructions provided.'}</p>
        <p>Verification: {assignment.verificationMethod ?? 'OTP'} · {assignment.verificationStatus ?? 'AWAITING'}</p>
        <p>Payment: {assignment.paymentStatus ?? 'NOT_REQUIRED'}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onArrival}
          disabled={isMutating || assignment.stopStatus !== 'ASSIGNED'}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm arrival
        </button>
        {assignment.stopType === 'PICKUP' ? (
          <button
            type="button"
            onClick={onCollection}
            disabled={isMutating || !['ARRIVED', 'ASSIGNED'].includes(assignment.stopStatus)}
            className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm collection
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!proof.trim()) {
                return
              }

              onDelivery(proof.trim())
              setProof('')
            }}
            disabled={isMutating || !proof.trim()}
            className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm delivery
          </button>
        )}
      </div>

      {assignment.stopType === 'DELIVERY' ? (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-semibold text-ink" htmlFor={`proof-${assignment.id}`}>
            Proof of delivery
          </label>
          <input
            id={`proof-${assignment.id}`}
            value={proof}
            onChange={(event) => setProof(event.target.value)}
            className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
            placeholder="e.g. Signed by security desk"
          />
          {assignment.proofOfDelivery ? (
            <p className="text-sm text-emerald-700">Recorded proof: {assignment.proofOfDelivery}</p>
          ) : null}
        </div>
      ) : null}

      {assignment.stopType === 'PICKUP' ? (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-semibold text-ink" htmlFor={`verify-${assignment.id}`}>
            Verify collection (OTP / QR mock code)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`verify-${assignment.id}`}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
              placeholder="Enter 6-digit code"
            />
            <button
              type="button"
              onClick={() => {
                if (!verificationCode.trim()) return
                onVerify(verificationCode.trim())
                setVerificationCode('')
              }}
              disabled={isMutating || !verificationCode.trim()}
              className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Verify
            </button>
          </div>

          <label className="block text-sm font-semibold text-ink" htmlFor={`weight-${assignment.id}`}>
            Capture weight (kg)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`weight-${assignment.id}`}
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              inputMode="decimal"
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
              placeholder="e.g. 9.4"
            />
            <button
              type="button"
              onClick={() => {
                const nextWeight = Number.parseFloat(weightKg)
                if (!onCaptureWeight || Number.isNaN(nextWeight) || nextWeight <= 0) {
                  return
                }

                onCaptureWeight(nextWeight)
                setWeightKg('')
              }}
              disabled={isMutating || !weightKg.trim()}
              className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Capture weight
            </button>
          </div>
          {capturedWeightKg ? (
            <p className="text-sm text-emerald-700">Captured weight: {capturedWeightKg.toFixed(1)} kg</p>
          ) : null}
          {assignment.paymentStatus === 'AWAITING_PAYMENT' ? (
            <p className="text-sm text-amber-700">Awaiting Payment — customer must confirm before collection is finalised.</p>
          ) : null}
          {assignment.paymentStatus === 'PAYMENT_CONFIRMED' ? (
            <p className="text-sm text-emerald-700">Payment confirmed — ready to confirm collection.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <label className="block text-sm font-semibold text-ink" htmlFor={`failure-${assignment.id}`}>
          Failed stop reason
        </label>
        <input
          id={`failure-${assignment.id}`}
          value={failureReason}
          onChange={(event) => setFailureReason(event.target.value)}
          className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
          placeholder="Explain missed collection or delivery"
        />
        <button
          type="button"
          onClick={() => {
            if (!failureReason.trim()) {
              return
            }

            onFailure(failureReason.trim())
            setFailureReason('')
          }}
          disabled={isMutating || !failureReason.trim()}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Record failure
        </button>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            value={rescheduleReason}
            onChange={(event) => setRescheduleReason(event.target.value as RescheduleReason)}
            className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
          >
            <option value="CUSTOMER_UNAVAILABLE">Customer unavailable</option>
            <option value="CUSTOMER_REQUESTED_NEW_TIME">Customer requested new time</option>
            <option value="INCORRECT_ADDRESS">Incorrect address</option>
            <option value="ACCESS_ISSUE">Access issue</option>
            <option value="PAYMENT_UNRESOLVED">Payment unresolved</option>
            <option value="OPERATIONAL_DELAY">Operational delay</option>
            <option value="OTHER">Other</option>
          </select>
          <button
            type="button"
            onClick={() => onReschedule(rescheduleReason, failureReason.trim() || undefined)}
            disabled={isMutating}
            className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Request reschedule
          </button>
        </div>
        {assignment.failureReason ? (
          <p className="text-sm text-rose-700">Failure reason: {assignment.failureReason}</p>
        ) : null}
      </div>
    </article>
  )
}
