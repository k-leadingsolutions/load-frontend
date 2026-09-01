import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Tabs } from '@/components/ui/Tabs'
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
      {/* Loyalty balance hero */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-panel bg-gradient-to-br from-load-500 to-load-700 p-5 text-white shadow-panel">
          <p className="text-caption text-white/80">Tier</p>
          <p className="mt-2 text-3xl font-semibold">{account.tier}</p>
        </div>
        <Card variant="flat" className="space-y-1">
          <p className="text-caption text-load-700">Points balance</p>
          <p className="text-3xl font-semibold text-ink">{formatPoints(account.points)}</p>
          <p className="text-caption text-muted">{formatPoints(account.pointsToNextReward)} to next reward</p>
        </Card>
        <Card variant="default" className="space-y-1">
          <p className="text-caption text-muted">LOAD balance</p>
          <p className="text-3xl font-semibold text-ink">{formatCurrency(account.loadBalance)}</p>
          <p className="text-caption text-muted">{account.availableRewards} rewards available</p>
        </Card>
      </div>

      {/* Tabs: Rewards / History */}
      <Tabs
        tabs={[
          { id: 'rewards', label: 'Available rewards', count: rewards.filter((r) => r.isAvailable).length },
          { id: 'history', label: 'Loyalty history', count: transactions.length },
        ]}
      >
        {(activeTab) => (
          <>
            {activeTab === 'rewards' ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {rewards.length === 0 ? (
                  <EmptyState title="No rewards available" description="Complete more orders to unlock loyalty rewards." />
                ) : (
                  rewards.map((reward) => (
                    <Card key={reward.id} variant="elevated">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-title text-ink">{reward.name}</p>
                          <p className="mt-2 text-body text-muted">{reward.description}</p>
                          <p className="mt-3 text-caption text-muted">
                            {formatPoints(reward.pointsCost)} · {reward.value}
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 rounded-pill px-3 py-1 text-xs font-semibold ${
                            reward.isAvailable
                              ? 'bg-status-success/15 text-status-success'
                              : 'bg-load-100 text-load-700'
                          }`}
                        >
                          {reward.isAvailable ? 'Available' : 'Locked'}
                        </span>
                      </div>
                      <div className="mt-4">
                        <Button
                          size="sm"
                          onClick={() => redeemRewardMutation.mutate(reward.id)}
                          disabled={!reward.isAvailable}
                          loading={redeemRewardMutation.isPending && redeemRewardMutation.variables === reward.id}
                        >
                          Redeem reward
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === 'history' ? (
              transactions.length === 0 ? (
                <EmptyState title="No loyalty activity yet" description="Your recent points activity will appear here." />
              ) : (
                <ul className="space-y-3">
                  {transactions.map((transaction) => (
                    <li key={transaction.id}>
                      <Card variant="default">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-title text-ink">{transaction.description}</p>
                            <p className="mt-1 text-caption text-muted">
                              {new Date(transaction.occurredAt).toLocaleDateString('en-ZA')}
                            </p>
                          </div>
                          <p
                            className={`text-sm font-semibold ${
                              transaction.points >= 0 ? 'text-status-success' : 'text-status-error'
                            }`}
                          >
                            {transaction.points >= 0 ? '+' : ''}
                            {formatPoints(transaction.points)}
                          </p>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </>
        )}
      </Tabs>
    </div>
  )
}
