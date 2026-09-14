import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { CoffeeCartLine, CoffeeSize } from '@/domain/models/coffee'

/**
 * Client-side LOAD Coffee cart — additive "Add to Order" flow, deliberately
 * separate from the laundry booking stepper's local form state (see
 * `approvedCoffeeCatalogue.ts` for the architectural rationale). Persisted to
 * localStorage so the cart survives navigation and reloads within a session.
 */

const COFFEE_CART_STORAGE_KEY = 'load.customer.coffeeCart.v1'

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const readCartFromStorage = (): CoffeeCartLine[] => {
  if (!canUseStorage()) return []

  const raw = window.localStorage.getItem(COFFEE_CART_STORAGE_KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw) as CoffeeCartLine[]
  } catch {
    window.localStorage.removeItem(COFFEE_CART_STORAGE_KEY)
    return []
  }
}

const writeCartToStorage = (lines: CoffeeCartLine[]) => {
  if (!canUseStorage()) return
  window.localStorage.setItem(COFFEE_CART_STORAGE_KEY, JSON.stringify(lines))
}

export interface AddCoffeeCartItemInput {
  productId: string
  name: string
  size?: CoffeeSize
  modifierIds: string[]
  modifierLabel?: string
  unitPrice: number
  quantity?: number
}

interface CoffeeCartContextValue {
  lines: CoffeeCartLine[]
  itemCount: number
  subtotal: number
  addItem: (input: AddCoffeeCartItemInput) => void
  updateQuantity: (lineId: string, quantity: number) => void
  removeItem: (lineId: string) => void
  clear: () => void
}

const CoffeeCartContext = createContext<CoffeeCartContextValue | undefined>(undefined)

/** Deterministic identity for a cart line based on product + size + modifiers, so repeat "Add" calls merge quantity. */
const buildLineId = (productId: string, size: CoffeeSize | undefined, modifierIds: string[]) =>
  [productId, size ?? 'NONE', [...modifierIds].sort().join('+')].join('::')

export const CoffeeCartProvider = ({ children }: PropsWithChildren) => {
  const [lines, setLines] = useState<CoffeeCartLine[]>(() => readCartFromStorage())

  useEffect(() => {
    writeCartToStorage(lines)
  }, [lines])

  const addItem = useCallback((input: AddCoffeeCartItemInput) => {
    const id = buildLineId(input.productId, input.size, input.modifierIds)
    const quantity = input.quantity ?? 1

    setLines((prev) => {
      const existing = prev.find((line) => line.id === id)
      if (existing) {
        return prev.map((line) =>
          line.id === id ? { ...line, quantity: line.quantity + quantity } : line,
        )
      }

      const newLine: CoffeeCartLine = {
        id,
        productId: input.productId,
        name: input.name,
        ...(input.size ? { size: input.size } : {}),
        modifierIds: input.modifierIds,
        ...(input.modifierLabel ? { modifierLabel: input.modifierLabel } : {}),
        unitPrice: input.unitPrice,
        quantity,
      }
      return [...prev, newLine]
    })
  }, [])

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.id !== lineId)
      }
      return prev.map((line) => (line.id === lineId ? { ...line, quantity } : line))
    })
  }, [])

  const removeItem = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines],
  )

  const value = useMemo(
    () => ({ lines, itemCount, subtotal, addItem, updateQuantity, removeItem, clear }),
    [lines, itemCount, subtotal, addItem, updateQuantity, removeItem, clear],
  )

  return <CoffeeCartContext.Provider value={value}>{children}</CoffeeCartContext.Provider>
}

export const useCoffeeCart = () => {
  const context = useContext(CoffeeCartContext)
  if (!context) {
    throw new Error('useCoffeeCart must be used within a CoffeeCartProvider.')
  }
  return context
}
