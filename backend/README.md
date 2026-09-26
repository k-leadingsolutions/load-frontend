# LOAD Backend

Java 21 / Spring Boot 3 backend for LOAD. This document covers backend-specific
setup, configuration, domain model, API reference, and testing. For the
overall product, architecture, and demo guide, see the
[root README](../README.md).

> This backend is Java 21 + Spring Boot. There is no TypeScript here — the
> only TypeScript in this repository is the frontend under `src/`.

## Contents

- [Tech stack](#tech-stack)
- [Package structure](#package-structure)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Database and migrations](#database-and-migrations)
- [Domain model](#domain-model)
- [Security model](#security-model)
- [Provisioning Driver / Operations / Admin accounts](#provisioning-driver--operations--admin-accounts)
- [API reference](#api-reference)
- [External provider adapters](#external-provider-adapters)
- [Testing](#testing)
- [OpenAPI / Swagger](#openapi--swagger)
- [Docker](#docker)

## Tech stack

| Concern | Choice |
|---|---|
| Language / runtime | Java 21 |
| Framework | Spring Boot 3 (Web, Security, Data JPA, Validation, Actuator) |
| Database | PostgreSQL 16 |
| Schema migration | Flyway |
| Auth | Stateless JWT (`io.jsonwebtoken` / jjwt), BCrypt password hashing |
| API docs | springdoc-openapi (Swagger UI + OpenAPI JSON) |
| Testing | JUnit 5, Spring Boot Test, Testcontainers (PostgreSQL), AssertJ |

## Package structure

```text
backend/src/main/java/com/load/backend/
  LoadBackendApplication.java   # Spring Boot entry point

  auth/            # User, Role, JWT issuance/parsing, CustomUserDetailsService,
                    # AuthController/AuthService (register CUSTOMER + login),
                    # dto/ (RegisterCustomerRequest, LoginRequest, AuthResponse)

  config/          # SecurityConfig — filter chain, CORS, path/role authorization rules

  common/          # Shared exceptions (NotFoundException, ForbiddenException,
                    # InvalidTransitionException), GlobalExceptionHandler (-> ApiError),
                    # CurrentUser (resolves the authenticated principal's user id)

  customer/        # CustomerProfile, Address, CustomerAddressController/Service,
                    # CustomerProfileController — address book + profile, ownership-scoped

  order/           # Order (aggregate), OrderStatus, FulfilmentType, PaymentStatus,
                    # BookingController/BookingService (create/list/get order),
                    # dto/ (CreateOrderRequest, OrderResponse, ServiceSelectionRequest)

  driver/          # Driver, DriverAssignment, StopType, StopStatus, VerificationMethod/Status,
                    # DriverController/DriverService — stop lifecycle + OTP verification,
                    # dto/ (AssignmentResponse, VerifyRequest, ReasonNoteRequest)

  operations/      # OperationsController/OperationsService — intake, production stages,
                    # QC, driver assignment, dispatch, store-collection completion, retry/reschedule,
                    # ProductionTransitionPolicy, DispatchEligibilityService,
                    # dto/ (AssignDriverRequest, QualityCheckRequest, StoreIntakeRequest, ...)

  invoice/         # InvoiceService.refreshInvoice — the only writer of invoiceStatus/finalInvoiceTotal

  payment/         # PaymentProvider (interface), MockPaymentProvider, Payment (entity),
                    # PaymentController/PaymentService — charges order.finalInvoiceTotal only

  pos/             # PosReadPort (strict read-only interface), MockPosReadAdapter,
                    # PosInvoiceRecord/PosOrderRecord/PosRewardsRecord, PosUnavailableException

  notification/    # OtpDeliveryPort (interface), InMemoryOtpDeliveryPort, MobileNumberNormalizer
```

## Running locally

```bash
cd backend
docker compose up -d      # starts local PostgreSQL (postgres:16-alpine)
mvn spring-boot:run       # runs the backend on http://localhost:8080
```

Flyway migrations run automatically against the configured datasource on
startup — there is no separate manual migration step.

To run a packaged jar instead:

```bash
mvn -DskipTests clean package
java -jar target/*.jar
```

## Environment variables

| Variable | Dev default (`application.yml`) | Production (`application-prod.yml`) |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/load` | required, no default |
| `DB_USERNAME` | `load` | required, no default |
| `DB_PASSWORD` | `load` | required, no default |
| `JWT_SECRET` | a committed local-dev-only value — **never use this in production** | required, no default |
| `JWT_EXPIRY_SECONDS` | `3600` | `3600` (overridable) |
| `CORS_ALLOWED_ORIGINS` | not required — dev default is `http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173` | required, no default (comma-separated) |
| `SPRING_PROFILES_ACTIVE` | unset | set to `prod` to activate `application-prod.yml` |

Activating the `prod` profile (`SPRING_PROFILES_ACTIVE=prod`):

- Requires every variable above with "required, no default" to be set, or the
  application fails to start (fail-fast, rather than silently running with an
  insecure/wrong value).
- Disables Swagger UI and the OpenAPI JSON endpoint.
- Hides Actuator health details (`management.endpoint.health.show-details=never`).
- Excludes the three mock external-provider adapters (see
  [External provider adapters](#external-provider-adapters)) — a real
  implementation of each is required, or startup fails when Spring cannot
  resolve the corresponding constructor dependency.

## Database and migrations

Schema is managed entirely by Flyway (`src/main/resources/db/migration/`):

| Migration | Contents |
|---|---|
| `V1__init.sql` | Core schema: `users`, `customer_profiles`, `addresses`, `drivers`, `orders`, `order_service_selections`, `order_intake_notes`, `driver_assignments`, `payments`. Includes a `CHECK` constraint that a `STORE_COLLECTION` order can never carry delivery address/window data. |
| `V2__operations_quantity_review_and_notes.sql` | Adds `quantity_review_status` and `internal_notes` support to `orders` for the Operations quantity-review/notes workflow. |

`spring.jpa.hibernate.ddl-auto=validate` — Hibernate never generates or alters
schema; Flyway is the single source of truth for schema changes.

## Domain model

Three independent status fields on `Order` — **never merged into one status
enum**:

| Field | Values | Meaning |
|---|---|---|
| `status` (`OrderStatus`) | `BOOKING_RECEIVED`, `DRIVER_ASSIGNED`, `DRIVER_EN_ROUTE`, `DRIVER_ARRIVED`, `COLLECTION_VERIFIED`, `COLLECTED`, `RECEIVED_AT_STORE`, `SORTING`, `WASHING`, `DRYING`, `IRONING`, `QUALITY_CHECK`, `PACKING`, `READY_FOR_DISPATCH`, `OUT_FOR_DELIVERY`, `DELIVERED`, `COMPLETED`, `RESCHEDULED`, `CANCELLED` (plus a few additional pre/legacy values retained in the enum) | Operational fulfilment progress only |
| `invoiceStatus` (`InvoiceStatus`) | `NOT_AVAILABLE`, `READY` | Whether the POS-side invoice has been finalised and read into LOAD |
| `paymentStatus` (`PaymentStatus`) | `NOT_REQUIRED`, `PENDING`, `CONFIRMED`, `FAILED`, `REFUNDED` | Whether/how the customer has paid |

`fulfilmentType` (`FulfilmentType`: `DELIVERY` | `STORE_COLLECTION`) is fixed
at booking time and determines which completion gate applies (see the root
README's [Order lifecycle](../README.md#order-lifecycle) section for the full
state sequence of each).

`DriverAssignment.stopStatus` (`StopStatus`): `ASSIGNED → EN_ROUTE → ARRIVED →
VERIFIED → COLLECTED` (PICKUP) or `→ DELIVERED` (DELIVERY) `→ COMPLETED`, with
`FAILED`/`RESCHEDULE_REQUESTED` as alternate terminal-ish states resolved by
Operations. A Driver can hold multiple assignments (e.g. the PICKUP and
DELIVERY stop of the same order, or stops across different orders) —
`stopIndex` orders a given driver's stops sequentially.

## Security model

See the root README's [Auth and security model](../README.md#auth-and-security-model)
for the full description. Backend-specific detail:

- `SecurityConfig` (`config/SecurityConfig.java`) defines the entire
  authorization policy in one place — path-matcher rules per role, CORS
  origin allow-list, stateless session policy, and the JWT filter
  registration. There is no scattered `if (user.role == ...)` authorization
  logic; role checks live only here plus per-request ownership checks in the
  relevant `*Service` classes.
- `CurrentUser` (`common/CurrentUser.java`) resolves the authenticated
  principal's user id from the Spring Security context — controllers never
  trust a client-supplied user/driver/customer id for "who am I" purposes.
- Ownership checks (e.g. `DriverService.getOwnedAssignment`,
  `BookingService`'s owned-order lookups) are enforced in the service layer,
  independent of and in addition to the role check — a valid `DRIVER` JWT
  does not grant access to another driver's assignment.

## Provisioning Driver / Operations / Admin accounts

Only `CUSTOMER` accounts can self-register (`POST /api/auth/register/customer`).
There is intentionally no public self-registration endpoint for `DRIVER`,
`OPERATIONS`, or `ADMIN` — these are provisioned out-of-band. There is also no
seed data or startup data loader in `src/main/resources` or `src/main/java`.

For local/manual testing, insert a user row directly with a BCrypt password
hash (do **not** commit real credentials anywhere):

```sql
-- Example only — generate your own BCrypt hash, e.g. via Spring's
-- BCryptPasswordEncoder, and never reuse this placeholder in any real
-- environment.
INSERT INTO users (id, email, password_hash, role, enabled, created_at)
VALUES (gen_random_uuid(), 'ops@example.com', '<bcrypt-hash>', 'OPERATIONS', true, now());

-- A DRIVER account additionally needs a row in `drivers`:
INSERT INTO drivers (id, user_id, name)
VALUES (gen_random_uuid(), '<the users.id above>', 'Demo Driver');
```

Backend integration tests instead use
`backend/src/test/java/com/load/backend/support/TestUserFactory.java`, which
provisions Operations/Driver/Admin users directly against the repositories
(bypassing HTTP) for exactly this reason — see
[Testing](#testing).

## API reference

All endpoints are prefixed `/api`. Request/response bodies are JSON. See
[Security model](#security-model) for which role each prefix requires.

### Auth — `/api/auth` (public)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register/customer` | `RegisterCustomerRequest` (email, password, firstName, lastName, mobileNumber) | Creates a `CUSTOMER` user + profile, returns a JWT |
| POST | `/auth/login` | `LoginRequest` (email, password) | Any role; returns a JWT |

### Customer — `/api/customer/**` (role: `CUSTOMER`)

| Method | Path | Notes |
|---|---|---|
| POST | `/customer/addresses` | Create an address for the authenticated customer |
| GET | `/customer/addresses` | List the authenticated customer's own addresses |
| GET | `/customer/profile` | Get the authenticated customer's profile |
| POST | `/customer/orders` | Create a booking (`CreateOrderRequest`: fulfilmentType, pickup/delivery address+window, services, estimatedTotal) |
| GET | `/customer/orders` | List the authenticated customer's own orders |
| GET | `/customer/orders/{orderId}` | Get one of the authenticated customer's own orders (404 if not owned — never leaks existence) |
| POST | `/customer/orders/{orderId}/payments` | Pay the order's invoice — amount is always `finalInvoiceTotal`, requires `invoiceStatus == READY` |

### Driver — `/api/driver/**` (role: `DRIVER`)

| Method | Path | Notes |
|---|---|---|
| GET | `/driver/assignments` | List the authenticated driver's own assignments only |
| POST | `/driver/assignments/{id}/en-route` | `ASSIGNED → EN_ROUTE` |
| POST | `/driver/assignments/{id}/arrive` | `EN_ROUTE → ARRIVED`; generates + delivers an OTP via `OtpDeliveryPort` (never returned in the response) |
| POST | `/driver/assignments/{id}/verify` | `VerifyRequest` (code) — verifies the OTP, `ARRIVED → VERIFIED` |
| POST | `/driver/assignments/{id}/collect` | PICKUP stop only, requires `VERIFIED` |
| POST | `/driver/assignments/{id}/deliver` | DELIVERY stop only, requires `VERIFIED`; auto-completes the parent order if eligible |
| POST | `/driver/assignments/{id}/fail` | `ReasonNoteRequest` (reason, note) — records a failed stop |
| POST | `/driver/assignments/{id}/reschedule-request` | `ReasonNoteRequest` — requests Operations reschedule the stop |

### Operations — `/api/operations/**` (role: `OPERATIONS` or `ADMIN`)

| Method | Path | Notes |
|---|---|---|
| GET | `/operations/orders` | List all orders |
| GET | `/operations/orders/{orderId}` | Get one order |
| GET | `/operations/metrics` | Operational dashboard metrics |
| GET | `/operations/assignments` | List all driver assignments |
| POST | `/operations/orders/{orderId}/store-received` | Confirms the order arrived at the store |
| POST | `/operations/orders/{orderId}/store-intake` | `StoreIntakeRequest` (weightKg, notes) — non-price-affecting intake record only |
| POST | `/operations/orders/{orderId}/quantity-review` | `QuantityReviewRequest` (status) |
| POST | `/operations/orders/{orderId}/notes` | `InternalNoteRequest` (note) |
| POST | `/operations/orders/{orderId}/quality-check` | `QualityCheckRequest` (passed, notes) — dedicated pass/fail branch at the `QUALITY_CHECK` stage |
| POST | `/operations/orders/{orderId}/advance-production` | Steps to the next fixed production stage (no request body) |
| POST | `/operations/orders/{orderId}/refresh-invoice` | Reads the authoritative invoice from `PosReadPort`; the **only** writer of `invoiceStatus`/`finalInvoiceTotal` |
| POST | `/operations/orders/{orderId}/assign-driver` | `AssignDriverRequest` (driverId, stopType) |
| POST | `/operations/orders/{orderId}/dispatch` | DELIVERY only; `409` unless `invoiceStatus == READY` and `paymentStatus == CONFIRMED` |
| POST | `/operations/orders/{orderId}/complete-store-collection` | STORE_COLLECTION only; `409` unless `invoiceStatus == READY` |
| POST | `/operations/assignments/{assignmentId}/retry` | Retries a `FAILED` stop |
| POST | `/operations/assignments/{assignmentId}/reschedule-decision` | `RescheduleDecisionRequest` — resolves a `RESCHEDULE_REQUESTED` stop |

Full request/response field detail is available live via
[OpenAPI / Swagger](#openapi--swagger) — treat the table above as an index,
not the authoritative field-level contract.

## External provider adapters

Three narrow interfaces isolate LOAD from external systems it does not yet
have real credentials/contracts for. Each has exactly one concrete
implementation today, and every one of them is a **mock**, restricted to
non-production Spring profiles via `@Profile("!prod")`:

| Interface | Package | Mock implementation | Contract constraint |
|---|---|---|---|
| `PosReadPort` | `pos` | `MockPosReadAdapter` | **No mutation method exists on the interface at all** — enforced by `PosReadPortContractTest` (reflection-based method-name deny-list). Never fabricates an invoice total. |
| `PaymentProvider` | `payment` | `MockPaymentProvider` | Never receives/stores/logs real card data; never mutates POS. |
| `OtpDeliveryPort` | `notification` | `InMemoryOtpDeliveryPort` | No read-back method in the interface contract — delivery is fire-and-forget from the caller's side; the mock's own `lastSentCodeFor()` accessor is a dev/test-only seam, not part of the interface. |

Because all three are required (non-optional) constructor dependencies of
`InvoiceService` / `PaymentService` / `DriverService` respectively, and their
mock implementations are excluded under the `prod` profile, **a production
boot with no real implementation configured fails fast at Spring context
startup** rather than silently running with mock behaviour. This is proven by
`MockProviderAdapterProfileTest`.

To integrate a real provider: implement the existing interface (no interface
redesign should be necessary) and register it as a Spring bean available
under the `prod` profile (e.g. via its own `@Profile("prod")`, or
unconditionally if it is also safe for local dev).

**POS is read-only and awaiting the vendor API contract.** No POS write path
exists or is planned — LOAD reads the finalised invoice; it never creates,
updates, or confirms anything in POS.

## Testing

```bash
mvn clean verify
```

Runs the full unit + integration suite. Integration tests
(`support/AbstractIntegrationTest` and its subclasses) use a **Testcontainers
singleton PostgreSQL container** — started once, manually, in a static
initializer (not via `@Testcontainers`/`@Container`), because those
annotations manage container lifecycle per test class while Spring's test
context cache reuses one `ApplicationContext`/connection pool across classes,
which previously caused stale-port connection failures once the first test
class's container was torn down. Do not reintroduce
`@Testcontainers`/`@Container` on that base class.

| Test class | Covers |
|---|---|
| `auth.ProductionSecurityTest` | Production security headers/CORS behaviour |
| `auth.RoleIsolationTest` | Cross-role access is rejected at the API boundary |
| `order.BookingFlowTest` | Customer booking creation/listing/ownership |
| `order.DeliveryLifecycleE2ETest` | Full DELIVERY round trip: register/login → booking → driver pickup/OTP → intake/production/QC → invoice refresh from POS → dispatch gating → payment → dispatch → driver delivery/OTP → `COMPLETED`, plus ownership/role rejection assertions |
| `driver.DriverAssignmentFlowTest` | Driver stop lifecycle, cross-driver access rejection |
| `driver.OtpDeliveryTest` | OTP is delivered via the port and never appears in the API response |
| `notification.MobileNumberNormalizerTest` | Mobile number normalization used to resolve OTP delivery targets |
| `operations.OperationsFlowTest` | Intake, notes, quantity review, production advance |
| `operations.ProductionTransitionPolicyTest` | Fixed production-stage sequencing |
| `operations.DispatchEligibilityFlowTest` | Dispatch/store-collection-completion gating (invoice + payment) |
| `pos.PosReadPortContractTest` | `PosReadPort` has no mutation methods (reflection-based) |
| `support.MockProviderAdapterProfileTest` | Mock provider beans present outside `prod`, absent under `prod` |

**Current status: 62/62 tests passing** (verified via `mvn clean verify` as
part of this documentation audit).

Requires Docker to be available (Testcontainers pulls and runs
`postgres:16-alpine` for the integration test suite).

## OpenAPI / Swagger

Available only when the `prod` profile is **not** active:

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Both are explicitly disabled in `application-prod.yml`
(`springdoc.swagger-ui.enabled=false`, `springdoc.api-docs.enabled=false`).

## Docker

```bash
docker build -t load-backend .
docker run -p 8080:8080 \
  -e DB_URL=jdbc:postgresql://<host>:5432/load \
  -e DB_USERNAME=load \
  -e DB_PASSWORD=<password> \
  -e JWT_SECRET=<secret> \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e CORS_ALLOWED_ORIGINS=https://your-frontend-origin \
  load-backend
```

The image (`backend/Dockerfile`) is a multi-stage build:
`maven:3.9-eclipse-temurin-21` compiles/packages the jar, then
`eclipse-temurin:21-jre-alpine` runs it as a non-root user with a container
`HEALTHCHECK` against `/actuator/health`. `backend/docker-compose.yml`
provisions PostgreSQL only, for local development — it does not run the
backend itself.
