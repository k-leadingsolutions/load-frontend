import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/useAuth'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockLoyaltyService } from '@/services/mock'
import { formatCurrency, formatPoints } from '@/utils/format'

export const CustomerRewardsPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const customerId = user?.id
  const rewardsQuery = useQuery({
    queryKey: ['customer-rewards', customerId],
    queryFn: async () => {
      if (!customerId) {
        return null
      }

      const [account, rewards, transactions] = await Promise.all([
        mockLoyaltyService.getAccount(customerId),
        mockLoyaltyService.getRewards(),
        mockLoyaltyService.getTransactions(customerId),
      ])

      return { account, rewards, transactions }
    },
    enabled: Boolean(customerId),
  })
  const redeemRewardMutation = useMutation({
    mutationFn: (rewardId: string) => {
      if (!customerId) {
        throw new Error('Customer account unavailable.')
      }

      return mockLoyaltyService.redeemReward(customerId, rewardId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer-rewards', customerId] })
    },
  })

  if (!customerId) {
    return <ErrorState title="Rewards unavailable" message="Please sign in again to view your loyalty wallet." />
  }

  if (rewardsQuery.isLoading) {
    return <LoadingState />
  }

  if (rewardsQuery.isError) {
    return <ErrorState title="Unable to load rewards" message={rewardsQuery.error instanceof Error ? rewardsQuery.error.message : 'Unknown error'} />
  }

  const rewardsData = rewardsQuery.data

  if (!rewardsData) {
    return <EmptyState title="Rewards unavailable" description="We could not load your rewards profile right now." />
  }

  const { account, rewards, transactions } = rewardsData

  return (
    <div className="space-y-6">
      <SectionCard title="Loyalty wallet" description="Track LOAD points, balance, and the next reward threshold.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-gradient-to-br from-load-500 to-load-700 p-5 text-white">
            <p className="text-sm text-white/80">Tier</p>
            <p className="mt-2 text-3xl font-semibold">{account.tier}</p>
          </div>
          <div className="rounded-3xl border border-load-100 bg-load-50 p-5">
            <p className="text-sm text-load-700">Points</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{formatPoints(account.points)}</p>
          </div>
          <div className="rounded-3xl border border-load-100 bg-white p-5">
            <p className="text-sm text-slate-500">LOAD balance</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{formatCurrency(account.loadBalance)}</p>
            <p className="mt-2 text-sm text-slate-500">{formatPoints(account.pointsToNextReward)} to next reward</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Available rewards" description="Redeem benefits unlocked by recent orders and referrals.">
        <div className="grid gap-4 lg:grid-cols-2">
          {rewards.map((reward) => (
            <article key={reward.id} className="rounded-3xl border border-load-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{reward.name}</p>
                  <p className="mt-2 text-sm text-slate-600">{reward.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${reward.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-load-50 text-load-700'}`}>
                  {reward.isAvailable ? 'Available' : 'Locked'}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500">{formatPoints(reward.pointsCost)} · {reward.value}</p>
              <button
                type="button"
                onClick={() => redeemRewardMutation.mutate(reward.id)}
                disabled={!reward.isAvailable || redeemRewardMutation.isPending}
                className="mt-4 rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Redeem reward
              </button>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent loyalty activity" description="Points earned and redeemed across orders and promotions.">
        {transactions.length === 0 ? (
          <EmptyState title="No loyalty activity yet" description="Your recent points activity will appear here." />
        ) : (
          <ul className="space-y-3">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="flex items-center justify-between gap-3 rounded-3xl border border-load-100 bg-white p-4">
                <div>
                  <p className="font-semibold text-ink">{transaction.description}</p>
                  <p className="mt-1 text-sm text-slate-500">{new Date(transaction.occurredAt).toLocaleDateString('en-ZA')}</p>
                </div>
                <p className={`text-sm font-semibold ${transaction.points >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {transaction.points >= 0 ? '+' : ''}
                  {formatPoints(transaction.points)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
