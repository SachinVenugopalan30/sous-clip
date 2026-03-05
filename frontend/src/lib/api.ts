import { useAuthStore } from "../stores/auth";

const API_BASE = "/api";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      fetchAPI<{ username: string; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    me: () => fetchAPI<{ username: string }>("/auth/me"),
  },
  recipes: {
    list: (search?: string) =>
      fetchAPI<{ recipes: Recipe[]; total: number }>(
        `/recipes${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
    get: (id: number) => fetchAPI<Recipe>(`/recipes/${id}`),
    delete: (id: number) => fetchAPI<void>(`/recipes/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: number[]) =>
      fetchAPI<{ deleted: number }>("/recipes/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    share: (id: number) =>
      fetchAPI<{ share_token: string; share_url: string }>(`/recipes/${id}/share`, {
        method: "POST",
      }),
    unshare: (id: number) =>
      fetchAPI<void>(`/recipes/${id}/share`, { method: "DELETE" }),
  },
  share: {
    get: (token: string) =>
      fetch(`/api/share/${token}`).then(async (res) => {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(error.detail || "Not found");
        }
        return res.json() as Promise<Recipe>;
      }),
  },
  extract: {
    submit: (url: string, userId: string) =>
      fetchAPI<{ queue_item: QueueItem; message: string }>("/extract", {
        method: "POST",
        body: JSON.stringify({ url, user_id: userId }),
      }),
  },
  settings: {
    get: () => fetchAPI<Record<string, string>>("/settings"),
    update: (updates: Record<string, string>) =>
      fetchAPI<Record<string, string>>("/settings", {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
  },
  queue: {
    enqueue: (urls: string[], userId: string) =>
      fetchAPI<{ items: QueueItem[] }>("/queue", {
        method: "POST",
        body: JSON.stringify({ urls, user_id: userId }),
      }),
    list: (userId: string) =>
      fetchAPI<{ items: QueueItem[] }>(`/queue/${userId}`),
    cancel: (userId: string, itemId: string) =>
      fetchAPI<{ cancelled: boolean }>(`/queue/${userId}/${itemId}`, {
        method: "DELETE",
      }),
    retry: (userId: string, itemId: string) =>
      fetchAPI<{ retried: boolean }>(`/queue/${userId}/${itemId}/retry`, {
        method: "POST",
      }),
  },
};

export interface Ingredient {
  name: string;
  quantity: string | null;
  unit: string | null;
}

export interface Recipe {
  id: number;
  title: string;
  source_url: string;
  ingredients: Ingredient[];
  instructions: string[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  tags: string[];
  notes: string | null;
  share_token: string | null;
  created_at: string;
}

export interface QueueItem {
  id: string;
  user_id: string;
  url: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  position: number;
  created_at: string;
  error: string | null;
}
