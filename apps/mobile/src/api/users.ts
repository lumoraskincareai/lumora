import { apiFetch } from "./client";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  isAdmin?: boolean;
  /** False for Google-only accounts. Missing on older servers, so treat missing as true. */
  hasPassword?: boolean;
}

export interface PublicProfile {
  id: string
  name: string
  memberSince: string
  postCount: number
  reviewCount: number
}

export function getPublicProfile(id: string) {
  return apiFetch<PublicProfile>(`/users/${id}/public`)
}

export function getMyProfile() {
  return apiFetch<UserProfile>("/users/me");
}

export function updateMyProfile(name: string) {
  return apiFetch<UserProfile>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

/** Permanently deletes the account. Email accounts send `password`, Google accounts send `confirm: "DELETE"`. */
export function deleteMyAccount(input: { password?: string; confirm?: string }) {
  return apiFetch<{ success: boolean }>("/users/me", {
    method: "DELETE",
    body: JSON.stringify(input),
  });
}

export function registerPushToken(pushToken: string) {
  return apiFetch("/users/push-token", {
    method: "POST",
    body: JSON.stringify({ pushToken }),
  });
}
