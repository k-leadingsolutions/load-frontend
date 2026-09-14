/**
 * Approved LOAD Coffee menu catalogue.
 *
 * This file is the single authoritative source for:
 *   - The "LOAD Coffee" category discovery card
 *   - Coffee/tea drink menu items with REG/LRG pricing and LOAD Favourite flags
 *   - Food items (pastries, donuts) with fixed pricing
 *   - Drink modifiers (milk alternatives, syrups, extras) and their price adjustments
 *
 * Coffee is a distinct product line from laundry — it is priced by size and
 * optional modifiers, not weight/item, and has no pickup/delivery lifecycle.
 * Do NOT mix laundry items into this catalogue; see `approvedLaundryCatalogue.ts`.
 */

import type { CoffeeProduct, FoodProduct, Modifier } from '@/domain/models/coffee'
import type { ServiceCategory } from '@/domain/models/service'

// ─── Category discovery card ───────────────────────────────────────────────────

export const loadCoffeeCategory: ServiceCategory = {
  id: 'coffee',
  name: 'LOAD Coffee',
  description: 'Coffee, matcha, refreshers, pastries and donuts — made fresh to order.',
  tagline: 'Sip. Snack. LOAD.',
  startingPriceLabel: 'from R17',
  accent: 'bg-amber-100 text-amber-800',
  icon: '☕',
  isFeatured: false,
}

// ─── Ordered list of menu sections ─────────────────────────────────────────────

export const coffeeSubcategories = [
  'Coffee',
  'Iced Coffee',
  'Matcha',
  'Chocolate',
  'Freezos',
  'Refreshers',
  'Tea + Iced Tea',
  'Pastries',
  'Mini Loaded Donuts',
  'Loaded Donuts',
  'Original Glazed Donuts',
] as const

// ─── Drink modifiers ────────────────────────────────────────────────────────────

export const coffeeModifiers: Modifier[] = [
  { id: 'decaf', name: 'Decaf', priceAdjustment: 0, available: true },
  { id: 'extra-shot', name: 'Extra espresso shot', priceAdjustment: 10, available: true },
  { id: 'oat-milk', name: 'Oat milk', priceAdjustment: 8, available: true },
  { id: 'almond-milk', name: 'Almond milk', priceAdjustment: 8, available: true },
  { id: 'coconut-milk', name: 'Coconut milk', priceAdjustment: 8, available: true },
  { id: 'vanilla-syrup', name: 'Vanilla syrup', priceAdjustment: 8, available: true },
  { id: 'caramel-syrup', name: 'Caramel syrup', priceAdjustment: 8, available: true },
  { id: 'hazelnut-syrup', name: 'Hazelnut syrup', priceAdjustment: 8, available: true },
  { id: 'whipped-cream', name: 'Whipped cream', priceAdjustment: 8, available: true },
  { id: 'cream', name: 'Cream', priceAdjustment: 8, available: true },
]

const allModifierIds = coffeeModifiers.map((m) => m.id)

// ─── Drinks (Coffee, Iced Coffee, Matcha, Chocolate, Freezos, Refreshers, Tea) ─

let nextId = 1
const drink = (
  subCategoryLabel: (typeof coffeeSubcategories)[number],
  name: string,
  regularPrice: number,
  largePrice?: number,
  favourite = false,
): CoffeeProduct => ({
  id: `coffee-${String(nextId++).padStart(3, '0')}`,
  categoryId: 'coffee',
  subCategoryLabel,
  name,
  regularPrice,
  ...(largePrice !== undefined ? { largePrice } : {}),
  favourite,
  available: true,
  modifierIds: allModifierIds,
})

export const coffeeProducts: CoffeeProduct[] = [
  // Coffee
  drink('Coffee', 'Espresso', 28),
  drink('Coffee', 'Cortado', 36),
  drink('Coffee', 'Americano / Long Black', 32, 38),
  drink('Coffee', 'Cappuccino', 38, 44),
  drink('Coffee', 'Flat White', 40),
  drink('Coffee', 'Latte', 40, 46),
  drink('Coffee', 'Mocha', 45, 52),

  // Iced Coffee
  drink('Iced Coffee', 'Iced Latte', 42, 48),
  drink('Iced Coffee', 'Iced Spanish Latte', 48, 55, true),
  drink('Iced Coffee', 'Iced Caramel Latte', 48, 55, true),
  drink('Iced Coffee', 'Iced Vanilla Latte', 48, 55),
  drink('Iced Coffee', 'Iced Mocha', 48, 55),
  drink('Iced Coffee', 'Espresso Tonic + Citrus', 48, 55),

  // Matcha
  drink('Matcha', 'Matcha Latte', 45, 52),
  drink('Matcha', 'Iced Matcha Latte', 47, 54),
  drink('Matcha', 'Strawberry Matcha', 52, 59, true),
  drink('Matcha', 'Salted Caramel Matcha', 52, 59, true),
  drink('Matcha', 'Blueberry Matcha', 52, 59),
  drink('Matcha', 'Coconut Matcha', 52, 59),
  drink('Matcha', 'White Chocolate Matcha', 55, 62, true),

  // Chocolate
  drink('Chocolate', 'Hot Chocolate', 42, 48),
  drink('Chocolate', 'Dark Hot Chocolate', 46, 52),
  drink('Chocolate', 'White Hot Chocolate', 46, 52),
  drink('Chocolate', 'Iced Chocolate', 45, 52),
  drink('Chocolate', 'Iced Dark Chocolate', 48, 55),
  drink('Chocolate', 'Iced White Chocolate', 48, 55),

  // Freezos
  drink('Freezos', 'Coffee Freezo', 48, 55),
  drink('Freezos', 'Caramel Coffee Freezo', 52, 59, true),
  drink('Freezos', 'Chocolate Freezo', 48, 55),
  drink('Freezos', 'Strawberry & Cream Freezo', 52, 59, true),
  drink('Freezos', 'Matcha Freezo', 52, 59),
  drink('Freezos', 'Banana PB Freezo', 55, 62, true),

  // Refreshers
  drink('Refreshers', 'Strawberry Lemonade', 42, 48, true),
  drink('Refreshers', 'Watermelon Cooler', 42, 48),
  drink('Refreshers', 'Passionfruit Lemonade', 42, 48),
  drink('Refreshers', 'Mango Passion Refresher', 45, 52, true),
  drink('Refreshers', 'Virgin Mojito', 45, 52),

  // Tea + Iced Tea
  drink('Tea + Iced Tea', 'Rooibos / Five Roses / Green Tea', 28, 34),
  drink('Tea + Iced Tea', 'Peach Iced Tea', 38, 44),
  drink('Tea + Iced Tea', 'Lemon Iced Tea', 38, 44),
]

// ─── Food items (Pastries, Donuts) — fixed pricing, no size/modifiers ─────────

let nextFoodId = 1
const food = (
  subCategoryLabel: (typeof coffeeSubcategories)[number],
  name: string,
  fixedPrice: number,
  note?: string,
): FoodProduct => ({
  id: `coffee-food-${String(nextFoodId++).padStart(3, '0')}`,
  categoryId: 'coffee',
  subCategoryLabel,
  name,
  fixedPrice,
  available: true,
  ...(note ? { note } : {}),
})

const PASTRY_NOTE = 'Pastry selection and flavours may vary by day.'

export const foodProducts: FoodProduct[] = [
  // Pastries
  food('Pastries', 'Butter Croissant', 35, PASTRY_NOTE),
  food('Pastries', 'Almond Pain au Chocolat', 48, PASTRY_NOTE),
  food('Pastries', 'Banana Bread Slice', 38, PASTRY_NOTE),
  food('Pastries', 'Brownie', 38, PASTRY_NOTE),
  food('Pastries', 'Cinnamon Roll', 42, PASTRY_NOTE),
  food('Pastries', 'Blueberry Custard Cookie', 39, PASTRY_NOTE),

  // Mini Loaded Donuts
  food('Mini Loaded Donuts', '6 Mini Loaded Donuts', 69),
  food('Mini Loaded Donuts', '12 Mini Loaded Donuts', 119),
  food('Mini Loaded Donuts', '24 Mini Loaded Donuts', 199),

  // Loaded Donuts
  food('Loaded Donuts', '1 Loaded Donut', 30),
  food('Loaded Donuts', '2 Loaded Donuts', 59),
  food('Loaded Donuts', '6 Loaded Donuts', 149),
  food('Loaded Donuts', '12 Loaded Donuts', 259),

  // Original Glazed Donuts
  food('Original Glazed Donuts', '1 Original Glazed', 17),
  food('Original Glazed Donuts', '3 Original Glazed', 49),
  food('Original Glazed Donuts', '6 Original Glazed', 95),
  food('Original Glazed Donuts', '12 Original Glazed', 169),
]
