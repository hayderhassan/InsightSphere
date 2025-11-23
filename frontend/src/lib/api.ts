import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/token";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    Accept: "application/json",
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAccessToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:unauthorised"));
    }
  }

  if (res.status === 204) {
    // No content
    return null as T;
  }

  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(
      `API error ${res.status} ${res.statusText}: ${JSON.stringify(payload)}`,
    );
  }

  return payload as T;
}

// Re-export for backwards compatibility
export { getAccessToken, setAccessToken, clearAccessToken };
