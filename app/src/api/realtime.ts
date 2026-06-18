import { io, type Socket } from 'socket.io-client';
import { env } from '../config/env';
import type { ApiEnvelope } from '../types/api';
import { apiRequest } from './http';

export type OrderRealtimeEvent<TPayload = Record<string, unknown>> = {
  id?: string;
  aggregateType?: string;
  aggregateId?: string;
  eventName: string;
  channel: string;
  payload: TPayload;
  publishedAt?: string | null;
  createdAt?: string;
};

type RealtimeSocketOptions = {
  customerId?: string;
  pharmacyId?: string;
  orderId?: string;
  accessToken?: string;
  onEvent: (event: OrderRealtimeEvent) => void;
  onConnectionChange?: (
    status: 'connected' | 'disconnected' | 'fallback',
  ) => void;
};

export function listRealtimeEvents(
  filters: {
    channel: string;
    orderId?: string;
    eventName?: string;
    afterId?: string;
    after?: string;
    direction?: 'asc' | 'desc';
    limit?: number;
  },
  accessToken?: string,
) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return apiRequest<ApiEnvelope<OrderRealtimeEvent[]>>(
    `/realtime/events?${params}`,
    {
      accessToken,
    },
  );
}

export function connectOrderRealtime({
  customerId,
  pharmacyId,
  orderId,
  accessToken,
  onEvent,
  onConnectionChange,
}: RealtimeSocketOptions) {
  const socketUrl = env.orderSocketUrl;

  if (!socketUrl) {
    onConnectionChange?.('fallback');
    return () => undefined;
  }

  const query: Record<string, string> = {};

  if (customerId) query.customerId = customerId;
  if (pharmacyId) query.pharmacyId = pharmacyId;
  if (orderId) query.orderId = orderId;

  const socket: Socket = io(socketUrl, {
    auth: accessToken ? { token: accessToken } : undefined,
    query,
    reconnection: true,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => onConnectionChange?.('connected'));
  socket.on('disconnect', () => onConnectionChange?.('disconnected'));
  socket.on('connect_error', () => onConnectionChange?.('fallback'));
  socket.on('order.realtime', onEvent);

  return () => {
    socket.off('order.realtime', onEvent);
    socket.disconnect();
  };
}
