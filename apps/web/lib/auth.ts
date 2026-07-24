"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "access_token";

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
  displayName?: string;
};

let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const url = `${API_URL}/api${path}`;
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
    signal: options.signal ?? AbortSignal.timeout(15000),
  };

  let res = await fetch(url, fetchOptions);

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOptions, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = Array.isArray(err.message)
      ? err.message.join(". ")
      : err.message;
    throw new Error(msg ?? `Erro ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{
    accessToken: string;
    user: AuthUser;
  }>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function register(payload: {
  email: string;
  password: string;
  displayName: string;
  city: string;
  state: string;
  birthDate: string;
  bio: string;
  sexualPreference?: string;
  position?: string;
  penisSizeCm?: number;
}) {
  const data = await apiFetch<{
    accessToken: string;
    user: AuthUser;
  }>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  try {
    await apiFetch("/v1/auth/logout", { method: "POST" });
  } finally {
    clearAccessToken();
  }
}

export async function fetchMe() {
  return apiFetch<{
    id: string;
    email: string;
    roles: string[];
    profile: {
      id: string;
      slug: string;
      displayName: string;
      status: string;
      bio: string | null;
      city?: string;
      state?: string;
    } | null;
  }>("/v1/auth/me");
}
