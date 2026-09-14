/**
 * LOAD Coffee domain models.
 *
 * Coffee is a distinct product line from laundry: it is priced by size (and
 * optional modifiers) rather than by weight/item, and has no pickup/delivery
 * lifecycle. These types intentionally do NOT extend `CatalogService` /
 * `LaundryOrder` — see `approvedCoffeeCatalogue.ts` for the rationale.
 */

/** A customisation that can be applied to a coffee/tea drink, e.g. "Oat milk". */
export interface Modifier {
  id: string
  name: string
  /** Additional charge in Rand, e.g. 8 = +R8. Zero for free options like Decaf. */
  priceAdjustment: number
  available: boolean
}

export type CoffeeSize = 'REGULAR' | 'LARGE'

/** A drink sold under the LOAD Coffee menu (Coffee, Iced Coffee, Matcha, etc.). */
export interface CoffeeProduct {
  id: string
  categoryId: 'coffee'
  /** Menu section, e.g. "Coffee", "Iced Coffee", "Matcha", "Tea + Iced Tea" */
  subCategoryLabel: string
  name: string
  description?: string
  /** Regular size price in Rand */
  regularPrice: number
  /** Large size price in Rand. Omitted when the drink is only offered in one size. */
  largePrice?: number
  /** Highlighted as a LOAD Favourite on the menu */
  favourite: boolean
  available: boolean
  /** Ids of `Modifier`s that may be applied to this drink, if any */
  modifierIds?: string[]
  icon?: string
}

/** A food item sold under the LOAD Coffee menu (Pastries, Donuts) — single fixed price, no size/modifiers. */
export interface FoodProduct {
  id: string
  categoryId: 'coffee'
  /** Menu section, e.g. "Pastries", "Mini Loaded Donuts" */
  subCategoryLabel: string
  name: string
  fixedPrice: number
  available: boolean
  note?: string
  icon?: string
}

// ─── Coffee cart / order ────────────────────────────────────────────────────
//
// Coffee has no pickup/delivery lifecycle, so it deliberately uses its own
// lightweight cart + order shape rather than `LaundryOrder`. This is an
// additive "Add to Order" flow, not a replacement for the laundry booking
// stepper — see `CoffeeCartContext.tsx` / `coffeeOrderStore.ts`.

/** A single line in the customer's coffee cart. */
export interface CoffeeCartLine {
  /** Stable identity for this exact selection (product + size + modifiers) */
  id: string
  productId: string
  name: string
  /** Present for drinks with a size choice; omitted for fixed-price food items */
  size?: CoffeeSize
  modifierIds: string[]
  modifierLabel?: string
  /** Unit price already including size + modifiers, in Rand */
  unitPrice: number
  quantity: number
}

export type CoffeeOrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED'

/** A placed coffee order — confirmed instantly, no driver/production pipeline. */
export interface CoffeeOrder {
  id: string
  customerId: string
  status: CoffeeOrderStatus
  items: CoffeeCartLine[]
  total: number
  placedAt: string
}
