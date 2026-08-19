import { File, UploadType, type UploadResult } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Backend base URL.
 * - Android emulator reaches your dev machine at 10.0.2.2
 * - Physical devices need your machine's LAN IP (set EXPO_PUBLIC_API_URL in .env)
 * - Production: your deployed web app URL
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");

const TOKEN_KEY = "goplate_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  // Don't hang forever on dead connections. File uploads use uploadFile below.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "The request timed out — check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

/**
 * Upload one local file as multipart/form-data.
 *
 * SDK 57's global fetch is the winter-runtime fetch, which only accepts strings
 * and real Blob/File objects — React Native's { uri, name, type } parts fail
 * with "Unsupported FormDataPart implementation". A native upload task streams
 * the file straight from disk, so a 130 MB dish film never has to be read into
 * JS memory the way FormData + fetch would require.
 */
export type UploadProgressFn = (percent: number) => void;

async function uploadFile<T>(
  path: string,
  uri: string,
  mime: string,
  onProgress?: UploadProgressFn
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const file = new File(uri);
  if (!file.exists) {
    // The picker's cache file can be swept away by the OS before we send it.
    throw new ApiError(0, "That file is no longer available — pick or film it again.");
  }

  // Big videos get room to finish; the fetch path's 20s would cut them off.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60_000);

  let res: UploadResult;
  try {
    res = await file
      .createUploadTask(`${API_URL}${path}`, {
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        mimeType: mime,
        headers,
        signal: controller.signal,
        onProgress: onProgress
          ? ({ bytesSent, totalBytes }) => {
              if (totalBytes > 0) {
                onProgress(Math.min(100, Math.round((bytesSent / totalBytes) * 100)));
              }
            }
          : undefined,
      })
      .uploadAsync();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "The upload timed out — check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  // Upload tasks resolve for non-2xx too, and an error page may not be JSON.
  let data: unknown = {};
  try {
    data = JSON.parse(res.body);
  } catch {
    data = {};
  }
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `Upload failed (${res.status})`);
  }
  return data as T;
}

/* ---------- Types ---------- */

export type User = { id: string; name: string; email: string };

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  description: string;
  caption: string;
  address: string;
  phone: string;
  currency: string;
  accentColor: string;
  /**
   * Template id. Intentionally a plain string, not a union: the catalogue is
   * served by /api/menu-themes, so pinning the values here would reject a new
   * template until the app was rebuilt and re-released.
   */
  theme: string;
  layout: "list" | "grid";
  showReel: boolean;
  logoUrl: string;
  coverUrl: string;
  isPublished: boolean;
  _count?: { items: number; categories: number };
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  availableFrom: string;
  availableTo: string;
  /**
   * Null for a top-level section; otherwise the section this sits inside
   * (Mains → Kottu, Desserts → Mousses). Without it the phone renders
   * sub-sections as if they were top-level, which is not what the diner sees.
   */
  parentId: string | null;
  items: MenuItem[];
};

export type ModifierOption = { id: string; name: string; priceDelta: number };

export type ModifierGroup = {
  id: string;
  name: string;
  type: "single" | "multi";
  required: boolean;
  options: ModifierOption[];
};

export type ModifierGroupInput = {
  name: string;
  type: "single" | "multi";
  required: boolean;
  options: { name: string; priceDelta: number }[];
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
  modelUrl: string;
  modelUsdzUrl: string;
  modelStatus: "NONE" | "PROCESSING" | "READY" | "FAILED";
  soldOutDate: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  categoryId: string;
  restaurantId: string;
  modifierGroups?: ModifierGroup[];
  /** Only present on the single-item GET — used to price add-ons correctly. */
  restaurant?: { currency: string };
};

export type RestaurantFull = Restaurant & { categories: Category[] };

export type OrderLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  options: string[];
  lineTotal: number;
};

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

/* ---------- Auth ---------- */


/**
 * A menu template as the server describes it. Deliberately fetched rather than
 * hardcoded here: the palettes live in the web app's menu-themes.ts, and a copy
 * on the phone would drift the moment a template is added or a colour changed.
 */
export type MenuTheme = {
  id: string;
  label: string;
  tone: "dark" | "light";
  display: "sans" | "serif";
  note: string;
  swatch: string;
  suggestedAccent: string;
  /** True when the owner's plan does not include this template. */
  locked: boolean;
  palette: { bg: string; surface: string; border: string; text: string; dim: string };
};

export const api = {
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  me: () => request<{ user: User }>("/api/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true; token: string }>("/api/me", {
      method: "PATCH",
      body: { currentPassword, newPassword },
    }),

  deleteAccount: (password: string) =>
    request<{ ok: true }>("/api/me", { method: "DELETE", body: { password } }),

  /* ---------- Restaurants ---------- */

  listRestaurants: () => request<{ restaurants: Restaurant[] }>("/api/restaurants"),

  createRestaurant: (data: Partial<Restaurant> & { name: string }) =>
    request<{ restaurant: Restaurant }>("/api/restaurants", { method: "POST", body: data }),

  getRestaurant: (id: string) =>
    request<{ restaurant: RestaurantFull }>(`/api/restaurants/${id}`),

  /** Templates plus what this owner's plan unlocks. */
  menuThemes: () =>
    request<{ plan: string; canCustomiseAccent: boolean; themes: MenuTheme[] }>(
      "/api/menu-themes"
    ),

  updateRestaurant: (id: string, data: Partial<Restaurant>) =>
    request<{ restaurant: Restaurant }>(`/api/restaurants/${id}`, { method: "PATCH", body: data }),

  deleteRestaurant: (id: string) =>
    request<{ ok: true }>(`/api/restaurants/${id}`, { method: "DELETE" }),

  listOrders: (restaurantId: string) =>
    request<{ orders: Order[] }>(`/api/restaurants/${restaurantId}/orders`),

  updateOrder: (orderId: string, status: Order["status"]) =>
    request<{ order: { id: string; status: string } }>(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: { status },
    }),

  getQr: (id: string) =>
    request<{ menuUrl: string; qrDataUrl: string }>(`/api/restaurants/${id}/qr?format=json`),

  /* ---------- Categories ---------- */

  createCategory: (restaurantId: string, name: string, parentId?: string | null) =>
    request<{ category: Category }>(`/api/restaurants/${restaurantId}/categories`, {
      method: "POST",
      body: { name, parentId: parentId ?? null },
    }),

  updateCategory: (
    id: string,
    data: { name?: string; sortOrder?: number; availableFrom?: string; availableTo?: string }
  ) => request<{ category: Category }>(`/api/categories/${id}`, { method: "PATCH", body: data }),

  deleteCategory: (id: string) =>
    request<{ ok: true }>(`/api/categories/${id}`, { method: "DELETE" }),

  /* ---------- Items ---------- */

  createItem: (restaurantId: string, data: Partial<MenuItem> & { categoryId: string; name: string; price: number }) =>
    request<{ item: MenuItem }>(`/api/restaurants/${restaurantId}/items`, {
      method: "POST",
      body: data,
    }),

  getItem: (id: string) => request<{ item: MenuItem }>(`/api/items/${id}`),

  updateItem: (id: string, data: Partial<MenuItem> & { soldOutToday?: boolean }) =>
    request<{ item: MenuItem }>(`/api/items/${id}`, { method: "PATCH", body: data }),

  /* ---------- Modifiers ---------- */

  createModifierGroup: (itemId: string, data: ModifierGroupInput) =>
    request<{ group: ModifierGroup }>(`/api/items/${itemId}/modifier-groups`, {
      method: "POST",
      body: data,
    }),

  updateModifierGroup: (id: string, data: Partial<ModifierGroupInput>) =>
    request<{ group: ModifierGroup }>(`/api/modifier-groups/${id}`, {
      method: "PATCH",
      body: data,
    }),

  deleteModifierGroup: (id: string) =>
    request<{ ok: true }>(`/api/modifier-groups/${id}`, { method: "DELETE" }),

  /* ---------- Billing ---------- */

  billing: () =>
    request<{
      plan: "basic" | "starter" | "pro";
      label: string;
      limits: { maxRestaurants: number; maxModels: number; maxVideos: number };
      usage: { restaurants: number; models: number; videos: number };
      subscribed: boolean;
      trialDaysLeft: number;
      accessActive: boolean;
      billingConfigured: boolean;
    }>("/api/billing"),

  checkout: (plan: "basic" | "starter" | "pro" = "pro") =>
    request<{ url: string }>("/api/billing/checkout", { method: "POST", body: { plan } }),

  billingPortal: () => request<{ url: string }>("/api/billing/portal", { method: "POST" }),

  deleteItem: (id: string) => request<{ ok: true }>(`/api/items/${id}`, { method: "DELETE" }),

  delete3d: (itemId: string) =>
    request<{ item: MenuItem }>(`/api/items/${itemId}/generate-3d`, { method: "DELETE" }),

  generate3d: (itemId: string) =>
    request<{ item: MenuItem }>(`/api/items/${itemId}/generate-3d`, { method: "POST" }),

  check3d: (itemId: string) =>
    request<{ item: MenuItem; progress?: number; error?: string }>(
      `/api/items/${itemId}/generate-3d`
    ),

  /** Upload a raw "how it's made" clip; the server auto-edits it. */
  uploadStoryVideo: (itemId: string, uri: string, onProgress?: UploadProgressFn) => {
    const name = uri.split("/").pop() ?? "story.mp4";
    const mime = name.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4";
    return uploadFile<{ item: MenuItem; edited: boolean }>(
      `/api/items/${itemId}/story-video`,
      uri,
      mime,
      onProgress
    );
  },

  /* ---------- Uploads ---------- */

  upload: (uri: string, type: "image" | "video", onProgress?: UploadProgressFn) => {
    const name = uri.split("/").pop() ?? (type === "image" ? "photo.jpg" : "video.mp4");
    const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : type === "image" ? "jpg" : "mp4";
    const mime =
      type === "image"
        ? ext === "png"
          ? "image/png"
          : "image/jpeg"
        : ext === "mov"
          ? "video/quicktime"
          : "video/mp4";
    return uploadFile<{ url: string }>("/api/upload", uri, mime, onProgress);
  },
};

/** Turn a relative upload path into an absolute URL for display. */
export function mediaUrl(path: string): string {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}
