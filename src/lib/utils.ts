import { getToken } from "next-auth/jwt";
import { headers }  from "next/headers";

export function formatDate(input: string | number): string {
  // Handle Drupal timestamps (milliseconds) or ISO date strings
  const date = typeof input === "number" ? new Date(input) : new Date(input);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function absoluteUrl(input: string) {
  const baseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL || ''
  // Remove trailing slash from baseUrl and leading slash from input to avoid double slashes
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const cleanInput = input.startsWith('/') ? input : `/${input}`
  return `${cleanBaseUrl}${cleanInput}`
}

export async function getServerToken(): Promise<string> {
  const token = await getToken({
    req:    { headers: Object.fromEntries(await headers()) } as any,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (token?.error === "RefreshAccessTokenError") throw new Error("RefreshAccessTokenError");
  if (!token?.accessToken) throw new Error("Unauthenticated");

  return token.accessToken as string;
}
