import type { Appointment, AppointmentDraft, AssistantProposal } from '../types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || 'Não foi possível acessar o banco de dados.');
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export const appointmentsApi = {
  list: () => request<Appointment[]>('/api/appointments'),
  create: (draft: AppointmentDraft) => request<Appointment>('/api/appointments', { method: 'POST', body: JSON.stringify(draft) }),
  update: (id: string, draft: AppointmentDraft) => request<Appointment>(`/api/appointments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(draft) }),
  setCompletion: (id: string, completed: boolean) =>
    request<Appointment>(`/api/appointments/${encodeURIComponent(id)}/completion`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  remove: (id: string) => request<void>(`/api/appointments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clear: () => request<void>('/api/appointments', { method: 'DELETE' }),
};

export const assistantApi = {
  chat: (message: string) => request<{ proposal: AssistantProposal }>('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  confirm: (proposalId: string) => request<{ type: 'create' | 'update' | 'delete'; appointmentId: string }>('/api/assistant/confirm', { method: 'POST', body: JSON.stringify({ proposalId }) }),
};
