import { SectionCard } from '@/components/ui/SectionCard'
import { Collapsible } from '@/components/ui/Collapsible'

const faqs = [
  {
    question: 'How does LOAD pricing work?',
    answer:
      "We charge per kilogram for everyday laundry and per item for dry cleaning and specialty services. Your invoice is generated after weighing.",
  },
  {
    question: 'When will I be charged?',
    answer:
      "Payment is requested after your laundry is weighed and an invoice is generated. You'll receive a notification to pay via the app.",
  },
  {
    question: 'How do I track my order?',
    answer: 'Visit the Orders tab to see real-time status updates at every stage of your laundry journey.',
  },
] as const

export const CustomerHelpPage = () => (
  <div className="space-y-6">
    <SectionCard title="Chat with us on WhatsApp" description="Reach the LOAD support team directly for quick help.">
      <a
        href="https://wa.me/27000000000"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center justify-center rounded-pill bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
      >
        Chat on WhatsApp
      </a>
    </SectionCard>

    <SectionCard title="Frequently Asked Questions" description="Quick answers for pricing, payments, and order tracking.">
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <Collapsible key={faq.question} title={faq.question} defaultOpen={index === 0}>
            <p className="text-sm text-slate-600">{faq.answer}</p>
          </Collapsible>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Contact support" description="If you prefer email, our support team is ready to help.">
      <a
        href="mailto:support@loadlaundry.co.za"
        className="inline-flex items-center justify-center rounded-pill border-2 border-load-600 bg-white px-5 py-3 text-sm font-semibold text-load-600 transition hover:bg-load-50"
      >
        Email support
      </a>
    </SectionCard>
  </div>
)
