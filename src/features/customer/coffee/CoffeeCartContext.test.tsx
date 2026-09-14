import { renderHook, act } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { CoffeeCartProvider, useCoffeeCart } from '@/features/customer/coffee/CoffeeCartContext'

const wrapper = ({ children }: PropsWithChildren) => <CoffeeCartProvider>{children}</CoffeeCartProvider>

describe('CoffeeCartContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts empty', () => {
    const { result } = renderHook(() => useCoffeeCart(), { wrapper })
    expect(result.current.lines).toHaveLength(0)
    expect(result.current.itemCount).toBe(0)
    expect(result.current.subtotal).toBe(0)
  })

  it('adds a new line item', () => {
    const { result } = renderHook(() => useCoffeeCart(), { wrapper })

    act(() => {
      result.current.addItem({
        productId: 'latte',
        name: 'Latte',
        size: 'REGULAR',
        modifierIds: [],
        unitPrice: 40,
      })
    })

    expect(result.current.lines).toHaveLength(1)
    expect(result.current.itemCount).toBe(1)
    expect(result.current.subtotal).toBe(40)
  })

  it('merges quantity when the same product + size + modifiers is added again', () => {
    const { result } = renderHook(() => useCoffeeCart(), { wrapper })

    act(() => {
      result.current.addItem({ productId: 'latte', name: 'Latte', size: 'REGULAR', modifierIds: [], unitPrice: 40 })
      result.current.addItem({ productId: 'latte', name: 'Latte', size: 'REGULAR', modifierIds: [], unitPrice: 40 })
    })

    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0]!.quantity).toBe(2)
    expect(result.current.subtotal).toBe(80)
  })

  it('treats different sizes of the same product as distinct lines', () => {
    const { result } = renderHook(() => useCoffeeCart(), { wrapper })

    act(() => {
      result.current.addItem({ productId: 'latte', name: 'Latte', size: 'REGULAR', modifierIds: [], unitPrice: 40 })
      result.current.addItem({ productId: 'latte', name: 'Latte', size: 'LARGE', modifierIds: [], unitPrice: 46 })
    })

    expect(result.current.lines).toHaveLength(2)
    expect(result.current.itemCount).toBe(2)
  })

  it('updates a line quantity, and removes it once quantity reaches zero', () => {
    const { result } = renderHook(() => useCoffeeCart(), { wrapper })

    act(() => {
      result.current.addItem({ productId: 'latte', name: 'Latte', modifierIds: [], unitPrice: 40 })
    })
    const lineId = result.current.lines[0]!.id

    act(() => {
      result.current.updateQuantity(lineId, 3)
    })
    expect(result.current.lines[0]!.quantity).toBe(3)

    act(() => {
      result.current.updateQuantity(lineId, 0)
    })
    expect(result.current.lines).toHaveLength(0)
  })

  it('removes a line item directly', () => {
    const { result } = renderHook(() => useCoffeeCart(), { wrapper })

    act(() => {
      result.current.addItem({ productId: 'latte', name: 'Latte', modifierIds: [], unitPrice: 40 })
    })
    const lineId = result.current.lines[0]!.id

    act(() => {
      result.current.removeItem(lineId)
    })
    expect(result.current.lines).toHaveLength(0)
  })

  it('clears the entire cart', () => {
    const { result } = renderHook(() => useCoffeeCart(), { wrapper })

    act(() => {
      result.current.addItem({ productId: 'latte', name: 'Latte', modifierIds: [], unitPrice: 40 })
      result.current.addItem({ productId: 'cappuccino', name: 'Cappuccino', modifierIds: [], unitPrice: 38 })
    })
    expect(result.current.lines).toHaveLength(2)

    act(() => {
      result.current.clear()
    })
    expect(result.current.lines).toHaveLength(0)
    expect(result.current.subtotal).toBe(0)
  })

  it('persists the cart to localStorage and restores it for a new provider instance', () => {
    const { result, unmount } = renderHook(() => useCoffeeCart(), { wrapper })

    act(() => {
      result.current.addItem({ productId: 'latte', name: 'Latte', modifierIds: [], unitPrice: 40 })
    })
    unmount()

    const { result: restored } = renderHook(() => useCoffeeCart(), { wrapper })
    expect(restored.current.lines).toHaveLength(1)
    expect(restored.current.lines[0]!.name).toBe('Latte')
  })

  it('throws when used outside of a CoffeeCartProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useCoffeeCart()
      } catch (error) {
        return error
      }
    })
    expect(result.current).toBeInstanceOf(Error)
  })
})
