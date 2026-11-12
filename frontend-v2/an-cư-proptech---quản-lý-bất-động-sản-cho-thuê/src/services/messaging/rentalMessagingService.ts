import { apiFetch, readApiError } from '@/services/http/client';
import type { PageResult } from '@/types/apartment';

export interface Conversation {
  id: string;
  apartmentId: string;
  apartmentTitle: string;
  otherName: string;
  lastMessageAt: string | null;
}

export interface RentalMessage {
  id: string;
  mine: boolean;
  body: string;
  sentAt: string;
}

interface ThreadView {
  conversation: Conversation;
  messages: RentalMessage[];
  hasMore: boolean;
}

const root = '/api/v1/me/conversations';
const threadPath = (id: string) => `${root}/${encodeURIComponent(id)}/messages`;

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const response = await apiFetch(url, { ...options, cache: 'no-store' });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}

export function openConversation(apartmentId: string, signal: AbortSignal) {
  return request<Conversation>(`${root}/apartments/${encodeURIComponent(apartmentId)}`, { method: 'POST', signal });
}

export function listConversations(page: number, signal: AbortSignal) {
  return request<PageResult<Conversation>>(`${root}?page=${page}&size=20`, { signal });
}

export function readConversation(id: string, signal: AbortSignal, cursor?: { before: string } | { after: string }) {
  const query = cursor ? `?${new URLSearchParams(cursor)}` : '';
  return request<ThreadView>(threadPath(id) + query, { signal });
}

export function sendRentalMessage(id: string, body: string, requestKey: string, signal: AbortSignal) {
  return request<RentalMessage>(threadPath(id), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, requestKey }), signal,
  });
}
