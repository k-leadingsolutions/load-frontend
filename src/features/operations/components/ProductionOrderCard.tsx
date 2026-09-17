import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProductionOrder } from '@/domain/models'
import { buildPath } from '@/app/router/paths'

interface ProductionOrderCardProps {
  isMutating: boolean
  onAddNote: (note: string) => void
  onAdvanceStage: () => void
  onConfirmReceived: () => void
  onQuantityReview: (status: 'CONFIRMED' | 'ADJUSTED') => void
  onRecordIntake: (input: { weightKg?: number; notes?: string }) => void
  onQcDecision: (passed: boolean, notes?: string) => void
  order: ProductionOrder
}

export const ProductionOrderCard = ({
  isMutating,
  onAddNote,
  onAdvanceStage,
  onConfirmReceived,
  onQcDecision,
  onQuantityReview,
  onRecordIntake,
  order,
}: ProductionOrderCardProps) => {
  const [note, setNote] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [intakeNotes, setIntakeNotes] = useState('')

  return (
    <article className="rounded-3xl border border-load-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-load-700">#{order.id}</p>
          <h2 className="mt-2 text-lg font-semibold text-ink">{order.customerName}</h2>
          <p className="mt-1 text-sm text-slate-500">{order.suburb}</p>
          <Link to={buildPath.operationsOrderDetail(order.id)} className="mt-1 inline-block text-sm font-semibold text-load-600 underline">
            View details
          </Link>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {order.fulfilmentType ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {order.fulfilmentType === 'STORE_COLLECTION' ? 'Store collection' : 'Delivery'}
            </span>
          ) : null}
          <span className="rounded-full bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">
            {order.stageLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>Received: {order.receivedAtStore ? 'Confirmed' : 'Pending'}</p>
        <p>Quantity review: {order.quantityReviewStatus}</p>
        <p>QC status: {order.qualityCheckPending ? 'Awaiting review' : 'On track'}</p>
        {order.weightKg !== undefined ? <p>Recorded weight: {order.weightKg} kg</p> : null}
        {order.assignedDriverName ? <p>Assigned driver: {order.assignedDriverName}</p> : null}
      </div>

      <div className="mt-4 rounded-3xl bg-load-50/60 p-4 text-sm text-slate-600">
        <p className="font-semibold text-ink">Order contents</p>
        <ul className="mt-2 space-y-1">
          {order.itemsSummary.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onConfirmReceived}
          disabled={isMutating || order.receivedAtStore}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm received
        </button>
        <button
          type="button"
          onClick={onAdvanceStage}
          disabled={isMutating || !order.receivedAtStore}
          className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Advance stage
        </button>
        <button
          type="button"
          onClick={() => onQuantityReview('CONFIRMED')}
          disabled={isMutating}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm quantities
        </button>
        <button
          type="button"
          onClick={() => onQuantityReview('ADJUSTED')}
          disabled={isMutating}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Flag quantity discrepancy
        </button>
        <button
          type="button"
          onClick={() => onQcDecision(true)}
          disabled={isMutating}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          QC pass
        </button>
        <button
          type="button"
          onClick={() => onQcDecision(false, 'Returned to production')}
          disabled={isMutating}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          QC fail
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-ink">Store intake (operational record only — never used to price the order)</p>
        <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
          <input
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            placeholder="Weight (kg)"
            inputMode="decimal"
            aria-label="Actual weight in kilograms"
            disabled={!order.receivedAtStore}
            className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <input
            value={intakeNotes}
            onChange={(event) => setIntakeNotes(event.target.value)}
            placeholder="Inspection / intake notes"
            aria-label="Intake notes"
            disabled={!order.receivedAtStore}
            className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => {
              const parsedWeight = weightKg.trim() ? Number.parseFloat(weightKg) : undefined
              if (weightKg.trim() && (parsedWeight === undefined || Number.isNaN(parsedWeight))) return
              if (!weightKg.trim() && !intakeNotes.trim()) return
              onRecordIntake({
                ...(parsedWeight !== undefined ? { weightKg: parsedWeight } : {}),
                ...(intakeNotes.trim() ? { notes: intakeNotes.trim() } : {}),
              })
              setWeightKg('')
              setIntakeNotes('')
            }}
            disabled={isMutating || !order.receivedAtStore || (!weightKg.trim() && !intakeNotes.trim())}
            className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save intake
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="block text-sm font-semibold text-ink" htmlFor={`note-${order.id}`}>
          Internal note
        </label>
        <textarea
          id={`note-${order.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
        />
        <button
          type="button"
          onClick={() => {
            if (!note.trim()) {
              return
            }

            onAddNote(note.trim())
            setNote('')
          }}
          disabled={isMutating || !note.trim()}
          className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save note
        </button>
      </div>

      {order.internalNotes.length > 0 ? (
        <div className="mt-4 rounded-3xl border border-load-100 p-4 text-sm text-slate-600">
          <p className="font-semibold text-ink">Latest notes</p>
          <ul className="mt-2 space-y-1">
            {order.internalNotes.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}
