export type LoyaltyTier = 'Silver' | 'Gold' | 'Platinum'

export interface LoyaltyAccount {
  customerId: string
  tier: LoyaltyTier
  points: number
  availableRewards: number
  loadBalance: number
  nextRewardThreshold: number
  pointsToNextReward: number
}

export type LoyaltyTransactionType =
  | 'EARNED_ORDER'
  | 'EARNED_REFERRAL'
  | 'EARNED_REVIEW'
  | 'EARNED_SOCIAL'
  | 'EARNED_LOAD_PASS'
  | 'EARNED_PROMOTION'
  | 'EARNED_BIRTHDAY'
  | 'REDEEMED'

export interface LoyaltyTransaction {
  id: string
  customerId: string
  type: LoyaltyTransactionType
  points: number
  description: string
  orderId?: string
  occurredAt: string
}

export interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  value: string
  category: 'DISCOUNT' | 'FREE_DELIVERY' | 'COFFEE' | 'UPGRADE' | 'CASHBACK'
  expiresAt?: string
  isAvailable: boolean
}

export interface CoffeeOffer {
  id: string
  title: string
  description: string
  ctaLabel: string
  ctaTarget: 'VIEW_OFFER' | 'EXPLORE_BENEFITS' | 'REDEEM_REWARD'
  imageEmoji?: string
  expiresAt?: string
  isMemberOnly: boolean
}
