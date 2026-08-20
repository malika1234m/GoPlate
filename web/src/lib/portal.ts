"use client";

/**
 * Browser-side API client for the owner portal. Mirrors mobile/src/lib/api.ts
 * against the same backend routes; the Bearer token lives in localStorage
 * under the same key the /account billing page uses, so one sign-in covers
 * the whole web experience.
 */

export const TOKEN_KEY = "goplate_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; background?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Only a genuine authentication failure ends the session. The API used to
    // answer "row not found / not yours" with a bare 401 too, so opening a
    // deleted dish signed the owner out; `code` now separates the two.
    // Background pollers never redirect — a blip on a 15s timer must not throw
    // the owner out of a page they're working in.
    const authFailed = res.status === 401 && data.code !== "not_found";
    if (authFailed && t && typeof window !== "undefined" && !path.includes("/auth/") && !opts.background) {
      setToken(null);
      window.location.href = "/login";
    }
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

/* ---------- Types (mirror the API responses) ---------- */

export type User = { id: string; name: string; email: string };

export type ModifierOption = { id: string; name: string; priceDelta: number };
export type ModifierGroup = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options: ModifierOption[];
};

export type MenuItem = {
  id: string;
  name: string;
  caption: string;
  description: string;
  price: number;
  imageUrl: string;
  videoUrl: string;
  storyVideoUrl: string;
  modelStatus: string;
  modelUrl: string;
  modelUsdzUrl: string;
  soldOutDate: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  sortOrder: number;
  categoryId: string;
  modifierGroups?: ModifierGroup[];
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  availableFrom: string;
  availableTo: string;
  /** Null for a top-level section; otherwise the section it sits inside. */
  parentId: string | null;
  items: MenuItem[];
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string;
  caption: string;
  address: string;
  phone: string;
  currency: string;
  accentColor: string;
  theme: string;
  layout: string;
  showReel: boolean;
  isPublished: boolean;
  logoUrl: string;
  coverUrl: string;
  categories?: Category[];
};

export type OrderLine = { name: string; quantity: number; unitPrice: number; options: string[]; lineTotal: number };
export type Order = {
  id: string;
  code: string;
  tableNumber: string;
  customerName: string;
  note: string;
  status: "NEW" | "PREPARING" | "DONE" | "CANCELLED";
  items: OrderLine[];
  total: number;
  createdAt: string;
};

export type Billing = {
  plan: "basic" | "starter" | "pro";
  label: string;
  limits: {
    maxRestaurants: number;
    maxModels: number;
    maxVideos: number;
    modelsPerMonth: number;
    videosPerMonth: number;
  };
  usage: {
    restaurants: number;
    models: number;
    videos: number;
    /** Built this calendar month — the spend meter, not the library count. */
    modelsThisMonth: number;
    videosThisMonth: number;
  };
  subscribed: boolean;
  trialDaysLeft: number;
  accessActive: boolean;
  billingConfigured: boolean;
};

/* ---------- Endpoints ---------- */

export const api = {
  register: (name: string, email: string, password: string) =>
    req<{ token: string; user: User }>("/api/auth/register", { body: { name, email, password } }),
  login: (email: string, password: string) =>
    req<{ token: string; user: User }>("/api/auth/login", { body: { email, password } }),
  /** `isNew` is true only when this Google account had no GoPlate account yet. */
  googleSignIn: (credential: string) =>
    req<{ token: string; user: User; isNew: boolean }>("/api/auth/google", { body: { credential } }),
  me: () => req<{ user: User }>("/api/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ ok: boolean; token: string }>("/api/me", { method: "PATCH", body: { currentPassword, newPassword } }),
  /** Google-only accounts have no password: they confirm with the word DELETE. */
  deleteAccount: (password: string) =>
    req<{ ok: boolean }>("/api/me", { method: "DELETE", body: { password, confirm: password } }),

  billing: () => req<Billing>("/api/billing"),

  restaurants: () => req<{ restaurants: Restaurant[] }>("/api/restaurants"),
  restaurant: (id: string) => req<{ restaurant: Restaurant }>(`/api/restaurants/${id}`),
  createRestaurant: (body: Partial<Restaurant> & { name: string }) =>
    req<{ restaurant: Restaurant }>("/api/restaurants", { body }),
  updateRestaurant: (id: string, body: Partial<Restaurant>) =>
    req<{ restaurant: Restaurant }>(`/api/restaurants/${id}`, { method: "PATCH", body }),
  deleteRestaurant: (id: string) =>
    req<{ ok: boolean }>(`/api/restaurants/${id}`, { method: "DELETE" }),

  createCategory: (
    rid: string,
    body: { name: string; availableFrom?: string; availableTo?: string; parentId?: string | null }
  ) =>
    req<{ category: Category }>(`/api/restaurants/${rid}/categories`, { body }),
  updateCategory: (id: string, body: Partial<Category>) =>
    req<{ category: Category }>(`/api/categories/${id}`, { method: "PATCH", body }),
  deleteCategory: (id: string) => req<{ ok: boolean }>(`/api/categories/${id}`, { method: "DELETE" }),

  item: (id: string) => req<{ item: MenuItem }>(`/api/items/${id}`),
  createItem: (rid: string, body: { categoryId: string; name: string; price: number } & Partial<MenuItem>) =>
    req<{ item: MenuItem }>(`/api/restaurants/${rid}/items`, { body }),
  updateItem: (id: string, body: Partial<MenuItem> & { soldOutToday?: boolean }) =>
    req<{ item: MenuItem }>(`/api/items/${id}`, { method: "PATCH", body }),
  deleteItem: (id: string) => req<{ ok: boolean }>(`/api/items/${id}`, { method: "DELETE" }),

  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<{ url: string }>("/api/upload", { form });
  },
  uploadStoryVideo: async (itemId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<{ item: MenuItem; edited: boolean }>(`/api/items/${itemId}/story-video`, { form });
  },
  removeStoryVideo: (itemId: string) =>
    req<{ item: MenuItem }>(`/api/items/${itemId}/story-video`, { method: "DELETE" }),
  generate3d: (itemId: string) =>
    req<{ item: MenuItem }>(`/api/items/${itemId}/generate-3d`, { method: "POST", body: {} }),
  remove3d: (itemId: string) =>
    req<{ item: MenuItem }>(`/api/items/${itemId}/generate-3d`, { method: "DELETE" }),

  createModifierGroup: (
    itemId: string,
    body: { name: string; type: string; required: boolean; options: { name: string; priceDelta: number }[] }
  ) => req<{ group: ModifierGroup }>(`/api/items/${itemId}/modifier-groups`, { body }),
  updateModifierGroup: (
    id: string,
    body: Partial<{ name: string; type: string; required: boolean; options: { name: string; priceDelta: number }[] }>
  ) => req<{ group: ModifierGroup }>(`/api/modifier-groups/${id}`, { method: "PATCH", body }),
  deleteModifierGroup: (id: string) => req<{ ok: boolean }>(`/api/modifier-groups/${id}`, { method: "DELETE" }),

  /** `background` for the 15s kitchen poll: a failed tick must never sign the owner out. */
  listOrders: (rid: string, background = false) =>
    req<{ orders: Order[] }>(`/api/restaurants/${rid}/orders`, { background }),
  updateOrder: (id: string, status: Order["status"]) =>
    req<{ order: { id: string; status: string } }>(`/api/orders/${id}`, { method: "PATCH", body: { status } }),

  /** QR PNG needs the auth header, so fetch it as a blob object-URL. */
  qrBlobUrl: async (rid: string): Promise<string> => {
    const res = await fetch(`/api/restaurants/${rid}/qr`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new ApiError(res.status, "Could not load the QR code");
    return URL.createObjectURL(await res.blob());
  },
};
