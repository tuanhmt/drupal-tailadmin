import { getToken } from "next-auth/jwt";
import { headers }  from "next/headers";

export async function getServerToken(): Promise<string> {
  const token = await getToken({
    req:    { headers: Object.fromEntries(await headers()) } as any,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (token?.error === "RefreshAccessTokenError") throw new Error("RefreshAccessTokenError");
  if (!token?.accessToken) throw new Error("Unauthenticated");

  return token.accessToken as string;
}
