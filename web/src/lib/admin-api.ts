"use client";

/**
 * Browser client for the back office.
 *
 * Its own token key, separate from the owner portal's `goplate_token`: a staff
 * member is often signed into their own owner account in the same browser, and
 * one session must never overwrite or be mistaken for the other.
 */

export const ADMIN_TOKEN_KEY = "goplate_admin_token";

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(t: string | null) {
  if (t) localStorage.setItem(ADMIN_TOKEN_KEY, t);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function req<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Admin routes answer 404 rather than 401 when the token is missing or
    // stale, so that an outsider cannot map the back office. For a caller that
    // *had* a token, a 404 on /api/admin means the session died — sign out.
    if (res.status === 404 && token && !path.includes("/auth/")) {
      setAdminToken(null);
      if (typeof window !== "undefined") window.location.href = "/admin/login";
    }
    throw new AdminApiError(res.status, data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

/** Fetches a payment slip as a blob URL — <img> can't send the Bearer header. */
export async function fetchSlipUrl(requestId: string): Promise<string> {
  const res = await fetch(`/api/admin/requests/${requestId}/slip`, {
    headers: { Authorization: `Bearer ${getAdminToken() ?? ""}` },
  });
  if (!res.ok) throw new AdminApiError(res.status, "Could not load the slip.");
  return URL.createObjectURL(await res.blob());
}

/* ---------- Types ---------- */

export type Overview = {
  users: { total: number; paying: number; onTrial: number; lapsed: number; newLast30Days: number };
  byPlan: { basic: number; starter: number; pro: number };
  revenue: {
    collectedTotal: number;
    collectedLast30Days: number;
    approvedPayments: number;
    mrrProjected: number;
  };
  queues: { pendingRequests: number; openMessages: number };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  plan: "basic" | "starter" | "pro";
  subscribed: boolean;
  accessActive: boolean;
  trialDaysLeft: number;
  restaurants: number;
  upgradeRequests: number;
  signIn: string;
  createdAt: string;
};

export type AdminRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedPlan: string;
  billingPeriod: string;
  planLabel: string;
  planPriceUsd: number;
  amount: number;
  currency: string;
  note: string;
  hasSlip: boolean;
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; currentPlan: string; currentlyPaying: boolean };
};

export type AdminMessage = {
  id: string;
  subject: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  reply: string;
  repliedAt: string | null;
  handledBy: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; plan: string; paying: boolean };
};

/* ---------- Endpoints ---------- */

export const adminApi = {
  login: (email: string, password: string) =>
    req<{ token: string; admin: { id: string; name: string; email: string } }>(
      "/api/admin/auth/login",
      { body: { email, password } }
    ),

  overview: () => req<Overview>("/api/admin/overview"),

  users: (q: string, page = 1) =>
    req<{ total: number; page: number; pageSize: number; users: AdminUser[] }>(
      `/api/admin/users?q=${encodeURIComponent(q)}&page=${page}`
    ),

  updateUser: (id: string, body: { plan?: string; active?: boolean; trialDays?: number }) =>
    req<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body }),

  requests: (status: string) =>
    req<{ requests: AdminRequest[] }>(`/api/admin/requests?status=${status}`),

  review: (id: string, decision: "APPROVED" | "REJECTED", reviewNote: string) =>
    req<{ request: { id: string; status: string } }>(`/api/admin/requests/${id}`, {
      method: "PATCH",
      body: { decision, reviewNote },
    }),

  messages: (status: string) =>
    req<{ messages: AdminMessage[] }>(`/api/admin/support?status=${status}`),

  answer: (id: string, body: { reply?: string; status?: "OPEN" | "RESOLVED" }) =>
    req<{ message: { id: string; status: string } }>(`/api/admin/support/${id}`, {
      method: "PATCH",
      body,
    }),
};
