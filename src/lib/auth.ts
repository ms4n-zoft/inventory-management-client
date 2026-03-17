import type { AuthSession } from "@/types";

const authStorageKey = "inventory-auth-session";
export const authExpiredEventName = "inventory-auth-expired";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function getStoredAuthSession(): AuthSession | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  const raw = sessionStorage.getItem(authStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    sessionStorage.removeItem(authStorageKey);
    return null;
  }
}

export function setStoredAuthSession(session: AuthSession): void {
  if (!canUseSessionStorage()) {
    return;
  }

  sessionStorage.setItem(authStorageKey, JSON.stringify(session));
}

export function clearStoredAuthSession(): void {
  if (!canUseSessionStorage()) {
    return;
  }

  sessionStorage.removeItem(authStorageKey);
}

export function getAccessToken(): string | null {
  return getStoredAuthSession()?.token ?? null;
}

export function dispatchAuthExpired(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(authExpiredEventName));
}
