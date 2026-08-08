interface QuantitySelectorProps {
  description: string
  label: string
  priceLabel: string
  quantity: number
  suggestionTag?: string | undefined
  onChange: (quantity: number) => void
}

export const QuantitySelector = ({
  description,
  label,
  onChange,
  priceLabel,
  quantity,
  suggestionTag,
}: QuantitySelectorProps) => (
  <article className="rounded-3xl border border-load-100 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{label}</p>
          {suggestionTag ? (
            <span className="rounded-full bg-load-50 px-2 py-1 text-xs font-semibold text-load-700">{suggestionTag}</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <p className="text-sm font-semibold text-load-700">{priceLabel}</p>
    </div>

    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, quantity - 1))}
        className="h-10 w-10 rounded-full border border-load-200 text-lg font-semibold text-load-700 transition hover:bg-load-50"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-semibold text-ink">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        className="h-10 w-10 rounded-full bg-load-600 text-lg font-semibold text-white transition hover:bg-load-700"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  </article>
)
