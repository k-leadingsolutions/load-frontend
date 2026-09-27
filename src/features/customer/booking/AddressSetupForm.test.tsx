import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddressSetupForm, SOUTH_AFRICAN_PROVINCES } from '@/features/customer/booking/AddressSetupForm'

describe('AddressSetupForm — province', () => {
  it('offers all 9 South African provinces as select options, defaulting to the profile address province', () => {
    render(<AddressSetupForm onSave={vi.fn()} />)

    const provinceSelect = screen.getByLabelText('Province') as HTMLSelectElement
    const optionLabels = within(provinceSelect)
      .getAllByRole('option')
      .map((option) => option.textContent)

    expect(optionLabels).toEqual([...SOUTH_AFRICAN_PROVINCES])
    expect(SOUTH_AFRICAN_PROVINCES).toHaveLength(9)
    expect(provinceSelect.value).toBe('Western Cape')
  })

  it('allows selecting a different province', async () => {
    const user = userEvent.setup()
    render(<AddressSetupForm onSave={vi.fn()} />)

    const provinceSelect = screen.getByLabelText('Province') as HTMLSelectElement
    await user.selectOptions(provinceSelect, 'Gauteng')

    expect(provinceSelect.value).toBe('Gauteng')
  })
})

describe('AddressSetupForm — postal code validation', () => {
  it('rejects a postal code that is not exactly 4 digits', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    const postalInput = screen.getByLabelText('Postal code')
    await user.clear(postalInput)
    await user.type(postalInput, '123')
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(await screen.findByText('Enter a valid 4-digit South African postal code.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('accepts a valid 4-digit postal code', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    const postalInput = screen.getByLabelText('Postal code')
    await user.clear(postalInput)
    await user.type(postalInput, '8001')
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ postalCode: '8001' }))
  })
})

describe('AddressSetupForm — required fields', () => {
  it('shows inline validation errors for required fields left empty, without calling onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    await user.clear(screen.getByLabelText('Street address'))
    await user.clear(screen.getByLabelText('Suburb'))
    await user.clear(screen.getByLabelText('City / Town'))
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(await screen.findByText('Street address is required.')).toBeInTheDocument()
    expect(screen.getByText('Suburb is required.')).toBeInTheDocument()
    expect(screen.getByText('City / Town is required.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('trims leading/trailing whitespace from text inputs before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    const suburbInput = screen.getByLabelText('Suburb')
    await user.clear(suburbInput)
    await user.type(suburbInput, '  Newlands  ')
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ suburb: 'Newlands' }))
  })
})

describe('AddressSetupForm — address label presets and custom label', () => {
  it('defaults to the "Home" preset and lets the Customer pick "Work" or "Other"', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Work' }))
    expect(screen.getByRole('button', { name: 'Work' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Save address' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ label: 'Work' }))
  })

  it('allows a custom label via the "Custom" option', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Custom' }))
    const customLabelInput = await screen.findByLabelText('Custom label')
    await user.type(customLabelInput, "Mom's House")
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ label: "Mom's House" }))
  })

  it('shows a validation error when the custom label is left blank', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Custom' }))
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(await screen.findByText('Address label is required.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('AddressSetupForm — existing API submission contract', () => {
  it('submits the exact Address DTO shape expected by saveAddress on a fully valid form', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AddressSetupForm onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      label: 'Home',
      line1: '15 Kildare Road',
      suburb: 'Newlands',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '7700',
      deliveryInstructions: '',
    })
  })
})
