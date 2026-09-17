import { useState } from 'react'
import type { RescheduleReason, StopStatus, VerificationMethod } from '@/domain/models'
import { RESCHEDULE_REASON_LABELS } from '@/domain/models'
import type { DriverAssignment } from '@/domain/models'
import { DriverMessagePanel } from '@/features/driver/components/DriverMessagePanel'

interface DriverAssignmentCardProps {
  assignment: DriverAssignment
  isMutating: boolean
  onEnRoute: () => void
  onArrival: () => void
  onCollection: () => void
  onDelivery: (proof: string) => void
  onFailure: (reason: RescheduleReason, note?: string) => void
  onVerify: (method: VerificationMethod, code: string) => void
  onReschedule: (reason: RescheduleReason, note?: string) => void
}

const getDirectionsUrl = (addressLine: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`

const STATUS_LABELS: Record<StopStatus, string> = {
  ASSIGNED: 'Assigned',
  EN_ROUTE: 'En route',
  ARRIVED: 'Arrived',
  VERIFIED: 'Verified',
  COLLECTED: 'Collected',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  RESCHEDULE_REQUESTED: 'Reschedule requested',
}

export const DriverAssignmentCard = ({
  assignment,
  isMutating,
  onArrival,
  onCollection,
  onDelivery,
  onEnRoute,
  onFailure,
  onReschedule,
  onVerify,
}: DriverAssignmentCardProps) => {
  const [proof, setProof] = useState('')
  const [failureNote, setFailureNote] = useState('')
  const [failureReason, setFailureReason] = useState<RescheduleReason>('CUSTOMER_UNAVAILABLE')
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(assignment.verificationMethod ?? 'OTP')
  const [verificationCode, setVerificationCode] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState<RescheduleReason>('CUSTOMER_UNAVAILABLE')

  const isVerified = assignment.verificationStatus === 'VERIFIED'
  const isTerminal = ['COLLECTED', 'DELIVERED', 'COMPLETED'].includes(assignment.stopStatus)

  return (
    <article className="rounded-3xl border border-load-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            Stop #{assignment.stopIndex} · {assignment.stopType} #{assignment.orderId}
          </p>
          <p className="mt-1 text-sm text-slate-500">{assignment.customerName} · {assignment.addressLine}</p>
        </div>
        <span className="rounded-full bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">
          {STATUS_LABELS[assignment.stopStatus]}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>Scheduled window: {assignment.scheduledWindow}</p>
        <p>Route area: {assignment.area}</p>
        <p>Instructions: {assignment.customerInstructions ?? 'No special instructions provided.'}</p>
        <p>Verification: {assignment.verificationMethod ?? 'OTP'} · {assignment.verificationStatus ?? 'AWAITING'}</p>
        <a
          href={getDirectionsUrl(assignment.addressLine)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-load-700 underline"
        >
          Get directions
        </a>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onEnRoute}
          disabled={isMutating || !['ASSIGNED', 'RESCHEDULE_REQUESTED'].includes(assignment.stopStatus)}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Start · En route
        </button>
        <button
          type="button"
          onClick={onArrival}
          disabled={isMutating || assignment.stopStatus !== 'EN_ROUTE'}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm arrival
        </button>
      </div>

      {!isTerminal ? (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-semibold text-ink" htmlFor={`verify-method-${assignment.id}`}>
            Verification method
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id={`verify-method-${assignment.id}`}
              value={verificationMethod}
              onChange={(event) => setVerificationMethod(event.target.value as VerificationMethod)}
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100 sm:w-40"
            >
              <option value="OTP">OTP</option>
              <option value="QR_CODE">QR code</option>
            </select>
            <input
              aria-label={`Verify ${assignment.stopType === 'PICKUP' ? 'collection' : 'delivery'} code`}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              disabled={assignment.stopStatus !== 'ARRIVED'}
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100 disabled:opacity-60"
              placeholder={verificationMethod === 'QR_CODE' ? 'Enter scanned QR code' : 'Enter 6-digit code'}
            />
            <button
              type="button"
              onClick={() => {
                if (!verificationCode.trim()) return
                onVerify(verificationMethod, verificationCode.trim())
                setVerificationCode('')
              }}
              disabled={isMutating || !verificationCode.trim() || assignment.stopStatus !== 'ARRIVED'}
              className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Verify
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {assignment.stopType === 'PICKUP' ? (
          <button
            type="button"
            onClick={onCollection}
            disabled={isMutating || !isVerified || assignment.stopStatus === 'COLLECTED'}
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
            disabled={isMutating || !isVerified || !proof.trim() || assignment.stopStatus === 'DELIVERED'}
            className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm delivery
          </button>
        )}
      </div>

      {assignment.stopType === 'DELIVERY' && !isTerminal ? (
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
        </div>
      ) : null}
      {assignment.proofOfDelivery ? (
        <p className="mt-2 text-sm text-emerald-700">Recorded proof: {assignment.proofOfDelivery}</p>
      ) : null}

      {!isTerminal ? (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-semibold text-ink" htmlFor={`failure-reason-${assignment.id}`}>
            Failed stop
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select
              id={`failure-reason-${assignment.id}`}
              value={failureReason}
              onChange={(event) => setFailureReason(event.target.value as RescheduleReason)}
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
            >
              {Object.entries(RESCHEDULE_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              value={failureNote}
              onChange={(event) => setFailureNote(event.target.value)}
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
              placeholder="Optional note"
            />
            <button
              type="button"
              onClick={() => {
                onFailure(failureReason, failureNote.trim() || undefined)
                setFailureNote('')
              }}
              disabled={isMutating}
              className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Record failure
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <select
              value={rescheduleReason}
              onChange={(event) => setRescheduleReason(event.target.value as RescheduleReason)}
              className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
            >
              {Object.entries(RESCHEDULE_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onReschedule(rescheduleReason, failureNote.trim() || undefined)}
              disabled={isMutating}
              className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Request reschedule
            </button>
          </div>
          <p className="text-xs text-muted">Reschedule requests are reviewed and actioned by Operations.</p>
        </div>
      ) : null}

      {assignment.stopStatus === 'RESCHEDULE_REQUESTED' ? (
        <p className="mt-2 text-sm text-amber-700">
          Reschedule requested ({RESCHEDULE_REASON_LABELS[assignment.rescheduleReason ?? 'OTHER']}) — pending Operations approval.
        </p>
      ) : null}
      {assignment.stopStatus === 'FAILED' && assignment.failureReason ? (
        <p className="mt-2 text-sm text-rose-700">
          Failure reason: {RESCHEDULE_REASON_LABELS[assignment.failureReason]}
          {assignment.failureNote ? ` — ${assignment.failureNote}` : ''}
        </p>
      ) : null}

      <DriverMessagePanel stopId={assignment.id} orderId={assignment.orderId} />
    </article>
  )
}
