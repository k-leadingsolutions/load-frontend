import { useContext } from 'react'
import { OperationsAuthContext } from '@/app/providers/OperationsAuthContext'

export const useOperationsAuth = () => {
  const context = useContext(OperationsAuthContext)

  if (!context) {
    throw new Error('useOperationsAuth must be used within an OperationsAuthProvider.')
  }

  return context
}
