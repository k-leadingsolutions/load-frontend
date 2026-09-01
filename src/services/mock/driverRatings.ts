import type { DriverRating } from '@/domain/models'

const DRIVER_RATINGS_STORAGE_KEY = 'load.customer.driver-ratings.v1'

let memoryRatings: DriverRating[] = []

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const readRatings = () => {
  if (!canUseStorage()) {
    return memoryRatings
  }

  const rawRatings = window.localStorage.getItem(DRIVER_RATINGS_STORAGE_KEY)

  if (!rawRatings) {
    return []
  }

  try {
    const parsed = JSON.parse(rawRatings) as DriverRating[]
    memoryRatings = parsed
    return parsed
  } catch {
    window.localStorage.removeItem(DRIVER_RATINGS_STORAGE_KEY)
    memoryRatings = []
    return []
  }
}

const writeRatings = (ratings: DriverRating[]) => {
  memoryRatings = ratings

  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(DRIVER_RATINGS_STORAGE_KEY, JSON.stringify(ratings))
}

export const getStoredDriverRating = (orderId: string) =>
  readRatings().find((rating) => rating.orderId === orderId)

export const saveStoredDriverRating = (rating: DriverRating) => {
  const ratings = readRatings()
  const nextRatings = [rating, ...ratings.filter((item) => item.orderId !== rating.orderId)]
  writeRatings(nextRatings)
  return rating
}
