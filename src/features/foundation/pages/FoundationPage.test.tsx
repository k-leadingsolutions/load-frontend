import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FoundationPage } from '@/features/foundation/pages/FoundationPage'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BrowserRouter>
        <FoundationPage />
      </BrowserRouter>
    </QueryClientProvider>,
  )

describe('FoundationPage', () => {
  it('renders the requested MVP planning sections', () => {
    renderPage()

    expect(screen.getByText('Product route map')).toBeInTheDocument()
    expect(screen.getByText('MVP screen inventory')).toBeInTheDocument()
    expect(screen.getByText('Eight-week implementation backlog')).toBeInTheDocument()
    expect(screen.getByText('Mock API response format')).toBeInTheDocument()
  })
})
