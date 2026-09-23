import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { DriverAuthProvider } from '@/app/providers/DriverAuthProvider'
import { OperationsAuthProvider } from '@/app/providers/OperationsAuthProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export const AppProviders = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DriverAuthProvider>
        <OperationsAuthProvider>{children}</OperationsAuthProvider>
      </DriverAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
)
