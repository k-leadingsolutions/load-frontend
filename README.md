# LOAD Frontend

Premium technology-enabled laundry and delivery MVP frontend for LOAD OS.

## Overview

This is a React + TypeScript single-page application that delivers the full customer-to-operations-to-driver order lifecycle for LOAD — a premium laundry pickup and delivery service. It models all key MVP workflows across five user roles entirely on mock services and seeded in-memory data, so no backend is required for local development.

**Roles covered:**

| Role | Purpose |
|---|---|
| PUBLIC | Marketing landing page and service discovery |
| CUSTOMER | Booking, order tracking, loyalty rewards, profile management |
| OPERATIONS | Production board — intake, staging, QC, and dispatch |
| DRIVER | Pickup/delivery run sheets, proof capture, and failure recording |
| ADMIN | Catalogue, pricing, promotions, user management, and metrics |

## Tech Stack

| Layer | Library / Tool |
|---|---|
| UI framework | React 19 |
| Language | TypeScript 6 |
| Bundler | Vite 8 |
| Styling | Tailwind CSS 3 |
| Routing | React Router 7 |
| Server state | TanStack React Query 5 |
| Forms & validation | React Hook Form 7 + Zod 4 |
| Testing | Vitest 4 + React Testing Library 16 |
| Linting | Oxlint |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Install dependencies

```bash
npm ci
```

### 2. Start the development server

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

### Production build

```bash
npm run build
```

Runs `tsc -b` (full TypeScript composite build) and outputs optimised assets to `dist/`.

### Preview the production build locally

```bash
npx vite preview
```

## Quality Commands

| Command | What it does |
|---|---|
| `npm run typecheck` | Full TypeScript type check (`tsc -b`) without emitting files |
| `npm run lint` | Run Oxlint across all source files |
| `npm run test` | Run all tests once with Vitest |
| `npm run test:watch` | Run tests in interactive watch mode |
| `npm run test:coverage` | Run tests and generate a V8 coverage report in `coverage/` |

## Authentication and Demo Data

All auth flows use in-memory mock data. The login form is pre-filled with the demo account:

- **Mobile number:** `+27 82 555 0142`
- **Password:** `Load@1234`
- **Email:** `thando.mokoena@load.co.za`

The demo customer (Thando Mokoena) is seeded with two addresses, a Silver loyalty tier, 1 240 loyalty points, 3 available rewards, and an R250 LOAD wallet balance.

You can also register additional mock customer accounts from `/register`. Registered accounts are stored in session memory and cleared on page reload.

**OTP verification:** In mock mode any 6-digit numeric code is accepted. The canonical test code is `123456`.

## Route Reference

### Public routes (no auth required)

| Path | Page |
|---|---|
| `/` | Brand landing — service overview, pricing entry points, commercial enquiry form |
| `/foundation` | MVP blueprint — screen inventory, 8-week backlog, design system spec, route map |
| `/roadmap/:moduleId` | Roadmap placeholder for future modules (load-pass, commercial, control-centre, crm, multi-store) |

### Auth routes (guest only — redirect to home if already signed in)

| Path | Page |
|---|---|
| `/auth/splash` | Animated splash / entry screen |
| `/auth/welcome` | Welcome screen with sign-in / register CTAs |
| `/login` | Sign in with mobile number or email + password |
| `/register` | New customer registration |
| `/auth/otp` | OTP verification after registration |
| `/auth/forgot-password` | Request password reset link |
| `/auth/reset-link-sent` | Confirmation that the reset email was sent |
| `/auth/set-new-password` | Set a new password (token flow) |
| `/auth/biometric` | Biometric login (mock) |
| `/auth/devices` | Manage trusted devices |

### Customer routes (requires sign-in)

| Path | Page |
|---|---|
| `/customer/home` | Dashboard — active orders, quick reorder, promotions, wallet summary |
| `/customer/booking` | Full booking flow — pricing model selection, service/basket/add-on selection, scheduling, live quote |
| `/customer/orders` | Order history with status timeline and repeat-order action |
| `/customer/invoice/:invoiceId` | Invoice detail with payment confirmation |
| `/customer/rewards` | Loyalty account, available rewards, and transaction history |
| `/customer/load-pass` | LOAD Pass roadmap teaser (non-functional placeholder) |
| `/customer/notifications` | In-app notifications with mark-as-read |

### Operations routes (no auth guard in MVP)

| Path | Page |
|---|---|
| `/operations/dashboard` | Metrics overview — orders, collections, dispatch readiness, payment status |
| `/operations/orders` | Production board — new order intake, quantity review, internal notes |
| `/operations/production` | Production stage view (reuses board with production filter) |
| `/operations/collections` | Collections and dispatch scheduling by status |
| `/operations/qc` | Quality-control view (reuses board with QC filter) |
| `/operations/reports` | Throughput and performance reporting (lightweight MVP placeholder) |
| `/operations/notifications` | Operations in-app notifications |

### Driver routes (no auth guard in MVP)

| Path | Page |
|---|---|
| `/driver/dashboard` | Today's route summary — stop count, order count, completed stops, next stop |
| `/driver/route` | Full route list with ETA, distance, and stop status |
| `/driver/runs` | Assignment list — arrival, collection, delivery confirmation, proof capture, failure recording |
| `/driver/notifications` | Driver in-app notifications |
| `/driver/profile` | Driver profile |

### Admin routes

| Path | Page |
|---|---|
| `/admin/overview` | Catalogue management, pricing, basket sizes, add-ons, promotions, loyalty rules, user management, operational metrics, roadmap placeholders |

## Order Lifecycle

Orders flow through 24 statuses grouped into five stages:

```
BOOKING  →  PICKUP  →  PRODUCTION  →  DELIVERY  →  CLOSED
```

**Full status sequence:**

```
BOOKING_RECEIVED → PICKUP_SCHEDULED → DRIVER_ASSIGNED → DRIVER_EN_ROUTE
→ DRIVER_ARRIVED → COLLECTION_VERIFIED → COLLECTED → WEIGHT_CONFIRMED
→ AWAITING_PAYMENT → PAYMENT_CONFIRMED → RECEIVED_AT_STORE
→ SORTING → WASHING → DRYING → IRONING → QUALITY_CHECK → PACKING
→ READY_FOR_DISPATCH → DELIVERY_SCHEDULED → OUT_FOR_DELIVERY
→ DELIVERED → COMPLETED
(terminal: RESCHEDULED | CANCELLED)
```

The status model lives in `src/domain/orderStatus.ts` and maps each status to a customer-friendly label, an internal label, a description, and a stage.

## Pricing Models

The booking flow supports three pricing models, selectable per order:

| Model | Description |
|---|---|
| `PER_BASKET` | Fixed price per basket size (Small / Medium / Large / XL) |
| `PER_ITEM` | Itemised price per individual service (e.g. shirts, trousers, duvets) |
| `PER_KILOGRAM` | Price per kg — weight confirmed at collection; final amount invoiced after weighing |

All models support add-ons (e.g. express processing, fabric softener), promotion codes, and loyalty point redemption. Free delivery is applied automatically on orders over R300.

## Mock Service Architecture

All data is served from typed in-memory stores — no network requests are made. The service layer is structured in three layers:

```
src/services/
  contracts.ts        # Request/response type definitions (LoginRequest, PlaceOrderRequest, etc.)
  interfaces.ts       # TypeScript interfaces for each service (AuthService, CatalogueService, etc.)
  mock/
    data.ts           # Seed data — customer profile, catalogue, basket sizes, promotions, loyalty rules
    orderStore.ts     # In-memory order list (supports prepend, get, list by customer)
    operationsStore.ts# In-memory production order list with stage-advance logic
    driverStore.ts    # In-memory driver assignment list with status mutations
    sessionStore.ts   # Active customer session (used by the booking quote to read loyalty state)
    extendedMocks.ts  # Extended services: loyalty, notifications, invoices, POS, routes, verification, weight, events, coffee
    mockApi.ts        # successResponse / errorResponse helpers with simulated async delay
    index.ts          # Assembles and exports all mock service instances
```

**Available mock services:**

| Export | Interface |
|---|---|
| `mockAuthService` | Login, register, OTP send/verify, forgot/reset password, biometric login |
| `mockCatalogueService` | Service catalogue, add-ons, basket sizes, promotions, loyalty rules, live quote |
| `mockCustomerOrderService` | Place order, list orders, get order |
| `mockOperationsService` | List production orders, confirm received, quantity review, notes, stage advance, QC, price adjustment, metrics |
| `mockDriverService` | List assignments, confirm arrival/collection/delivery, record failure, get route, capture weight, reschedule, stop verification |
| `mockAdminService` | Dashboard metrics |
| `mockLoyaltyService` | Loyalty account, rewards catalogue, transaction history, redeem reward |
| `mockNotificationService` | List notifications by role, mark as read, mark all read |
| `mockInvoiceService` | Get invoice by ID |
| `mockPosService` | Confirm payment |
| `mockRouteService` | Get driver route with stops and ETAs |
| `mockVerificationService` | Init and submit stop verification (OTP / signature) |
| `mockWeightPricingService` | Confirm measured weight and recalculate price |
| `mockDomainEventService` | Emit and subscribe to domain events (DRIVER_ASSIGNED, ORDER_COLLECTED, DELIVERY_COMPLETED, etc.) |
| `mockCoffeeService` | Coffee add-on catalogue (used on the customer home screen) |

To extend mock data, edit `src/services/mock/data.ts`. To add a new service, create an interface in `src/services/interfaces.ts`, implement it in `src/services/mock/extendedMocks.ts` or `index.ts`, and export it from `src/services/mock/index.ts`.

## Project Structure

```text
src/
  app/
    config/          # productBlueprint.ts — screen inventory, backlog, design system spec, route map
    layouts/         # PublicLayout, RoleLayout (role-specific nav and shell)
    providers/       # AppProviders, AuthProvider, AuthContext, useAuth hook
    router/          # AppRouter, route path constants, GuestOnlyRoute, RequireCustomerAuth guards
  components/
    ui/              # Badge, EmptyState, ErrorState, LoadingState, SectionCard
  domain/
    models/          # TypeScript models: customer, order, pricing, loyalty, notification, route, service, admin, verification, weight, events
    api.ts           # ApiResponse<T> wrapper type
    orderStatus.ts   # ORDER_STATUS_SEQUENCE, ORDER_STATUS_MODEL, getFriendlyOrderStatus
  features/
    auth/            # Splash, Welcome, Login, Register, OTP, ForgotPassword, ResetLinkSent, SetNewPassword, Biometric, ManageDevices
    customer/        # Home, Booking, Orders, Invoice, Rewards, LoadPass, Notifications, Profile
    operations/      # Dashboard, Board (orders/production/QC), Collections, Reports, Notifications
    driver/          # Dashboard, Route, Assignments, Notifications, Profile
    admin/           # Overview (catalogue, pricing, promotions, users, metrics)
    foundation/      # LandingPage, FoundationPage (blueprint view)
    shared/          # NotFoundPage, RoadmapPlaceholderPage
  services/          # See Mock Service Architecture above
  test/
    setup.ts         # Vitest + jsdom + Testing Library setup
  utils/
    format.ts        # formatCurrency, formatPoints, and date/label helpers
  index.css          # Global styles and Tailwind base
  main.tsx           # React root mount
  App.tsx            # AppProviders + AppRouter entry
```

## Design System

Styling is implemented via Tailwind CSS using custom LOAD design tokens defined in `tailwind.config.js`.

### Colour tokens

| Token | Value | Usage |
|---|---|---|
| `load-500` | `#2d87d4` | Primary brand blue — buttons, links, accents |
| `load-50` to `load-900` | Sky-blue scale | Surfaces, borders, gradients |
| `load-bg` | `#f4f9ff` | Page background |
| `card-border` | `#ddeeff` | Card and panel borders |
| `ink` | `#0f172a` | Primary text |
| `muted` | `#64748b` | Secondary / supporting text |
| `status-success` | `#22c55e` | Positive status indicators |
| `status-warning` | `#f59e0b` | Warning states |
| `status-error` | `#ef4444` | Error states |
| `status-info` | `#2d87d4` | Informational states |

### Typography scale

| Class | Size | Weight | Usage |
|---|---|---|---|
| `text-display` | 2rem / 700 | Bold | Hero headings |
| `text-heading` | 1.5rem / 600 | Semibold | Section titles |
| `text-title` | 1.125rem / 600 | Semibold | Card titles |
| `text-body` | 0.875rem | Regular | Body copy |
| `text-caption` | 0.75rem | Regular | Labels and metadata |
| `text-label` | 0.6875rem / 600 | Semibold uppercase | Tag labels |

### Border radius and shape

| Token | Value | Usage |
|---|---|---|
| `rounded-panel` | 1.5rem | Outer cards and containers |
| `rounded-card` | 1rem | Inner cards |
| `rounded-pill` | 9999px | Buttons and badges |

## Path Aliases

The project uses a `@/` alias pointing to `src/`. This is configured in both `vite.config.ts` and `tsconfig.app.json`:

```ts
// e.g.
import { useAuth } from '@/app/providers/useAuth'
import { formatCurrency } from '@/utils/format'
```

No additional setup is needed; the alias is resolved automatically by Vite and TypeScript.

## Adding a New Screen

1. Create the page component in the relevant `src/features/<role>/pages/` directory.
2. Add the route path to `src/app/router/paths.ts`.
3. Register the route in `src/app/router/AppRouter.tsx` under the appropriate role layout.
4. If a new mock service method is needed, add it to `src/services/interfaces.ts` and implement it in `src/services/mock/`.
5. Add a test file alongside the page component following the existing `*.test.tsx` pattern.

## Notes

- This repository is frontend-focused and runs entirely on mock services. No backend, database, or network connection is required.
- All mock service calls include a simulated async delay to replicate real network latency.
- Domain events (`DRIVER_ASSIGNED`, `ORDER_COLLECTED`, `DELIVERY_COMPLETED`, etc.) are emitted via `mockDomainEventService` to keep role state consistent across the mock layer.
- Roadmap modules (`/roadmap/:moduleId`) are intentionally non-functional and render a placeholder to signal future scope without increasing MVP build complexity.
