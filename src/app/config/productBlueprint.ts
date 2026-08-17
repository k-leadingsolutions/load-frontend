import type { UserRole } from '@/domain/models/customer'

export interface ProductRoute {
  path: string
  title: string
  role: UserRole
  release: 'MVP' | 'ROADMAP'
  summary: string
}

export interface ScreenInventoryItem {
  role: UserRole
  name: string
  purpose: string
  priority: 'Now' | 'Next' | 'Later'
}

export interface DesignSystemSection {
  title: string
  values: string[]
}

export interface BacklogWeek {
  week: string
  focus: string
  deliverables: string[]
}

export const productRouteMap: ProductRoute[] = [
  { path: '/', title: 'Brand Landing', role: 'PUBLIC', release: 'MVP', summary: 'Marketing-led entry point with service overview and CTAs.' },
  { path: '/foundation', title: 'MVP Blueprint', role: 'PUBLIC', release: 'MVP', summary: 'Delivery blueprint, architecture, and rollout plan.' },
  { path: '/customer/home', title: 'Customer Home', role: 'CUSTOMER', release: 'MVP', summary: 'Personal dashboard for services, orders, wallet, and loyalty.' },
  { path: '/customer/orders', title: 'Customer Orders', role: 'CUSTOMER', release: 'MVP', summary: 'Order history, active tracking, and repeat order actions.' },
  { path: '/customer/profile', title: 'Customer Profile', role: 'CUSTOMER', release: 'MVP', summary: 'Saved addresses, profile management, and referral placeholder.' },
  { path: '/operations/orders', title: 'Operations Orders', role: 'OPERATIONS', release: 'MVP', summary: 'New orders, production stages, notes, and QC control.' },
  { path: '/driver/runs', title: 'Driver Run Sheet', role: 'DRIVER', release: 'MVP', summary: 'Assigned pickups, deliveries, and proof workflows.' },
  { path: '/admin/overview', title: 'Admin Overview', role: 'ADMIN', release: 'MVP', summary: 'Catalog, pricing, users, promotions, and core metrics.' },
  { path: '/roadmap/load-pass', title: 'LOAD Pass', role: 'CUSTOMER', release: 'ROADMAP', summary: 'Future subscription programme teaser.' },
  { path: '/roadmap/commercial', title: 'Commercial Accounts', role: 'ADMIN', release: 'ROADMAP', summary: 'Future B2B account management module.' },
  { path: '/roadmap/control-centre', title: 'Machine Control Centre', role: 'OPERATIONS', release: 'ROADMAP', summary: 'Future machine telemetry and control capability.' },
  { path: '/roadmap/crm', title: 'CRM', role: 'ADMIN', release: 'ROADMAP', summary: 'Future customer relationship workflows.' },
  { path: '/roadmap/multi-store', title: 'Multi-store & Franchise', role: 'ADMIN', release: 'ROADMAP', summary: 'Future network management and franchise tooling.' },
]

export const screenInventory: ScreenInventoryItem[] = [
  { role: 'PUBLIC', name: 'Landing / service discovery', purpose: 'Explain LOAD value, pricing entry points, and first-order offer.', priority: 'Now' },
  { role: 'PUBLIC', name: 'Authentication', purpose: 'Register and sign in entry point.', priority: 'Now' },
  { role: 'CUSTOMER', name: 'Customer home', purpose: 'Services, wallet, order status, quick reorder, and promos.', priority: 'Now' },
  { role: 'CUSTOMER', name: 'Booking flow', purpose: 'Service selection, basket/item pricing, add-ons, schedule, estimate.', priority: 'Now' },
  { role: 'CUSTOMER', name: 'Order tracking', purpose: 'Friendly timeline, delivery ETA, and proof moments.', priority: 'Now' },
  { role: 'CUSTOMER', name: 'Profile & loyalty', purpose: 'Addresses, rewards, and referral placeholder.', priority: 'Now' },
  { role: 'OPERATIONS', name: 'Production board', purpose: 'Order receipt, quantity review, internal notes, stage progression.', priority: 'Now' },
  { role: 'DRIVER', name: 'Assignment list', purpose: 'Pickup and delivery tasks, arrival, collection, and failure capture.', priority: 'Now' },
  { role: 'ADMIN', name: 'Admin catalogue', purpose: 'Services, categories, pricing, basket sizes, add-ons, and fees.', priority: 'Now' },
  { role: 'ADMIN', name: 'Promotions & loyalty rules', purpose: 'Revenue levers and reward configuration.', priority: 'Now' },
  { role: 'ADMIN', name: 'Operational metrics', purpose: 'Basic revenue and throughput reporting.', priority: 'Next' },
  { role: 'PUBLIC', name: 'Commercial enquiry', purpose: 'Lead capture for business laundry demand.', priority: 'Next' },
  { role: 'CUSTOMER', name: 'LOAD Pass teaser', purpose: 'Non-functional roadmap placeholder.', priority: 'Later' },
]

export const featureFolderStructure = [
  'src/app (providers, router, layouts, shared configuration)',
  'src/components (reusable UI building blocks)',
  'src/domain (typed business models, pricing, order status)',
  'src/features/customer (customer-facing screens and components)',
  'src/features/operations (production workflow screens)',
  'src/features/driver (driver route execution screens)',
  'src/features/admin (catalogue and reporting screens)',
  'src/features/foundation (product blueprint and planning views)',
  'src/services (service interfaces, API contracts, mock async services)',
  'src/utils (formatting and cross-cutting helpers)',
  'src/test (test setup and shared test utilities)',
]

export const designSystemSpecification: DesignSystemSection[] = [
  { title: 'Brand expression', values: ['Premium, modern, friendly, trustworthy', 'Blue-and-white palette with soft gradients and high contrast', 'Rounded panels and layered shadows to signal premium service'] },
  { title: 'Colour tokens', values: ['Primary: LOAD Blue 500 #338AFF', 'Surface: White / LOAD Blue 50', 'Text: Ink #0F172A with muted slate supporting tones'] },
  { title: 'Typography', values: ['Clear mobile-first hierarchy', 'Strong dashboard numerics for totals and statuses', 'Compact support text for operational metadata'] },
  { title: 'Interaction patterns', values: ['Card-first layout', 'Persistent quick actions', 'Visible loading, empty, success, and error states'] },
  { title: 'Layout system', values: ['Single app with role-based layouts', 'Responsive grid that collapses to stacked cards on mobile', 'Future-ready navigation slots for new LOAD OS modules'] },
]

export const eightWeekBacklog: BacklogWeek[] = [
  { week: 'Week 1', focus: 'Foundation', deliverables: ['Route map, screen inventory, design system, domain models', 'App shell, mock API contracts, base layouts, testing setup'] },
  { week: 'Week 2', focus: 'Public access and authentication', deliverables: ['Landing page, auth entry points, registration/login forms', 'Profile bootstrap and saved address basics'] },
  { week: 'Week 3', focus: 'Customer booking flow', deliverables: ['Service catalogue, basket pricing, item pricing, add-ons', 'Schedule pickup and delivery with estimated totals'] },
  { week: 'Week 4', focus: 'Customer order management', deliverables: ['Order placement confirmation, tracking timeline, order history', 'Quick reorder, promotions, loyalty previews, first-order offer'] },
  { week: 'Week 5', focus: 'Operations workflow', deliverables: ['New order intake, quantity review, notes, production-stage movement', 'Quality-control and ready-for-dispatch flows'] },
  { week: 'Week 6', focus: 'Driver workflows', deliverables: ['Assigned pickups and deliveries', 'Arrival, collection, delivery confirmation, proof capture, failure reasons'] },
  { week: 'Week 7', focus: 'Admin tools', deliverables: ['Service, pricing, basket, fee, promotion, loyalty, and user management skeletons', 'Basic operational and revenue metrics'] },
  { week: 'Week 8', focus: 'Launch readiness', deliverables: ['Responsive hardening, QA, accessibility pass, and content polish', 'Backend contract validation and production-release checklist'] },
]
