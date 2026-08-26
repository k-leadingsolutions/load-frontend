import type { TipSelection } from '@/domain/models'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/utils/format'

interface DriverTipSelectorProps {
  value: TipSelection
  onChange: (tip: TipSelection) => void
}

const tipOptions = [
  { label: 'No Tip', amount: 0, type: 'NONE' as const },
  { label: 'R10', amount: 10, type: 'PRESET' as const },
  { label: 'R20', amount: 20, type: 'PRESET' as const },
  { label: 'R30', amount: 30, type: 'PRESET' as const },
]

export const DriverTipSelector = ({ value, onChange }: DriverTipSelectorProps) => {
  const customSelected = value.type === 'CUSTOM'

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-title text-ink">Tip Your Driver</h3>
        <p className="mt-1 text-body text-muted">100% of your tip goes to your driver.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {tipOptions.map((option) => {
          const isActive = value.type === option.type && value.amount === option.amount

          return (
            <Button
              key={option.label}
              type="button"
              variant={isActive ? 'primary' : 'outline'}
              className="justify-center"
              onClick={() => onChange({ type: option.type, amount: option.amount })}
            >
              {option.label}
            </Button>
          )
        })}

        <Button
          type="button"
          variant={customSelected ? 'primary' : 'outline'}
          className="justify-center"
          onClick={() => onChange({ type: 'CUSTOM', amount: value.type === 'CUSTOM' ? value.amount : 0 })}
        >
          Custom
        </Button>
      </div>

      {customSelected ? (
        <div className="max-w-xs">
          <Input
            label="Custom tip amount"
            type="number"
            min={0}
            max={2000}
            step={1}
            value={value.amount}
            onChange={(event) => {
              const nextAmount = Math.max(0, Math.min(2000, Number(event.target.value) || 0))
              onChange({ type: 'CUSTOM', amount: nextAmount })
            }}
            hint={`Tip total: ${formatCurrency(value.amount)}`}
          />
        </div>
      ) : null}
    </Card>
  )
}
