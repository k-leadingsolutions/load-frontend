import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { RoleLayout } from '@/app/layouts/RoleLayout'
import { appPaths } from '@/app/router/paths'
import { AdminOverviewPage } from '@/features/admin/pages/AdminOverviewPage'
import { CustomerHomePage } from '@/features/customer/pages/CustomerHomePage'
import { FoundationPage } from '@/features/foundation/pages/FoundationPage'
import { LandingPage } from '@/features/foundation/pages/LandingPage'
import { DriverAssignmentsPage } from '@/features/driver/pages/DriverAssignmentsPage'
import { OperationsBoardPage } from '@/features/operations/pages/OperationsBoardPage'
import { NotFoundPage } from '@/features/shared/pages/NotFoundPage'
import { RoadmapPlaceholderPage } from '@/features/shared/pages/RoadmapPlaceholderPage'

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={appPaths.home} element={<LandingPage />} />
        <Route path={appPaths.foundation} element={<FoundationPage />} />
        <Route
          element={
            <RoleLayout
              roleLabel="Customer"
              title="Customer experience"
              summary="Customer booking, loyalty, order tracking, and premium account interactions live within one modular app shell."
              primaryLinks={[
                { to: appPaths.customerHome, label: 'Home' },
                { to: appPaths.foundation, label: 'Blueprint' },
              ]}
            />
          }
        >
          <Route path={appPaths.customerHome} element={<CustomerHomePage />} />
          <Route path={appPaths.customerOrders} element={<Navigate replace to={appPaths.customerHome} />} />
          <Route path={appPaths.customerProfile} element={<Navigate replace to={appPaths.customerHome} />} />
        </Route>
        <Route
          element={
            <RoleLayout
              roleLabel="Operations"
              title="Operations command centre"
              summary="Production receives and moves orders through every MVP laundry stage with quality-control visibility."
              primaryLinks={[
                { to: appPaths.operationsOrders, label: 'Production board' },
                { to: appPaths.foundation, label: 'Blueprint' },
              ]}
            />
          }
        >
          <Route path={appPaths.operationsOrders} element={<OperationsBoardPage />} />
        </Route>
        <Route
          element={
            <RoleLayout
              roleLabel="Driver"
              title="Driver run management"
              summary="Drivers manage pickups and deliveries with customer instructions, confirmation actions, and proof-ready workflows."
              primaryLinks={[
                { to: appPaths.driverRuns, label: 'Assignments' },
                { to: appPaths.foundation, label: 'Blueprint' },
              ]}
            />
          }
        >
          <Route path={appPaths.driverRuns} element={<DriverAssignmentsPage />} />
        </Route>
        <Route
          element={
            <RoleLayout
              roleLabel="Admin"
              title="Admin control tower"
              summary="Admins manage pricing, catalogue, staff, promotions, loyalty, and core commercial metrics."
              primaryLinks={[
                { to: appPaths.adminOverview, label: 'Overview' },
                { to: appPaths.foundation, label: 'Blueprint' },
              ]}
            />
          }
        >
          <Route path={appPaths.adminOverview} element={<AdminOverviewPage />} />
        </Route>
        <Route path={appPaths.roadmap} element={<RoadmapPlaceholderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
