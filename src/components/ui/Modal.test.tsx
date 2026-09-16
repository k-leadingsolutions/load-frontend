import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'

const TestHarness = () => {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add address">
        <button type="button">First field</button>
        <button type="button">Second field</button>
      </Modal>
    </div>
  )
}

describe('Modal accessibility', () => {
  it('moves focus into the panel when opened and restores it to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<TestHarness />)

    const trigger = screen.getByRole('button', { name: 'Open modal' })
    trigger.focus()
    await user.click(trigger)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(document.activeElement).not.toBe(trigger)
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('traps Tab focus within the modal panel', async () => {
    const user = userEvent.setup()
    render(<TestHarness />)

    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    await screen.findByRole('dialog')

    const closeButton = screen.getByRole('button', { name: 'Close' })
    const firstField = screen.getByRole('button', { name: 'First field' })
    const secondField = screen.getByRole('button', { name: 'Second field' })

    expect(document.activeElement).toBe(closeButton)

    await user.tab()
    expect(document.activeElement).toBe(firstField)
    await user.tab()
    expect(document.activeElement).toBe(secondField)
    // Tabbing past the last focusable element wraps back to the first.
    await user.tab()
    expect(document.activeElement).toBe(closeButton)
  })
})
