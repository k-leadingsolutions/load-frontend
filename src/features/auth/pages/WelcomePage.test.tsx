import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { WelcomePage } from '@/features/auth/pages/WelcomePage'

describe('WelcomePage branding', () => {
  it('shows the current customer-facing tagline, not the retired one', () => {
    render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('LAUNDRY • COFFEE • DONE BEAUTIFULLY')).toBeInTheDocument()
    expect(screen.queryByText('Life, well loaded.')).not.toBeInTheDocument()
  })
})
