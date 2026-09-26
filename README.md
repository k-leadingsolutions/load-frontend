# LOAD — Laundry On-Demand

LOAD is a premium, technology-enabled laundry pickup-and-delivery product. This
repository contains the full MVP: a React/TypeScript single-page frontend and
a Java 21/Spring Boot backend, backed by PostgreSQL.

This document describes the **current, verified implementation** — not a
roadmap or aspiration. Where a capability is still mocked/simulated rather
than backed by a real external system, it is explicitly labelled **MOCKED /
DEFERRED**.

> Backend is Java 21 + Spring Boot. TypeScript is used only in the frontend.

## Contents

- [Product overview](#product-overview)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Roles and capabilities](#roles-and-capabilities)
- [Order lifecycle](#order-lifecycle)
- [Auth and security model](#auth-and-security-model)
- [Invoice, payment and POS architecture](#invoice-payment-and-pos-architecture)
- [OTP verification architecture](#otp-verification-architecture)
- [Role isolation](#role-isolation)
- [Local setup and run instructions](#local-setup-and-run-instructions)
- [Environment variables](#environment-variables)
- [Build and test commands](#build-and-test-commands)
- [Docker and production configuration](#docker-and-production-configuration)
- [CI](#ci)
- [API / OpenAPI access](#api--openapi-access)
- [Current test status](#current-test-status)
- [External integrations: mocked vs pending](#external-integrations-mocked-vs-pending)
- [Demo guide](#demo-guide)

## Product overview

LOAD's MVP covers the full journey of a laundry order across four roles:

| Role | Purpose |
|---|---|
| **CUSTOMER** | Registers, books a laundry order (delivery or in-store collection), pays, tracks status |
| **DRIVER** | Executes pickup and delivery stops, with OTP-verified proof of collection/delivery |
| **OPS_STAFF** (`OPERATIONS`) | Runs the store side: intake, production stages, quality control, driver assignment, dispatch |
| **OPS_ADMIN** (`ADMIN`) | Same operational capabilities as `OPS_STAFF`, reserved for future admin-only extensions |

A fulfilment order can be one of two types:

- **DELIVERY** — LOAD collects from the customer and delivers back to them.
- **STORE_COLLECTION** — LOAD collects from the customer, and the customer
  collects the finished order from the store (no return delivery leg).

The commercial invoice total is never computed or guessed by LOAD — it is
always read from the store's point-of-sale (POS) system once the POS side of
the transaction is finalised. See
[Invoice, payment and POS architecture](#invoice-payment-and-pos-architecture).

## Architecture

```
┌───────────────────────────────┐   JSON over HTTPS   ┌───────────────────────────────┐
│ Frontend (repo root, src/)    │ ──────────────────────────────▶ │ Backend (backend/)            │
│ React 19 + TypeScript, Vite,  │ ◀────────────────────────────── │ Java 21 + Spring Boot 3        │
│ Tailwind, React Router,       │                                 │ Spring Security (stateless JWT)│
│ TanStack Query, RHF + Zod     │                                 │ Spring Data JPA + Flyway        │
└───────────────────────────────┘                                 └───────────────┬────────────────┘
                                                                                    │ JDBC
                                                                                    ▼
                                                                     ┌───────────────────────────────┐
                                                                     │ PostgreSQL 16                  │
                                                                     └───────────────────────────────┘
```

- The frontend is a single Vite/React SPA that talks to the backend over a
  typed `fetch` wrapper (`src/services/api/httpClient.ts`), attaching a
  `Bearer` JWT per role realm (Customer / Driver / Operations — see
  [Auth and security model](#auth-and-security-model)).
- The backend is a single Spring Boot application (module: `backend/`)
  exposing versionless REST endpoints under `/api/**`, secured with stateless
  JWT bearer authentication and role-based authorization
  (`hasRole(...)`/`hasAnyRole(...)` in `SecurityConfig`).
- The backend is the **sole authority** for business rules, ownership, and
  authorization. Frontend route guards are UX/defence-in-depth only (see
  [Role isolation](#role-isolation)) — every guard component's own doc
  comment states this explicitly.
- Persistence is PostgreSQL via Spring Data JPA, with schema managed entirely
  by Flyway migrations (`backend/src/main/resources/db/migration/`).
- Three narrow external-provider boundaries exist as interfaces
  (`PosReadPort`, `PaymentProvider`, `OtpDeliveryPort`) with **mock/dev
  implementations only** — see
  [External integrations: mocked vs pending](#external-integrations-mocked-vs-pending).

**IMPLEMENTED:** Customer registration/login, address management, booking,
Driver pickup/delivery workflow with OTP verification, Operations intake →
production → QC → dispatch workflow, invoice refresh from POS (mock adapter),
customer payment (mock provider), and the full order-status state machine
through to `COMPLETED`, all wired end-to-end between frontend and backend and
covered by integration tests.

**MOCKED / DEFERRED:** the concrete POS, payment gateway and SMS providers
behind those three interfaces; several Customer-side screens (rewards/loyalty,
notifications, coffee add-on) that still run on frontend-only mock data with
no corresponding backend endpoint yet; the Admin role's dedicated screens.

## Repository structure

```text
.
├── README.md                    # This file — product, architecture, frontend + demo guide
├── backend/README.md            # Backend-specific setup, API, domain, testing reference
├── Dockerfile                    # Frontend production image (multi-stage: Vite build → nginx)
├── nginx.conf                    # Frontend static-serving + SPA fallback config
├── .github/workflows/ci.yml      # CI: frontend build/test + backend build/test, run independently
├── src/                           # Frontend source (see "Frontend structure" below)
├── backend/
│   ├── Dockerfile                # Backend production image (multi-stage: Maven build → JRE runtime)
│   ├── docker-compose.yml        # Local PostgreSQL only (backend/frontend run separately)
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/load/backend/   # See backend/README.md for full package breakdown
│       └── main/resources/
│           ├── application.yml           # Dev-friendly defaults (local Postgres, dev JWT secret)
│           ├── application-prod.yml      # No-default, fail-fast production overrides
│           └── db/migration/             # Flyway migrations (V1__init.sql, V2__...)
└── ...
```

### Frontend structure

```text
src/
  app/
    layouts/         # PublicLayout, RoleLayout (per-role nav shell)
    providers/       # AppProviders; independent Customer/Driver/Operations auth stacks
    router/          # AppRouter, route path constants, per-role route guards
    config/          # productBlueprint.ts (screen inventory / historical planning artefact)
  components/ui/     # Badge, EmptyState, ErrorState, LoadingState, SectionCard
  domain/
    models/          # TypeScript domain models (order, customer, route, admin, etc.)
    orderStatus.ts   # ORDER_STATUS_SEQUENCE, ORDER_STATUS_MODEL, getFriendlyOrderStatus
  features/
    auth/            # Splash, Welcome, Login, Register, OTP, password reset, biometric (mock)
    customer/        # Home, Services, Booking, Orders, Invoice, Rewards (mock), Notifications (mock)
    operations/      # Dashboard, Board (intake/production/QC), Collections/Dispatch, Reports
    driver/          # Dashboard, Route, Assignments (arrive/verify/collect/deliver/fail), Profile
    admin/           # Overview (catalogue/pricing/promotions) — MOCKED, no backend endpoints
    foundation/      # Public landing page + historical MVP blueprint viewer
    shared/          # NotFoundPage, UnauthorizedPage, RoadmapPlaceholderPage
  services/
    api/             # Real backend HTTP clients — httpClient, tokenStore, per-domain services
    mock/            # In-memory mock services still used by non-backend-integrated screens
    pos/             # Frontend-side mock POS read service (used only where the backend isn't wired yet)
  test/setup.ts       # Vitest + jsdom + Testing Library setup
  utils/format.ts     # formatCurrency, formatPoints, date/label helpers
```

Every page/component under `src/features/customer/**` only imports from
`customer/` and `shared/`; the same isolation holds for `driver/**` and
`operations/**` — no cross-role imports exist between these three feature
folders.

See **[backend/README.md](backend/README.md)** for the backend's package
structure, full API reference, and domain model.

## Roles and capabilities

### CUSTOMER

- Register (`/register`) and log in (`/login`) — real backend accounts (email
  + password), JWT-based session.
- Manage delivery/collection addresses (`/api/customer/addresses`).
- Book an order (`/customer/booking`, reached from `/customer/services`),
  choosing `DELIVERY` or `STORE_COLLECTION` fulfilment, pickup/delivery
  address and window, and services.
- View order history and live status (`/customer/orders`,
  `/customer/invoice/:invoiceId`) — real backend data.
- Pay an order's invoice once it is `READY` (`/customer/invoice/:invoiceId/pay`)
  — real backend payment flow, amount always the POS-confirmed total.
- Rate a driver after delivery (`/customer/orders/:orderId/rate`) — **MOCKED**,
  no backend endpoint yet.
- Rewards/loyalty, notifications, and the coffee add-on catalogue —
  **MOCKED**, frontend-only in-memory data, no backend endpoint yet.

### DRIVER

- Independent login (`/driver/login`) — real backend account, separate JWT
  realm from Customer.
- View assigned stops (`/api/driver/assignments`) — a driver can only ever see
  and act on their own assignments (enforced server-side).
- Execute the stop lifecycle: `en-route` → `arrive` (triggers OTP delivery) →
  `verify` (submits the OTP) → `collect` (PICKUP stop) or `deliver` (DELIVERY
  stop).
- Report a failed stop (`fail`) or request a reschedule
  (`reschedule-request`).
- Driver notifications/profile screens — **MOCKED**, no backend endpoint yet.

### OPS_STAFF / OPS_ADMIN (`OPERATIONS` / `ADMIN` roles)

- Independent login (`/operations/login`) — real backend account, separate
  JWT realm; `OPERATIONS` and `ADMIN` roles both pass the Operations route
  guard and both satisfy `hasAnyRole("OPERATIONS", "ADMIN")` on the backend.
- View all orders and production metrics (`GET /api/operations/orders`,
  `/metrics`, `/assignments`).
- Confirm store receipt of a collected order (`store-received`), record
  intake weight/notes (`store-intake`), run quantity review
  (`quantity-review`) and internal notes (`notes`).
- Advance production stages (`advance-production`) through
  `SORTING → WASHING → DRYING → IRONING → QUALITY_CHECK → PACKING →
  READY_FOR_DISPATCH`, with a dedicated pass/fail quality-check step
  (`quality-check`).
- Refresh the invoice from POS (`refresh-invoice`) — this is the **only** path
  that ever sets `invoiceStatus = READY` and populates `finalInvoiceTotal`;
  the total always comes from the POS read adapter, never a LOAD-side
  calculation.
- Assign a driver to a PICKUP or DELIVERY stop (`assign-driver`).
- Dispatch a `DELIVERY` order (`dispatch`) — blocked (`409 CONFLICT`) unless
  `invoiceStatus == READY` **and** `paymentStatus == CONFIRMED`.
- Complete a `STORE_COLLECTION` order (`complete-store-collection`) — blocked
  unless `invoiceStatus == READY` (no payment gate; the customer pays in
  store).
- Retry a failed stop or decide a reschedule request
  (`assignments/{id}/retry`, `assignments/{id}/reschedule-decision`).
- Operations can **never** write to POS or override a commercial price — the
  legacy "adjust price" capability was removed; store intake now only records
  a non-price-affecting weight/notes observation.

## Order lifecycle

`Order.status` (backend: `com.load.backend.order.OrderStatus`) is
**deliberately independent** from `invoiceStatus` (`NOT_AVAILABLE`/`READY`)
and `paymentStatus` (`NOT_REQUIRED`/`PENDING`/`CONFIRMED`/`FAILED`/`REFUNDED`)
— these three are never merged into one status field.

### DELIVERY lifecycle (full round trip)

```
BOOKING_RECEIVED
  → DRIVER_ASSIGNED (Ops assigns driver to PICKUP stop)
  → DRIVER_EN_ROUTE → DRIVER_ARRIVED (OTP sent) → COLLECTION_VERIFIED (OTP verified) → COLLECTED
  → RECEIVED_AT_STORE (Ops confirms store receipt)
  → SORTING → WASHING → DRYING → IRONING → QUALITY_CHECK → PACKING → READY_FOR_DISPATCH
      (Ops advances production stage-by-stage; QUALITY_CHECK has a dedicated pass/fail endpoint)
  ── dispatch is BLOCKED here until invoiceStatus=READY AND paymentStatus=CONFIRMED ──
  → [Ops: refresh-invoice from POS]  → [Customer: pay]
  → OUT_FOR_DELIVERY (Ops dispatches)
  → (Ops assigns driver to DELIVERY stop) → DRIVER_EN_ROUTE → DRIVER_ARRIVED (2nd OTP sent)
      → COLLECTION_VERIFIED-equivalent (verified) → DELIVERED
  → COMPLETED (set automatically when the Driver confirms delivery on an
      OUT_FOR_DELIVERY order — see `DriverService.confirmDelivery` /
      `completeDeliveryOrderIfEligible`)
```

This full path — including the dispatch gate and the final `COMPLETED`
transition — is proven end-to-end by
`backend/src/test/java/com/load/backend/order/DeliveryLifecycleE2ETest.java`,
which drives it entirely through real HTTP calls to real endpoints.

### STORE_COLLECTION flow

```
BOOKING_RECEIVED
  → DRIVER_ASSIGNED → DRIVER_EN_ROUTE → DRIVER_ARRIVED (OTP sent) → COLLECTION_VERIFIED → COLLECTED
  → RECEIVED_AT_STORE → SORTING → WASHING → DRYING → IRONING → QUALITY_CHECK → PACKING
      → READY_FOR_DISPATCH
  ── completion is BLOCKED here until invoiceStatus=READY (no payment gate — customer pays in store) ──
  → [Ops: refresh-invoice from POS] → [Ops: complete-store-collection] → COMPLETED
```

`STORE_COLLECTION` orders never have a delivery address/window (enforced by a
database `CHECK` constraint in `V1__init.sql`) and never carry a second,
delivery-side Driver stop.

Terminal/alternate states: `RESCHEDULED`, `CANCELLED` (driver-reported failure
and reschedule flows use `DriverAssignment.stopStatus =
FAILED`/`RESCHEDULE_REQUESTED`, resolved by Operations via `retry` or
`reschedule-decision`).

## Auth and security model

- **Stateless bearer-JWT authentication.** `SessionCreationPolicy.STATELESS` —
  no server-side session, no cookies. Every authenticated request must carry
  a valid JSON Web Token in the `Authorization` request header, using the
  standard `Bearer` auth scheme. See
  `backend/src/main/java/com/load/backend/config/SecurityConfig.java`.
- **Passwords** are stored as BCrypt hashes only (`PasswordEncoder` bean).
- **Four backend roles** (`com.load.backend.auth.Role`): `CUSTOMER`, `DRIVER`,
  `OPERATIONS`, `ADMIN`. Registration only self-serves `CUSTOMER` accounts
  (`POST /api/auth/register/customer`); `DRIVER`/`OPERATIONS`/`ADMIN` accounts
  are provisioned out-of-band (no public self-registration endpoint exists —
  by design).
- **Path-based, role-based authorization is enforced on the backend**, not
  just the frontend:

  | Path prefix | Required role(s) |
  |---|---|
  | `/api/auth/**` | none (public) |
  | `/actuator/health`, `/v3/api-docs/**`, `/swagger-ui/**` | none (public) |
  | `/api/customer/**` | `CUSTOMER` |
  | `/api/driver/**` | `DRIVER` |
  | `/api/operations/**` | `OPERATIONS` or `ADMIN` |
  | `/api/admin/**` | `ADMIN` |
  | anything else | any authenticated user |

- **Ownership is enforced independently of role**, at the service layer, from
  the authenticated principal — never from a client-supplied ID:
  - A Customer can only ever see/act on their own orders/addresses
    (`BookingService`'s "owned or not-found" pattern — an unrelated
    customer's order lookup returns `404`, not `403`, to avoid leaking
    existence).
  - A Driver can only ever see/act on assignments linked to their own
    `Driver` record (`DriverService.getOwnedAssignment` — cross-driver access
    returns `403`).
- **CORS** is an explicit origin allow-list (`load.security.cors.allowed-origins`),
  defaulting to the local Vite dev ports; production requires this to be set
  explicitly with no fallback (see `application-prod.yml`).
- **CSRF protection is intentionally disabled.** This is a reviewed decision,
  not an oversight: the API is 100% stateless bearer-token auth with no
  `HttpSession`/cookie use anywhere, so there is no ambient browser credential
  for a forged cross-site request to exploit. See the rationale comment in
  `SecurityConfig` if this is ever revisited (e.g. if cookie-based
  sessions/refresh tokens are introduced).
- **Frontend route guards** (`RequireCustomerAuth`, `RequireDriverRole`,
  `RequireOperationsRole`, `RequireRole`) exist purely for UX and
  defence-in-depth. Every guard's own doc comment states that the backend
  remains the authoritative source of truth for authorization — a client
  cannot grant itself access by manipulating local state, route names, or
  hidden UI.

## Invoice, payment and POS architecture

- **POS is the single source of financial truth**, and is **read-only** from
  LOAD's perspective. `PosReadPort` (backend interface,
  `com.load.backend.pos`) has **no mutation method at all** — enforced by a
  reflection-based deny-list test (`PosReadPortContractTest`). LOAD never
  creates, updates, or confirms a POS order/invoice/payment, and never
  fabricates or estimates a final invoice total.
- **`estimatedTotal`** (set at booking time by the customer's service
  selections) is a customer-facing estimate only — it is never treated as the
  billable amount.
- **`finalInvoiceTotal`** only ever becomes populated, and `invoiceStatus`
  only ever transitions `NOT_AVAILABLE → READY`, through
  `POST /api/operations/orders/{orderId}/refresh-invoice`
  (`InvoiceService.refreshInvoice`), which reads the authoritative record from
  `PosReadPort` and copies it verbatim onto the order. No other code path
  writes to either field.
- **Payment** (`POST /api/customer/orders/{orderId}/payments`) always charges
  `order.getFinalInvoiceTotal()` — the POS-confirmed amount — never the
  booking-time estimate. Payment requires `invoiceStatus == READY` and is
  rejected if already paid.
- **Dispatch/completion gating** (`DispatchEligibilityService`):
  - `DELIVERY` orders: dispatch requires `invoiceStatus == READY` **and**
    `paymentStatus == CONFIRMED`.
  - `STORE_COLLECTION` orders: completion requires only
    `invoiceStatus == READY` (the customer settles in-store, so no
    LOAD-side payment confirmation is required first).
- Both the concrete POS read adapter (`MockPosReadAdapter`) and the concrete
  payment provider (`MockPaymentProvider`) are **mock/dev implementations**,
  restricted to non-production Spring profiles (`@Profile("!prod")`). Because
  both interfaces are required (non-optional) constructor dependencies of
  `InvoiceService`/`PaymentService`, a `prod`-profile boot with no real
  provider bean configured **fails fast at startup** rather than silently
  running with mock behaviour — proven by
  `backend/src/test/java/com/load/backend/support/MockProviderAdapterProfileTest.java`.

## OTP verification architecture

- A Driver's `arrive` action (both for the PICKUP and the DELIVERY stop)
  generates a fresh 6-digit numeric OTP server-side.
- Only the BCrypt **hash** of the OTP is persisted
  (`DriverAssignment.verificationCodeHash`) — the plaintext code is never
  stored.
- The plaintext code is delivered exclusively through `OtpDeliveryPort`
  (backend interface, `com.load.backend.notification`) to the customer's
  mobile number (resolved server-side from the order's owning customer
  profile, never client-supplied).
- **The plaintext OTP is never returned in any HTTP response** — the
  `arrive` endpoint returns only the assignment's state
  (`AssignmentResponse`), with no code field.
- `OtpDeliveryPort`'s contract explicitly forbids a read-back method in
  production use — any observability of a delivered code exists only as a
  dev/test-only seam on the concrete adapter, never part of the interface.
- The concrete implementation, `InMemoryOtpDeliveryPort`, is a **mock/dev
  adapter only** (no real SMS provider integrated), restricted to
  non-production profiles the same way as the POS/payment mocks above.
- The Driver's `verify` action checks the submitted code against the stored
  hash; a correct code transitions the stop to `VERIFIED`, which is the
  single source of truth gating `collect`/`deliver` (a stale/failed
  verification state cannot be bypassed).

## Role isolation

- Each of the three backend-integrated roles (Customer, Driver, Operations)
  has its **own independent auth stack** on the frontend
  (`AuthProvider`/`useAuth`, `DriverAuthProvider`/`useDriverAuth`,
  `OperationsAuthProvider`/`useOperationsAuth`), each with its own token
  storage realm and its own login page/route guard. None of these share
  session state.
- Each backend-integrated role's feature folder
  (`src/features/{customer,driver,operations}/**`) imports only from its own
  folder and `shared/` — there is no cross-role component/page import.
- Route guards enforce role at the router level:
  - `/customer/**` → `RequireCustomerAuth` (any authenticated Customer)
  - `/driver/**` → `RequireDriverRole` (must be `DRIVER`)
  - `/operations/**` → `RequireOperationsRole` (must be `OPERATIONS` or
    `ADMIN`)
  - `/admin/**` → `RequireRole(['ADMIN'])`
- An authenticated Customer session grants **no** access to Driver or
  Operations routes (and vice versa) — each guard checks its own realm's auth
  state and role, redirecting to that role's own login page (or
  `/unauthorized` for the generic `RequireRole` guard) otherwise.
- The backend independently re-enforces every one of these boundaries per
  request via `SecurityConfig`'s path/role matchers — the frontend guards are
  UX only and cannot be relied upon (or bypassed) to grant real access.

## Local setup and run instructions

### Prerequisites

- Node.js 20+ and npm 10+ (frontend)
- Java 21 and Maven (backend) — `JAVA_HOME` must point at a JDK 21
  installation
- Docker (for local PostgreSQL, or any PostgreSQL 16 instance you already
  have)

### 1. Start PostgreSQL

```bash
cd backend
docker compose up -d
```

This starts a local `postgres:16-alpine` container (database/user/password
all `load`) on port `5432`. Flyway runs automatically on backend startup and
creates the schema — no manual migration step is needed.

### 2. Run the backend

```bash
cd backend
mvn spring-boot:run
```

The backend listens on `http://localhost:8080` and uses the dev-friendly
defaults in `application.yml` (local Postgres, a local-only JWT secret, CORS
allowing the Vite dev ports). See [Environment variables](#environment-variables)
to override any of these.

### 3. Run the frontend

```bash
npm ci
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`). The
frontend targets `http://localhost:8080` by default (`VITE_API_BASE_URL`, see
below).

### 4. Register and try it out

See the [Demo guide](#demo-guide) below for the fastest way to exercise the
full lifecycle.

## Environment variables

### Frontend (Vite — must be set at *build* time, prefixed `VITE_`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Base URL of the Spring Boot backend the SPA calls |

### Backend (Spring Boot — runtime environment variables)

| Variable | Dev default (`application.yml`) | Production (`application-prod.yml`) |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/load` | **required, no default** |
| `DB_USERNAME` | `load` | **required, no default** |
| `DB_PASSWORD` | `load` | **required, no default** |
| `JWT_SECRET` | a committed local-dev-only value | **required, no default** — never reuse the dev value |
| `JWT_EXPIRY_SECONDS` | `3600` | `3600` (overridable) |
| `CORS_ALLOWED_ORIGINS` | n/a (dev default is a hardcoded localhost list) | **required, no default** — comma-separated production origin(s) |
| `SPRING_PROFILES_ACTIVE` | unset (default profile) | `prod` — activates `application-prod.yml` and disables the mock provider adapters |

Production intentionally has **no defaults** for the secrets/connection
variables above: a missing value causes the application to fail fast at
startup rather than silently running with an insecure or wrong value. Never
commit real values for these into source control.

## Build and test commands

### Frontend

| Command | What it does |
|---|---|
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Full TypeScript build (`tsc -b`) + production Vite build to `dist/` |
| `npm run typecheck` | Type-check only, no emit (`tsc -b --pretty false`) |
| `npm run lint` | Run Oxlint across all source files |
| `npm test` | Run all frontend tests once with Vitest |
| `npm run test:watch` | Run tests in interactive watch mode |
| `npm run test:coverage` | Run tests and generate a V8 coverage report in `coverage/` |

### Backend

Run from `backend/`:

| Command | What it does |
|---|---|
| `mvn clean verify` | Full build + all backend tests (unit + Testcontainers-backed integration tests) |
| `mvn spring-boot:run` | Run the backend locally |
| `mvn -Dtest=<ClassName> test` | Run a single test class |

Backend integration tests require Docker (Testcontainers spins up a real
PostgreSQL 16 container per test run).

## Docker and production configuration

- **Frontend image** (`Dockerfile`, repo root): multi-stage build — `npm ci`
  + `npm run build` in a `node:22-alpine` build stage, then the static
  `dist/` output is served by `nginx:1.27-alpine` (config: `nginx.conf`) on
  port `8080`, with SPA fallback routing and a container `HEALTHCHECK`.
  `VITE_API_BASE_URL` must be supplied as a Docker **build arg** (Vite inlines
  `VITE_*` vars at build time, not runtime).
- **Backend image** (`backend/Dockerfile`): multi-stage build —
  `maven:3.9-eclipse-temurin-21` compiles and packages the jar, then
  `eclipse-temurin:21-jre-alpine` runs it as a non-root user on port `8080`,
  with a container `HEALTHCHECK` against `/actuator/health`.
- **`backend/docker-compose.yml`** provisions PostgreSQL only, for local
  development — it does not orchestrate the frontend/backend containers
  together. There is no repo-root docker-compose file that runs the whole
  stack; frontend and backend are built/run as independent images/processes.
- **Production profile** (`SPRING_PROFILES_ACTIVE=prod`, backed by
  `application-prod.yml`):
  - No default database credentials, JWT secret, or CORS origins — the
    process refuses to start without them explicitly set.
  - Swagger UI and the OpenAPI JSON endpoint are disabled
    (`springdoc.swagger-ui.enabled=false`, `springdoc.api-docs.enabled=false`).
  - Actuator health details are hidden (`show-details: never`).
  - The three mock provider adapters (`MockPosReadAdapter`,
    `MockPaymentProvider`, `InMemoryOtpDeliveryPort`) are excluded via
    `@Profile("!prod")` — startup fails fast if no real provider
    implementation is supplied for `PosReadPort`/`PaymentProvider`/
    `OtpDeliveryPort` under this profile (see
    [External integrations: mocked vs pending](#external-integrations-mocked-vs-pending)).

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull
request, with two independent jobs:

- **`frontend`** — Node 22, `npm ci` → `npm run typecheck` → `npm run lint` →
  `npm test`.
- **`backend`** — Java 21 (Temurin), working directory `backend/`,
  `mvn -B clean verify` (includes Testcontainers-backed integration tests).

## API / OpenAPI access

The backend exposes an interactive OpenAPI/Swagger UI **in non-production
profiles only**:

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Raw OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Both are explicitly disabled under the `prod` profile
(`springdoc.swagger-ui.enabled=false`, `springdoc.api-docs.enabled=false` in
`application-prod.yml`) and are not exposed in a production deployment.

See **[backend/README.md](backend/README.md)** for the full endpoint
reference grouped by controller.

## Current test status

Both suites currently pass in full, verified as part of this documentation
audit:

| Suite | Result |
|---|---|
| Backend (`mvn clean verify`, from `backend/`) | **62 / 62 tests passing**, 0 failures, 0 errors |
| Frontend (`npm test`) | **133 / 133 tests passing** across 26 test files |
| Frontend type check (`npm run typecheck`) | passes with no errors |

Backend coverage includes: authentication/role isolation
(`ProductionSecurityTest`, `RoleIsolationTest`), booking
(`BookingFlowTest`), the full Driver assignment/OTP flow
(`DriverAssignmentFlowTest`, `OtpDeliveryTest`), Operations production/QC
flow (`OperationsFlowTest`, `ProductionTransitionPolicyTest`), dispatch/
payment/POS eligibility gating (`DispatchEligibilityFlowTest`), the
POS read-only contract (`PosReadPortContractTest`), production-profile
provider wiring (`MockProviderAdapterProfileTest`), and a single full
end-to-end DELIVERY lifecycle test spanning every role and stage
(`DeliveryLifecycleE2ETest`).

## External integrations: mocked vs pending

| Boundary | Interface | Concrete implementation today | Status |
|---|---|---|---|
| POS (till/invoice system) | `PosReadPort` | `MockPosReadAdapter` (in-memory, test/dev seams to seed a ready invoice or simulate an outage) | **MOCKED** — strictly read-only by contract; awaiting the real vendor POS API contract. No write path to POS exists or is planned from LOAD. |
| Payment gateway | `PaymentProvider` | `MockPaymentProvider` (returns a synthetic charge reference, never touches real card data) | **MOCKED** — no real payment gateway integrated. |
| SMS/OTP delivery | `OtpDeliveryPort` | `InMemoryOtpDeliveryPort` (holds the last-sent code in memory for test/dev retrieval only) | **MOCKED** — no real SMS provider integrated. |

All three mock adapters are `@Profile("!prod")` — see
[Docker and production configuration](#docker-and-production-configuration).
Introducing a real provider means implementing the existing interface and
registering it (e.g. `@Profile("prod")` or unconditionally); **no interface
redesign should be necessary**.

Also still frontend-only mock data, with no backend endpoint at all yet:
Customer rewards/loyalty, Customer/Driver/Operations in-app notifications,
the coffee add-on catalogue, driver rating, and the entire Admin role's
dedicated screens.

## Demo guide

The fastest way to demonstrate the current, real, backend-integrated
end-to-end flow (mirrors `DeliveryLifecycleE2ETest`):

1. **Start everything**: `docker compose up -d` (in `backend/`),
   `mvn spring-boot:run` (in `backend/`), `npm run dev` (repo root).
2. **Register a Customer** at `http://localhost:5173/register`, then log in.
3. **Add an address** and **place a DELIVERY booking**
   (`/customer/services` → a category → "Start booking").
4. **Log in as Operations** at `/operations/login` (an Operations/Driver
   account must be provisioned server-side first — there is no public
   self-registration for these roles; see
   [backend/README.md](backend/README.md) for how to seed one).
   Assign a Driver to the order's pickup stop.
5. **Log in as the Driver** at `/driver/login`. Walk the pickup stop:
   en-route → arrive (an OTP is "sent" — retrieve it via the dev seam, not
   the UI) → verify → collect.
6. **Back in Operations**: confirm store receipt, record intake, advance
   through each production stage, run the quality check, then refresh the
   invoice from POS.
7. **Back as the Customer**: pay the now-`READY` invoice — note the charged
   amount matches the POS-confirmed total, not the original estimate.
8. **Back in Operations**: dispatch the order (now unblocked), assign the
   Driver to the delivery stop.
9. **Back as the Driver**: en-route → arrive (second OTP) → verify → deliver.
10. **Back as the Customer**: view the order — status is now `COMPLETED`.

This walks every IMPLEMENTED capability in one pass: real auth for three
roles, ownership/role enforcement, the full DELIVERY status machine, the
OTP-gated Driver workflow (twice), the invoice/payment/dispatch gate, and
final completion — exactly what `DeliveryLifecycleE2ETest` asserts by HTTP
call, without needing to click through the UI to verify it works.
