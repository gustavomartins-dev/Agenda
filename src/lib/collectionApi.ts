export interface CollectionTopic {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  itemCount: number;
}

export interface CollectionItem {
  id: string;
  topicId: string;
  title: string;
  notes: string;
  createdAt: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || 'Não foi possível acessar a coleção.');
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export const collectionApi = {
  topics: () => request<CollectionTopic[]>('/api/collection/topics'),
  items: (topicId: string) => request<CollectionItem[]>(`/api/collection/topics/${encodeURIComponent(topicId)}/items`),
  addItem: (topicId: string, title: string, notes = '') => request<CollectionItem>(`/api/collection/topics/${encodeURIComponent(topicId)}/items`, { method: 'POST', body: JSON.stringify({ title, notes }) }),
  removeItem: (id: string) => request<void>(`/api/collection/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
