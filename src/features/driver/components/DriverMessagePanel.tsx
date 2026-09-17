import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mockDriverMessageService } from '@/services/mock'
import type { MessageChannel } from '@/domain/models'

interface DriverMessagePanelProps {
  stopId: string
  orderId: string
}

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  CUSTOMER: 'Message customer',
  OPERATIONS: 'Message operations',
}

export const DriverMessagePanel = ({ orderId, stopId }: DriverMessagePanelProps) => {
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<MessageChannel>('CUSTOMER')
  const [body, setBody] = useState('')

  const messagesQuery = useQuery({
    queryKey: ['driver-messages', stopId],
    queryFn: () => mockDriverMessageService.listMessages(stopId),
  })

  const sendMessage = useMutation({
    mutationFn: () => mockDriverMessageService.sendMessage({ stopId, orderId, channel, body: body.trim() }),
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['driver-messages', stopId] })
    },
  })

  return (
    <div className="mt-4 rounded-2xl bg-load-25 p-4">
      <p className="text-sm font-semibold text-ink">Messages</p>
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {(messagesQuery.data ?? []).map((message) => (
          <li key={message.id}>
            <span className="font-semibold">{message.direction === 'OUTBOUND' ? 'You' : CHANNEL_LABELS[message.channel]}:</span>{' '}
            {message.body}
          </li>
        ))}
        {messagesQuery.data?.length === 0 ? <li className="text-slate-400">No messages yet.</li> : null}
      </ul>

      <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto]">
        <select
          value={channel}
          onChange={(event) => setChannel(event.target.value as MessageChannel)}
          aria-label="Message channel"
          className="rounded-2xl border border-load-200 px-3 py-2 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
        >
          <option value="CUSTOMER">Customer</option>
          <option value="OPERATIONS">Operations</option>
        </select>
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={CHANNEL_LABELS[channel]}
          aria-label={CHANNEL_LABELS[channel]}
          className="rounded-2xl border border-load-200 px-3 py-2 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
        />
        <button
          type="button"
          onClick={() => {
            if (!body.trim()) return
            sendMessage.mutate()
          }}
          disabled={sendMessage.isPending || !body.trim()}
          className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </div>
      {sendMessage.isError ? <p className="mt-2 text-sm text-rose-700">Could not send message. Please try again.</p> : null}
    </div>
  )
}
