# LOAD Frontend

Premium technology-enabled laundry and delivery MVP frontend for LOAD OS.

## Overview

This project is a React + TypeScript single-page application that models key MVP workflows for:

- Public marketing and discovery
- Customer onboarding, booking, order tracking, and profile management
- Operations production board
- Driver assignments and delivery actions
- Admin overview for pricing/catalog controls

The app currently runs on mock services and seeded data, so no backend is required for local development.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query
- React Hook Form + Zod
- Vitest + React Testing Library
- Oxlint

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (recommended)

### 1) Install dependencies

```bash
npm ci
```

### 2) Start development server

```bash
npm run dev
```

Then open the local URL shown in the terminal (typically `http://localhost:5173`).

## Build and Run

### Create a production build

```bash
npm run build
```

This runs TypeScript project checks and outputs optimized assets to `dist/`.

### Preview the production build locally

```bash
npx vite preview
```

## Quality and Validation Commands

### Type checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Run tests once

```bash
npm run test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage

```bash
npm run test:coverage
```

## Authentication and Demo Data

- Login and registration flows use seeded in-memory mock data.
- The login form is prefilled with demo credentials in the UI:
  - Mobile number: `+27 82 555 0142`
  - Password: `Load@1234`

You can also register additional mock customer accounts from the registration page.

## Key Routes

- `/` — Landing page
- `/foundation` — MVP blueprint view
- `/login` — Customer sign-in
- `/register` — Customer registration
- `/customer/*` — Customer role experience
- `/operations/orders` — Operations board
- `/driver/runs` — Driver assignments
- `/admin/overview` — Admin overview

## Project Structure

```text
src/
  app/           # Providers, router, layouts, shared app config
  components/    # Reusable UI building blocks
  domain/        # Typed business models and domain logic
  features/      # Role-based feature modules (auth/customer/driver/operations/admin/foundation)
  services/      # Contracts, interfaces, and mock async service implementations
  test/          # Test setup and shared test helpers
  utils/         # Formatting and cross-cutting helpers
```

## Notes

- This repository is frontend-focused and currently uses mock services.
- Styling follows LOAD design tokens and utility classes via Tailwind.
- Accessibility and UX consistency are included in ongoing polish passes.
