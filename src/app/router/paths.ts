export const appPaths = {
  // Public
  home: '/',
  foundation: '/foundation',
  roadmap: '/roadmap/:moduleId',

  // Auth
  splash: '/auth/splash',
  welcome: '/auth/welcome',
  login: '/login',
  register: '/register',
  otpVerify: '/auth/otp',
  forgotPassword: '/auth/forgot-password',
  resetLinkSent: '/auth/reset-link-sent',
  setNewPassword: '/auth/set-new-password',
  biometricLogin: '/auth/biometric',
  manageDevices: '/auth/devices',

  // Customer
  customerHome: '/customer/home',
  customerServices: '/customer/services',
  customerServiceCategory: '/customer/services/:categoryId',
  customerBooking: '/customer/booking',
  customerOrders: '/customer/orders',
  customerProfile: '/customer/profile',
  customerInvoice: '/customer/invoice/:invoiceId',
  customerRewards: '/customer/rewards',
  customerLoadPass: '/customer/load-pass',
  customerNotifications: '/customer/notifications',

  // Operations
  operationsDashboard: '/operations/dashboard',
  operationsOrders: '/operations/orders',
  operationsProduction: '/operations/production',
  operationsCollections: '/operations/collections',
  operationsQC: '/operations/qc',
  operationsNotifications: '/operations/notifications',
  operationsReports: '/operations/reports',

  // Driver
  driverDashboard: '/driver/dashboard',
  driverRoute: '/driver/route',
  driverRuns: '/driver/runs',
  driverStop: '/driver/stop/:stopId',
  driverOrder: '/driver/order/:orderId',
  driverNotifications: '/driver/notifications',
  driverProfile: '/driver/profile',

  // Admin – kept but marked future scope
  adminOverview: '/admin/overview',
} as const

/** Helper to build parameterised paths */
export const buildPath = {
  customerInvoice: (invoiceId: string) => `/customer/invoice/${invoiceId}`,
  customerServiceCategory: (categoryId: string) => `/customer/services/${categoryId}`,
  driverStop: (stopId: string) => `/driver/stop/${stopId}`,
  driverOrder: (orderId: string) => `/driver/order/${orderId}`,
  roadmap: (moduleId: string) => `/roadmap/${moduleId}`,
} as const
