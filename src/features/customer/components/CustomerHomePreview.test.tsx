import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerHomePreview } from '@/features/customer/components/CustomerHomePreview'

const renderWithClient = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CustomerHomePreview />
    </QueryClientProvider>,
  )

describe('CustomerHomePreview branding', () => {
  it('shows the current customer-facing tagline, not the retired one', async () => {
    renderWithClient()

    expect(await screen.findByText('LAUNDRY • COFFEE • DONE BEAUTIFULLY')).toBeInTheDocument()
    expect(screen.queryByText('Life, well loaded.')).not.toBeInTheDocument()
  })
})
