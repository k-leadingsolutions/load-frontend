import { useContext } from 'react'
import { DriverAuthContext } from '@/app/providers/DriverAuthContext'

export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext)

  if (!context) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider.')
  }

  return context
}
