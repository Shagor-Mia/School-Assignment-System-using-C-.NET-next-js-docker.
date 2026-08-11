import type { ApiError } from "./types";

// Thrown for any non-2xx response from /api/backend/*. Carries the parsed
// ApiError shape (when the backend returned one) so calling code can show
// `err.message` and/or field-level `err.errors`.
export class ApiClientError extends Error {
  errors: Record<string, string[]> | null;
  traceId: string | null;
  status: number;

  constructor(status: number, body: Partial<ApiError> | null) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = body?.errors ?? null;
    this.traceId = body?.traceId ?? null;
  }
}

const BASE = "/api/backend";

/**
 * A 401 means the session is gone (expired/invalid JWT) rather than "this
 * particular request isn't allowed" — the proxy route has already cleared
 * the stale cookie by this point. Send the user back to /login instead of
 * letting every caller render its own "Request failed with status 401".
 */
function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname === "/login") return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?next=${next}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  if (res.status === 401) {
    redirectToLogin();
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiClientError(res.status, body);
  }

  return body as T;
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const res = await fetch(`${BASE}/${path}${buildQuery(params)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  return handleResponse<T>(res);
}

/** For multipart/form-data submissions (e.g. assignment submission uploads). */
export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    // Do NOT set Content-Type manually — the browser sets the multipart
    // boundary automatically when the body is a FormData instance.
    body: formData,
  });
  return handleResponse<T>(res);
}

/** For endpoints (like updating a submission) that may also accept multipart. */
export async function apiPutForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "PUT",
    headers: { Accept: "application/json" },
    body: formData,
  });
  return handleResponse<T>(res);
}
