/**
 * Smallest possible Driver <-> Customer / Driver <-> Operations messaging
 * model. Intentionally simple (in-memory mock, request/response) — this is
 * NOT chat infrastructure and does not imply WebSocket/STOMP/SSE. It exists
 * so the Driver can send/receive short operational messages tied to a stop.
 *
 * Not to be confused with Customer WhatsApp support links, which are an
 * unrelated external support channel.
 */
export type MessageChannel = 'CUSTOMER' | 'OPERATIONS'

export interface DriverMessage {
  id: string
  stopId: string
  orderId: string
  channel: MessageChannel
  direction: 'OUTBOUND' | 'INBOUND'
  body: string
  createdAt: string
}
