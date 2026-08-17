export type VerificationMethod = 'QR_CODE' | 'OTP' | 'SIGNATURE' | 'PHOTO' | 'MANUAL_OVERRIDE'

export type VerificationStatus =
  | 'AWAITING'
  | 'SCANNING'
  | 'VERIFIED'
  | 'INVALID'
  | 'EXPIRED'
  | 'RETRY'
  | 'MANUAL_OVERRIDE_REQUESTED'

export interface VerificationAttempt {
  id: string
  orderId: string
  method: VerificationMethod
  status: VerificationStatus
  attemptedAt?: string
  verifiedAt?: string
  verifiedBy?: string
}
