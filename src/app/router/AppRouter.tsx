import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { GuestOnlyRoute } from '@/app/router/GuestOnlyRoute'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { RoleLayout } from '@/app/layouts/RoleLayout'
import { appPaths } from '@/app/router/paths'
import { AdminOverviewPage } from '@/features/admin/pages/AdminOverviewPage'
import { BiometricLoginPage } from '@/features/auth/pages/BiometricLoginPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ManageDevicesPage } from '@/features/auth/pages/ManageDevicesPage'
import { OtpPage } from '@/features/auth/pages/OtpPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetLinkSentPage } from '@/features/auth/pages/ResetLinkSentPage'
import { SetNewPasswordPage } from '@/features/auth/pages/SetNewPasswordPage'
import { SplashPage } from '@/features/auth/pages/SplashPage'
import { WelcomePage } from '@/features/auth/pages/WelcomePage'
import { CustomerBookingPage } from '@/features/customer/pages/CustomerBookingPage'
import { CustomerHomePage } from '@/features/customer/pages/CustomerHomePage'
import { CustomerInvoicePage } from '@/features/customer/pages/CustomerInvoicePage'
import { CustomerLoadPassPage } from '@/features/customer/pages/CustomerLoadPassPage'
import { CustomerNotificationsPage } from '@/features/customer/pages/CustomerNotificationsPage'
import { CustomerOrdersPage } from '@/features/customer/pages/CustomerOrdersPage'
import { CustomerProfilePage } from '@/features/customer/pages/CustomerProfilePage'
import { CustomerRewardsPage } from '@/features/customer/pages/CustomerRewardsPage'
import { CustomerServiceCategoryPage } from '@/features/customer/pages/CustomerServiceCategoryPage'
import { CustomerServicesPage } from '@/features/customer/pages/CustomerServicesPage'
import { FoundationPage } from '@/features/foundation/pages/FoundationPage'
import { LandingPage } from '@/features/foundation/pages/LandingPage'
import { DriverAssignmentsPage } from '@/features/driver/pages/DriverAssignmentsPage'
import { DriverDashboardPage } from '@/features/driver/pages/DriverDashboardPage'
import { DriverNotificationsPage } from '@/features/driver/pages/DriverNotificationsPage'
import { DriverProfilePage } from '@/features/driver/pages/DriverProfilePage'
import { DriverRoutePage } from '@/features/driver/pages/DriverRoutePage'
import { OperationsCollectionsPage } from '@/features/operations/pages/OperationsCollectionsPage'
import { OperationsBoardPage } from '@/features/operations/pages/OperationsBoardPage'
import { OperationsDashboardPage } from '@/features/operations/pages/OperationsDashboardPage'
import { OperationsNotificationsPage } from '@/features/operations/pages/OperationsNotificationsPage'
import { OperationsReportsPage } from '@/features/operations/pages/OperationsReportsPage'
import { NotFoundPage } from '@/features/shared/pages/NotFoundPage'
import { RoadmapPlaceholderPage } from '@/features/shared/pages/RoadmapPlaceholderPage'

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={appPaths.home} element={<LandingPage />} />
        <Route path={appPaths.foundation} element={<FoundationPage />} />
        <Route element={<GuestOnlyRoute />}>
          <Route path={appPaths.splash} element={<SplashPage />} />
          <Route path={appPaths.welcome} element={<WelcomePage />} />
          <Route path={appPaths.login} element={<LoginPage />} />
          <Route path={appPaths.register} element={<RegisterPage />} />
          <Route path={appPaths.otpVerify} element={<OtpPage />} />
          <Route path={appPaths.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={appPaths.resetLinkSent} element={<ResetLinkSentPage />} />
          <Route path={appPaths.setNewPassword} element={<SetNewPasswordPage />} />
          <Route path={appPaths.biometricLogin} element={<BiometricLoginPage />} />
        </Route>
        <Route element={<RequireCustomerAuth />}>
          <Route
            element={
              <RoleLayout
                roleLabel="Customer"
                greetingMode
                mobileNavLinks={[
                  { to: appPaths.customerHome, label: 'Home', icon: '⌂' },
                  { to: appPaths.customerOrders, label: 'Orders', icon: '◷' },
                  { to: appPaths.customerServices, label: 'New Order', icon: '+', emphasis: true },
                  { to: appPaths.customerRewards, label: 'Rewards', icon: '⭐' },
                  { to: appPaths.customerProfile, label: 'More', icon: '☰' },
                ]}
              />
            }
          >
            <Route path={appPaths.customerHome} element={<CustomerHomePage />} />
            <Route path={appPaths.customerServices} element={<CustomerServicesPage />} />
            <Route path={appPaths.customerServiceCategory} element={<CustomerServiceCategoryPage />} />
            <Route path={appPaths.customerBooking} element={<CustomerBookingPage />} />
            <Route path={appPaths.customerOrders} element={<CustomerOrdersPage />} />
            <Route path={appPaths.customerInvoice} element={<CustomerInvoicePage />} />
            <Route path={appPaths.customerProfile} element={<CustomerProfilePage />} />
            <Route path={appPaths.customerRewards} element={<CustomerRewardsPage />} />
            <Route path={appPaths.customerLoadPass} element={<CustomerLoadPassPage />} />
            <Route path={appPaths.customerNotifications} element={<CustomerNotificationsPage />} />
            <Route path={appPaths.manageDevices} element={<ManageDevicesPage />} />
          </Route>
        </Route>
        <Route
          element={
            <RoleLayout
              roleLabel="Operations"
              title="Operations command centre"
              summary="Production receives and moves orders through every MVP laundry stage with quality-control visibility."
              primaryLinks={[
                { to: appPaths.operationsDashboard, label: 'Dashboard' },
                { to: appPaths.operationsOrders, label: 'Orders' },
                { to: appPaths.operationsProduction, label: 'Production' },
                { to: appPaths.operationsCollections, label: 'Collections / Dispatch' },
                { to: appPaths.operationsQC, label: 'More' },
              ]}
              mobileNavLinks={[
                { to: appPaths.operationsDashboard, label: 'Dashboard', icon: '⌂' },
                { to: appPaths.operationsOrders, label: 'Orders', icon: '◷' },
                { to: appPaths.operationsProduction, label: 'Production', icon: '◉' },
                { to: appPaths.operationsCollections, label: 'Dispatch', icon: '➤' },
                { to: appPaths.operationsQC, label: 'More', icon: '☰' },
              ]}
            />
          }
        >
        <Route path={appPaths.operationsDashboard} element={<OperationsDashboardPage />} />
        <Route path={appPaths.operationsOrders} element={<OperationsBoardPage />} />
        <Route path={appPaths.operationsProduction} element={<OperationsBoardPage />} />
        <Route path={appPaths.operationsCollections} element={<OperationsCollectionsPage />} />
        <Route path={appPaths.operationsQC} element={<OperationsBoardPage />} />
        <Route path={appPaths.operationsNotifications} element={<OperationsNotificationsPage />} />
        <Route path={appPaths.operationsReports} element={<OperationsReportsPage />} />
        </Route>
        <Route
          element={
            <RoleLayout
              roleLabel="Driver"
              title="Driver run management"
              summary="Drivers manage pickups and deliveries with customer instructions, confirmation actions, and proof-ready workflows."
              primaryLinks={[
                { to: appPaths.driverDashboard, label: 'Dashboard' },
                { to: appPaths.driverRoute, label: 'Route' },
                { to: appPaths.driverRuns, label: 'Orders' },
                { to: appPaths.driverNotifications, label: 'Messages' },
                { to: appPaths.driverProfile, label: 'Profile' },
              ]}
              mobileNavLinks={[
                { to: appPaths.driverDashboard, label: 'Dashboard', icon: '⌂' },
                { to: appPaths.driverRoute, label: 'Route', icon: '➤' },
                { to: appPaths.driverRuns, label: 'Orders', icon: '◷' },
                { to: appPaths.driverNotifications, label: 'Messages', icon: '✉' },
                { to: appPaths.driverProfile, label: 'Profile', icon: '☻' },
              ]}
            />
          }
        >
        <Route path={appPaths.driverDashboard} element={<DriverDashboardPage />} />
        <Route path={appPaths.driverRoute} element={<DriverRoutePage />} />
        <Route path={appPaths.driverRuns} element={<DriverAssignmentsPage />} />
        <Route path={appPaths.driverNotifications} element={<DriverNotificationsPage />} />
        <Route path={appPaths.driverProfile} element={<DriverProfilePage />} />
        </Route>
        <Route
          element={
            <RoleLayout
              roleLabel="Admin"
              title="Admin control tower (future scope)"
              summary="Admin remains available but is intentionally deprioritised for current MVP delivery."
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
