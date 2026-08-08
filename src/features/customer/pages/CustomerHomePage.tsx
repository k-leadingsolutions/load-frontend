import { SectionCard } from '@/components/ui/SectionCard'
import { CustomerHomePreview } from '@/features/customer/components/CustomerHomePreview'

export const CustomerHomePage = () => (
  <div className="space-y-6">
    <SectionCard
      title="Customer home foundation"
      description="Premium dashboard baseline for services, wallet, loyalty, and live order tracking."
    >
      <CustomerHomePreview />
    </SectionCard>
  </div>
)
