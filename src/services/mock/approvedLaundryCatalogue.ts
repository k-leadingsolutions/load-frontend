/**
 * Approved LOAD laundry service catalogue.
 *
 * This file is the single authoritative source for:
 *   - Service category discovery cards (category-first UX)
 *   - Itemised service definitions with correct approved pricing
 *   - Pricing model, starting-price flags, minimum charges, and LOAD Pass eligibility
 *
 * Coffee pricing is intentionally excluded — it has not been approved and is managed
 * separately in `data.ts` as placeholder/pending data.
 *
 * Do NOT mix coffee items into this catalogue.
 */

import type { CatalogService, ServiceCategory } from '@/domain/models/service'

// ─── Category discovery cards ─────────────────────────────────────────────────

export const approvedCategories: ServiceCategory[] = [
  {
    id: 'everyday',
    name: 'Everyday',
    description: 'Your weekly laundry — washed, dried and finished with care.',
    tagline: 'Weekly laundry',
    startingPriceLabel: 'from R45/kg',
    accent: 'bg-load-100 text-load-700',
    icon: '🧺',
    isFeatured: true,
  },
  {
    id: 'dry-cleaning',
    name: 'Dry Cleaning',
    description: 'Professional per-item garment cleaning and finishing.',
    tagline: 'Professional garment care',
    startingPriceLabel: 'from R90/item',
    accent: 'bg-slate-100 text-slate-700',
    icon: '👔',
    isFeatured: true,
  },
  {
    id: 'luxury-care',
    name: 'Luxury Care',
    description: 'Specialist care for the things you care about.',
    tagline: 'Designer & delicate',
    startingPriceLabel: 'from R110/item',
    accent: 'bg-violet-100 text-violet-700',
    icon: '✨',
    isFeatured: true,
  },
  {
    id: 'sneaker-care',
    name: 'Sneaker Care',
    description: 'Cleaning, repair and restoration — from everyday sneakers to premium footwear.',
    tagline: 'Clean • repair • restore',
    startingPriceLabel: 'from R120/pair',
    accent: 'bg-orange-100 text-orange-700',
    icon: '👟',
    isFeatured: true,
  },
  {
    id: 'bag-care',
    name: 'Bag Care',
    description: 'Premium assessment-led cleaning, repair and restoration.',
    tagline: 'Clean • repair • restore',
    startingPriceLabel: 'from R180',
    accent: 'bg-amber-100 text-amber-800',
    icon: '👜',
    isFeatured: false,
  },
  {
    id: 'home-care',
    name: 'Home Care',
    description: 'Bedding, linen and household textiles.',
    tagline: 'Bedding & household',
    startingPriceLabel: 'from R35/item',
    accent: 'bg-cyan-100 text-cyan-700',
    icon: '🛏️',
    isFeatured: false,
  },
  {
    id: 'rug-care',
    name: 'Rug Care',
    description: 'Deep cleaning for loose rugs.',
    tagline: 'Deep clean & restore',
    startingPriceLabel: 'from R280',
    accent: 'bg-emerald-100 text-emerald-700',
    icon: '🏠',
    isFeatured: false,
  },
  {
    id: 'tailoring',
    name: 'Tailoring',
    description: 'Assessment-led alterations and repairs.',
    tagline: 'Assessment-led repairs',
    startingPriceLabel: 'from R40',
    accent: 'bg-rose-100 text-rose-700',
    icon: '🪡',
    isFeatured: false,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** R120 minimum charge applies to all Everyday Laundry per-kg services */
const EVERYDAY_MIN = 120

const fixed = (
  id: string,
  categoryId: string,
  name: string,
  price: number,
  unit: string,
  opts?: Partial<Pick<CatalogService, 'shortDescription' | 'turnaroundLabel' | 'subCategoryLabel' | 'featured' | 'loadPassEligible'>>,
): CatalogService => ({
  id,
  categoryId,
  name,
  shortDescription: opts?.shortDescription ?? '',
  turnaroundLabel: opts?.turnaroundLabel ?? '48-hour standard',
  ...(opts?.subCategoryLabel !== undefined ? { subCategoryLabel: opts.subCategoryLabel } : {}),
  pricingMode: 'PAY_PER_ITEM',
  pricingModel: 'FIXED_SERVICE',
  basePrice: price,
  unitLabel: unit,
  isStartingPrice: false,
  loadPassEligible: opts?.loadPassEligible ?? false,
  featured: opts?.featured ?? false,
})

const fromPrice = (
  id: string,
  categoryId: string,
  name: string,
  startingPrice: number,
  unit: string,
  opts?: Partial<Pick<CatalogService, 'shortDescription' | 'turnaroundLabel' | 'subCategoryLabel' | 'featured' | 'loadPassEligible'>>,
): CatalogService => ({
  id,
  categoryId,
  name,
  shortDescription: opts?.shortDescription ?? '',
  turnaroundLabel: opts?.turnaroundLabel ?? '48-hour standard',
  ...(opts?.subCategoryLabel !== undefined ? { subCategoryLabel: opts.subCategoryLabel } : {}),
  pricingMode: 'PAY_PER_ITEM',
  pricingModel: 'ASSESSMENT_REQUIRED',
  basePrice: startingPrice,
  unitLabel: unit,
  isStartingPrice: true,
  loadPassEligible: opts?.loadPassEligible ?? false,
  featured: opts?.featured ?? false,
})

type WeightBasedOpts = {
  shortDescription?: string
  turnaroundLabel?: string
  subCategoryLabel?: string
  minimumCharge?: number
  featured?: boolean
  loadPassEligible?: boolean
  pricingModel?: CatalogService['pricingModel']
}

const weightBased = (
  id: string,
  categoryId: string,
  name: string,
  pricePerKg: number,
  opts?: WeightBasedOpts,
): CatalogService => ({
  id,
  categoryId,
  name,
  shortDescription: opts?.shortDescription ?? '',
  turnaroundLabel: opts?.turnaroundLabel ?? '24-hour standard',
  ...(opts?.subCategoryLabel !== undefined ? { subCategoryLabel: opts.subCategoryLabel } : {}),
  pricingMode: 'PAY_PER_ITEM',
  pricingModel: opts?.pricingModel ?? 'PER_KILOGRAM',
  basePrice: pricePerKg,
  unitLabel: 'kg',
  isStartingPrice: opts?.pricingModel === 'ASSESSMENT_REQUIRED',
  ...(opts?.minimumCharge !== undefined ? { minimumCharge: opts.minimumCharge } : {}),
  loadPassEligible: opts?.loadPassEligible ?? false,
  featured: opts?.featured ?? false,
})

// ─── EVERYDAY LAUNDRY ─────────────────────────────────────────────────────────

export const everydayServices: CatalogService[] = [
  weightBased('ev-wash-dry-fold', 'everyday', 'Wash + Dry + Fold', 45, {
    shortDescription: 'Washed, dried and folded with care.',
    minimumCharge: EVERYDAY_MIN,
    loadPassEligible: true,
    featured: true,
  }),
  weightBased('ev-wash-dry-iron-fold', 'everyday', 'Wash + Dry + Iron/Fold', 60, {
    shortDescription: 'Full service with ironing finish.',
    minimumCharge: EVERYDAY_MIN,
  }),
  weightBased('ev-wash-fold-air-dry', 'everyday', 'Wash + Fold — Air Dry', 40, {
    shortDescription: 'Gentle air-dry process for delicate loads.',
    minimumCharge: EVERYDAY_MIN,
  }),
  weightBased('ev-iron-only', 'everyday', 'Iron Only', 40, {
    shortDescription: 'Crisp, press-perfect finishing service.',
    minimumCharge: EVERYDAY_MIN,
  }),
  weightBased('ev-dry-only', 'everyday', 'Dry Only', 35, {
    shortDescription: 'Tumble dry and fold — bring pre-washed items.',
    minimumCharge: EVERYDAY_MIN,
  }),
  weightBased('ev-delicates-wash', 'everyday', 'Delicates Wash', 65, {
    shortDescription: 'Delicates, mixed specialty fabrics, excessive staining or items requiring non-standard handling are assessed before processing.',
    minimumCharge: EVERYDAY_MIN,
    pricingModel: 'ASSESSMENT_REQUIRED',
  }),
]

// ─── DRY CLEANING ─────────────────────────────────────────────────────────────

export const dryCleaningServices: CatalogService[] = [
  fixed('dc-shirt-blouse', 'dry-cleaning', 'Shirt / Blouse', 140, 'item', { shortDescription: 'Pressed and finished to a professional standard.', featured: true }),
  fixed('dc-trousers-skirt', 'dry-cleaning', 'Trousers / Standard Skirt', 150, 'item', { shortDescription: 'Clean and crisp finish for everyday workwear.' }),
  fixed('dc-suit-2pc', 'dry-cleaning', '2-Piece Suit', 300, 'item', { shortDescription: 'Full suit clean and press.' }),
  fixed('dc-suit-3pc', 'dry-cleaning', '3-Piece Suit', 380, 'item', { shortDescription: 'Three-piece clean, press, and presentation finish.' }),
  fixed('dc-jacket-blazer', 'dry-cleaning', 'Jacket / Blazer', 200, 'item', { shortDescription: 'Clean and structured press.' }),
  fixed('dc-school-blazer', 'dry-cleaning', 'School Blazer', 180, 'item', { shortDescription: 'School uniform standard finish.' }),
  fixed('dc-tie', 'dry-cleaning', 'Tie', 90, 'item', { shortDescription: 'Cleaned and returned in protective cover.' }),
  fixed('dc-sweater-cardigan', 'dry-cleaning', 'Sweater / Cardigan', 190, 'item', { shortDescription: 'Fabric-safe dry clean for knitwear.' }),
  fixed('dc-short-coat', 'dry-cleaning', 'Short Coat', 230, 'item', { shortDescription: 'Full clean and press.' }),
  fixed('dc-medium-coat', 'dry-cleaning', 'Medium Coat', 270, 'item', { shortDescription: 'Full clean and press.' }),
  fixed('dc-long-coat', 'dry-cleaning', 'Long Coat', 320, 'item', { shortDescription: 'Full clean and press.' }),
  // Assessment-led
  fromPrice('dc-cocktail-dress', 'dry-cleaning', 'Cocktail Dress', 280, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('dc-evening-gown', 'dry-cleaning', 'Evening Dress / Gown', 450, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('dc-beaded-dress', 'dry-cleaning', 'Beaded / Embellished Dress', 600, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('dc-traditional-designer', 'dry-cleaning', 'Traditional / Designer Outfit', 400, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('dc-wedding-simple', 'dry-cleaning', 'Wedding Dress — Simple', 1500, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('dc-wedding-detailed', 'dry-cleaning', 'Wedding Dress — Detailed', 2000, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('dc-wedding-heavy', 'dry-cleaning', 'Wedding Dress — Heavy Beading / Lace', 2500, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('dc-veil', 'dry-cleaning', 'Veil', 350, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
]

// ─── LUXURY CARE ──────────────────────────────────────────────────────────────

export const luxuryCareServices: CatalogService[] = [
  fixed('lc-premium-dress-shirt', 'luxury-care', 'Premium Dress Shirt', 110, 'item', { shortDescription: 'Individual tag, fabric-appropriate cleaning and premium finish.', featured: true }),
  fixed('lc-silk-designer-blouse', 'luxury-care', 'Silk / Designer Blouse', 160, 'item', { shortDescription: 'Specialist silk-safe process.' }),
  fixed('lc-fine-knit-wool-sweater', 'luxury-care', 'Fine Knit / Wool Sweater', 180, 'item', { shortDescription: 'Gentle wool-safe process and finish.' }),
  fixed('lc-cashmere-sweater', 'luxury-care', 'Cashmere Sweater', 220, 'item', { shortDescription: 'Premium cashmere care and presentation.' }),
  fixed('lc-designer-polo-top', 'luxury-care', 'Designer Polo / Delicate Top', 120, 'item', { shortDescription: 'Individual tag and fabric-appropriate care.' }),
  fixed('lc-pleated-skirt', 'luxury-care', 'Pleated / Delicate Skirt', 220, 'item', { shortDescription: 'Structured press and presentation.' }),
  fixed('lc-premium-jacket', 'luxury-care', 'Premium Jacket', 250, 'item', { shortDescription: 'Full inspection, clean, and structured press.' }),
  fixed('lc-puffer-jacket', 'luxury-care', 'Puffer Jacket', 300, 'item', { shortDescription: 'Specialist puffer-safe clean and re-loft.' }),
  fixed('lc-wool-coat', 'luxury-care', 'Wool Coat', 380, 'item', { shortDescription: 'Wool-safe process, press, and presentation.' }),
  // Assessment-led
  fromPrice('lc-silk-garment', 'luxury-care', 'Silk Garment', 220, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('lc-wool-garment', 'luxury-care', 'Wool Garment', 190, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('lc-cashmere-garment', 'luxury-care', 'Cashmere Garment', 220, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('lc-velvet-garment', 'luxury-care', 'Velvet Garment', 250, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('lc-leather-jacket', 'luxury-care', 'Leather Jacket', 750, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('lc-suede-jacket', 'luxury-care', 'Suede Jacket', 800, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('lc-leather-coat', 'luxury-care', 'Leather Coat', 950, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
]

// ─── TAILORING ────────────────────────────────────────────────────────────────

export const tailoringServices: CatalogService[] = [
  fromPrice('ta-button-repair', 'tailoring', 'Button / small hand repair', 40, 'item', { shortDescription: 'Final pricing confirmed after physical assessment.', featured: true }),
  fromPrice('ta-minor-seam', 'tailoring', 'Minor seam repair', 60, 'item', { shortDescription: 'Final pricing confirmed after physical assessment.' }),
  fromPrice('ta-trouser-hem', 'tailoring', 'Trouser hem / simple alteration', 120, 'item', { shortDescription: 'Final pricing confirmed after physical assessment.' }),
  fromPrice('ta-zip-replacement', 'tailoring', 'Zip replacement', 180, 'item', { shortDescription: 'Final pricing confirmed after physical assessment.' }),
  fromPrice('ta-jacket-dress-alt', 'tailoring', 'Jacket / dress alteration', 250, 'item', { shortDescription: 'Final pricing confirmed after physical assessment.' }),
  fromPrice('ta-complex-tailoring', 'tailoring', 'Complex tailoring / restructuring', 0, 'item', {
    shortDescription: 'Complex work requires full assessment and quotation.',
    turnaroundLabel: 'Quote required',
  }),
]

// ─── HOME CARE ────────────────────────────────────────────────────────────────

export const homeCareServices: CatalogService[] = [
  // Duvets & Bedding
  fixed('hc-single-duvet', 'home-care', 'Single Duvet', 220, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Deep clean and fresh finish.', featured: true }),
  fixed('hc-double-duvet', 'home-care', 'Double Duvet', 250, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Deep clean and fresh finish.' }),
  fixed('hc-queen-duvet', 'home-care', 'Queen Duvet', 280, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Deep clean and fresh finish.' }),
  fixed('hc-king-duvet', 'home-care', 'King Duvet', 310, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Deep clean and fresh finish.' }),
  fromPrice('hc-feather-down-duvet', 'home-care', 'Feather / Down Duvet', 340, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Final price confirmed after assessment.' }),
  fixed('hc-sheet-set', 'home-care', 'Sheet Set', 150, 'set', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Washed, dried and folded.' }),
  fixed('hc-single-duvet-cover', 'home-care', 'Single Duvet Cover', 100, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Washed and pressed.' }),
  fixed('hc-dq-king-duvet-cover', 'home-care', 'Double / Queen / King Duvet Cover', 140, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Washed and pressed.' }),
  fixed('hc-medium-pillow', 'home-care', 'Medium Pillow', 110, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Deep clean and fresh finish.' }),
  fixed('hc-large-pillow', 'home-care', 'Large Pillow', 130, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Deep clean and fresh finish.' }),
  fixed('hc-towel', 'home-care', 'Towel', 35, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Washed and tumble dried.' }),
  fixed('hc-towel-set', 'home-care', 'Towel Set', 130, 'set', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Full set washed and tumble dried.' }),
  fixed('hc-cushion', 'home-care', 'Cushion', 70, 'item', { subCategoryLabel: 'Duvets & Bedding', shortDescription: 'Washed and finished.' }),
  // Blankets
  fixed('hc-single-blanket', 'home-care', 'Single Blanket', 260, 'item', { subCategoryLabel: 'Blankets', shortDescription: 'Deep clean and fresh finish.' }),
  fixed('hc-double-blanket', 'home-care', 'Double Blanket', 300, 'item', { subCategoryLabel: 'Blankets', shortDescription: 'Deep clean and fresh finish.' }),
  fixed('hc-queen-blanket', 'home-care', 'Queen Blanket', 340, 'item', { subCategoryLabel: 'Blankets', shortDescription: 'Deep clean and fresh finish.' }),
  fixed('hc-king-blanket', 'home-care', 'King Blanket', 370, 'item', { subCategoryLabel: 'Blankets', shortDescription: 'Deep clean and fresh finish.' }),
  fromPrice('hc-specialty-blanket', 'home-care', 'Heavy / Weighted / Specialty Blanket', 400, 'item', { subCategoryLabel: 'Blankets', shortDescription: 'Final price confirmed after assessment.' }),
  // Curtains (weight-based)
  weightBased('hc-standard-curtains', 'home-care', 'Standard Curtains', 75, { subCategoryLabel: 'Curtains', shortDescription: 'Washed and pressed per kilogram.' }),
  weightBased('hc-blockout-curtains', 'home-care', 'Blockout Curtains', 85, { subCategoryLabel: 'Curtains', shortDescription: 'Specialist clean and press per kilogram.' }),
  weightBased('hc-delicate-curtains', 'home-care', 'Delicate Curtains', 95, { subCategoryLabel: 'Curtains', shortDescription: 'Fabric-safe clean and press per kilogram.' }),
]

// ─── RUG CARE ─────────────────────────────────────────────────────────────────

export const rugCareServices: CatalogService[] = [
  fixed('rc-small-rug', 'rug-care', 'Small Rug — up to 1×1 m', 280, 'rug', { shortDescription: 'Full deep clean.', featured: true }),
  fixed('rc-medium-rug', 'rug-care', 'Medium Rug — up to 1.5×1.5 m', 450, 'rug', { shortDescription: 'Full deep clean.' }),
  fixed('rc-large-rug', 'rug-care', 'Large Rug — up to 2×2 m', 550, 'rug', { shortDescription: 'Full deep clean.' }),
  fixed('rc-xl-rug', 'rug-care', 'XL Rug — up to 3×3 m', 650, 'rug', { shortDescription: 'Full deep clean.' }),
  fromPrice('rc-oversized-rug', 'rug-care', 'Oversized Rug', 0, 'rug', { shortDescription: 'Quote after assessment.' }),
  fromPrice('rc-wool-persian-rug', 'rug-care', 'Wool / Persian / Delicate Fibre Rug', 750, 'rug', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('rc-stain-odour', 'rug-care', 'Heavy Stain / Odour Treatment', 150, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('rc-restoration-fringe', 'rug-care', 'Rug Restoration / Fringe Repair', 250, 'item', { shortDescription: 'Final price confirmed after assessment.' }),
]

// ─── SNEAKER CARE ─────────────────────────────────────────────────────────────

export const sneakerCareServices: CatalogService[] = [
  // Cleaning
  fixed('sc-fresh-clean', 'sneaker-care', 'Fresh Clean', 150, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Standard clean and refresh.', featured: true }),
  fixed('sc-deep-clean', 'sneaker-care', 'Deep Clean', 220, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Thorough deep clean inside and out.' }),
  fixed('sc-premium-clean', 'sneaker-care', 'Premium Clean', 300, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Full premium detail clean and presentation.' }),
  fixed('sc-kids-sneakers', 'sneaker-care', "Kids' Sneakers", 120, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Gentle clean for children\'s shoes.' }),
  fromPrice('sc-suede-nubuck', 'sneaker-care', 'Suede / Nubuck Care', 300, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-luxury-designer', 'sneaker-care', 'Luxury / Designer Sneaker Care', 350, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-boot-cleaning', 'sneaker-care', 'Boot Cleaning', 250, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fixed('sc-sole-whitening', 'sneaker-care', 'Sole Whitening', 80, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Restore midsoles to bright white.' }),
  fixed('sc-deodorising', 'sneaker-care', 'Deodorising', 30, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Fresh-scent treatment inside and out.' }),
  fromPrice('sc-stain-treatment', 'sneaker-care', 'Stain Treatment', 50, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fixed('sc-water-protective', 'sneaker-care', 'Water / Protective Treatment', 80, 'pair', { subCategoryLabel: 'Cleaning', shortDescription: 'Weather-guard spray coating.' }),
  // Repair & Restoration
  fromPrice('sc-lace-replacement', 'sneaker-care', 'Lace replacement', 40, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'From R40 + cost of laces.' }),
  fromPrice('sc-minor-stitch-glue', 'sneaker-care', 'Minor stitching / glue repair', 120, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-heel-tip', 'sneaker-care', 'Heel tip replacement', 150, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-sole-reglue', 'sneaker-care', 'Sole re-glue', 180, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-partial-sole', 'sneaker-care', 'Partial sole repair', 250, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-full-sole', 'sneaker-care', 'Full sole replacement', 450, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-leather-conditioning', 'sneaker-care', 'Leather conditioning / polish restoration', 180, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-colour-touchup', 'sneaker-care', 'Colour touch-up', 250, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-full-colour-restore', 'sneaker-care', 'Full sneaker colour restoration', 450, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-suede-nubuck-restore', 'sneaker-care', 'Suede / nubuck restoration', 400, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('sc-luxury-restore', 'sneaker-care', 'Luxury / designer shoe restoration', 650, 'pair', { subCategoryLabel: 'Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
]

// ─── BAG CARE (includes Wallets, Belts, Luggage as sub-categories) ─────────────

export const bagCareServices: CatalogService[] = [
  // Bag Cleaning
  fromPrice('bc-fabric-tote', 'bag-care', 'Fabric Tote / Small Bag Clean', 180, 'item', { subCategoryLabel: 'Bag Cleaning', shortDescription: 'Final price confirmed after assessment.', featured: true }),
  fromPrice('bc-backpack', 'bag-care', 'Backpack Clean', 250, 'item', { subCategoryLabel: 'Bag Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-standard-handbag', 'bag-care', 'Standard Handbag Clean', 300, 'item', { subCategoryLabel: 'Bag Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-leather-handbag', 'bag-care', 'Leather Handbag Clean + Condition', 450, 'item', { subCategoryLabel: 'Bag Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-suede-nubuck-bag', 'bag-care', 'Suede / Nubuck Bag Care', 500, 'item', { subCategoryLabel: 'Bag Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-luxury-designer-bag', 'bag-care', 'Luxury / Designer Bag Care', 650, 'item', { subCategoryLabel: 'Bag Cleaning', shortDescription: 'Final price confirmed after assessment.' }),
  // Bag Repair & Restoration
  fromPrice('bc-minor-stitch', 'bag-care', 'Minor stitching / seam repair', 150, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-zip-slider', 'bag-care', 'Zip / slider repair', 180, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-zip-replacement', 'bag-care', 'Zip replacement', 350, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-handle-strap-repair', 'bag-care', 'Handle / strap repair', 250, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-handle-strap-replace', 'bag-care', 'Handle / strap replacement', 450, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-edge-paint', 'bag-care', 'Edge paint touch-up', 250, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-corner-repair', 'bag-care', 'Corner repair', 300, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-leather-conditioning', 'bag-care', 'Leather conditioning / revival', 250, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-colour-touchup', 'bag-care', 'Colour touch-up', 350, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-full-colour-restore', 'bag-care', 'Full colour restoration', 750, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-lining-repair', 'bag-care', 'Lining repair', 350, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-lining-replacement', 'bag-care', 'Lining replacement', 650, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-hardware-replacement', 'bag-care', 'Hardware replacement', 250, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'From R250 + hardware.' }),
  fromPrice('bc-luxury-restore', 'bag-care', 'Luxury / Designer Bag Restoration', 950, 'item', { subCategoryLabel: 'Bag Repair & Restoration', shortDescription: 'Final price confirmed after assessment.' }),
  // Wallets & Small Leather Goods
  fromPrice('bc-wallet-clean', 'bag-care', 'Wallet Clean + Condition', 150, 'item', { subCategoryLabel: 'Wallets & Small Leather Goods', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-wallet-luxury', 'bag-care', 'Luxury / Designer Wallet Care', 250, 'item', { subCategoryLabel: 'Wallets & Small Leather Goods', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-wallet-stitch', 'bag-care', 'Wallet Stitching / Edge Repair', 180, 'item', { subCategoryLabel: 'Wallets & Small Leather Goods', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-wallet-colour', 'bag-care', 'Wallet Colour Restoration', 300, 'item', { subCategoryLabel: 'Wallets & Small Leather Goods', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-wallet-full-restore', 'bag-care', 'Luxury Wallet Full Restoration', 450, 'item', { subCategoryLabel: 'Wallets & Small Leather Goods', shortDescription: 'Final price confirmed after assessment.' }),
  // Belts
  fromPrice('bc-belt-clean', 'bag-care', 'Belt Clean + Condition', 150, 'item', { subCategoryLabel: 'Belts', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-belt-stitch', 'bag-care', 'Belt Stitching / Edge Repair', 180, 'item', { subCategoryLabel: 'Belts', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-belt-hole-repair', 'bag-care', 'Belt Hole / Minor Hardware Repair', 100, 'item', { subCategoryLabel: 'Belts', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-belt-buckle', 'bag-care', 'Buckle Replacement', 200, 'item', { subCategoryLabel: 'Belts', shortDescription: 'From R200 + hardware.' }),
  fromPrice('bc-belt-colour', 'bag-care', 'Belt Colour Restoration', 300, 'item', { subCategoryLabel: 'Belts', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-belt-luxury-restore', 'bag-care', 'Luxury / Designer Belt Restoration', 450, 'item', { subCategoryLabel: 'Belts', shortDescription: 'Final price confirmed after assessment.' }),
  // Travel Luggage
  fromPrice('bc-cabin-luggage', 'bag-care', 'Cabin / Carry-On Luggage Clean', 350, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-medium-luggage', 'bag-care', 'Medium Luggage Clean', 450, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-large-luggage', 'bag-care', 'Large Luggage Clean', 550, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-luxury-luggage', 'bag-care', 'Luxury / Designer Luggage Care', 750, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-wheel-repair', 'bag-care', 'Wheel Repair / Replacement', 250, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'From R250 + parts.' }),
  fromPrice('bc-handle-repair', 'bag-care', 'Handle Repair', 300, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-telescopic-handle', 'bag-care', 'Telescopic Handle Replacement', 450, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'From R450 + parts.' }),
  fromPrice('bc-luggage-zip-repair', 'bag-care', 'Zip / Slider Repair', 250, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-luggage-zip-replace', 'bag-care', 'Full Zip Replacement', 500, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-luggage-lining', 'bag-care', 'Lining Repair', 350, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-luggage-corner', 'bag-care', 'Corner / Shell Repair', 400, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-leather-luggage-restore', 'bag-care', 'Leather Luggage Restoration', 750, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
  fromPrice('bc-luxury-luggage-restore', 'bag-care', 'Luxury / Designer Luggage Restoration', 1200, 'item', { subCategoryLabel: 'Travel Luggage', shortDescription: 'Final price confirmed after assessment.' }),
]

// ─── ADD-ONS (approved list) ──────────────────────────────────────────────────

import type { AddOnOption } from '@/domain/models/service'

export const approvedAddOns: AddOnOption[] = [
  { id: 'addon-spot-treatment', name: 'Standard Spot Treatment', description: 'Included with all laundry services at no extra charge.', price: 0 },
  { id: 'addon-advanced-stain', name: 'Advanced Stain Treatment', description: 'Targeted pre-treatment for stubborn marks and spills.', price: 50, suggestionTag: 'Suggested add-on' },
  { id: 'addon-specialist-stain', name: 'Specialist Stain Treatment', description: 'Final price confirmed after assessment.', price: 100, suggestionTag: 'Assessment-led' },
  { id: 'addon-premium-softener', name: 'Premium Fabric Softener', description: 'Luxury fabric softener for a soft, fresh finish.', price: 15 },
  { id: 'addon-fragrance-free', name: 'Fragrance-Free / Sensitive Wash', description: 'Sensitive-care detergent — ideal for allergies and baby items.', price: 20 },
  { id: 'addon-premium-fragrance', name: 'Premium Laundry Fragrance', description: 'Long-lasting premium scent added during washing.', price: 20 },
  { id: 'addon-garment-cover', name: 'Luxury Garment Cover', description: 'Individual branded garment cover for presentation and protection.', price: 35 },
  { id: 'addon-protective-treatment', name: 'Protective Treatment', description: 'Final price confirmed after assessment.', price: 80, suggestionTag: 'Assessment-led' },
  { id: 'addon-express', name: 'Express turnaround', description: 'Priority same-day processing where available.', price: 79, suggestionTag: 'Top seller' },
]

// ─── Full assembled catalogue (all laundry services, no coffee) ───────────────

export const approvedLaundryServices: CatalogService[] = [
  ...everydayServices,
  ...dryCleaningServices,
  ...luxuryCareServices,
  ...tailoringServices,
  ...homeCareServices,
  ...rugCareServices,
  ...sneakerCareServices,
  ...bagCareServices,
]
