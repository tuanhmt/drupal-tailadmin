"use client";
// src/components/SessionGuard.tsx
//
// Watches the session context (kept fresh by SessionProvider's refetchInterval
// and refetchOnWindowFocus) and signs the user out the moment a dead token
// is detected.
//
// NO manual polling here — SessionProvider handles that via refetchInterval
// in SessionProviderWrapper. The data here is always in sync with the context.

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { DrupalSession } from "@/types/auth";

interface Props {
  children: React.ReactNode;
}

function isSessionDead(session: DrupalSession | null): boolean {
  if (!session) return false;
  if (session.error === "RefreshAccessTokenError") return true;
  if (session.tokenDeadAt && Date.now() >= session.tokenDeadAt) return true;
  return false;
}

export default function SessionGuard({ children }: Props) {
  // useSession() reads from the shared context populated by SessionProvider.
  // It does NOT make a network request on its own — SessionProvider's
  // refetchInterval and refetchOnWindowFocus drive the updates.
  const { data: session, status } = useSession() as {
    data:   DrupalSession | null;
    status: string;
  };

  const signingOut = useRef(false);

  useEffect(() => {
    if (signingOut.current)    return;  // already in progress
    if (status === "loading")  return;  // wait for initial fetch to complete
    if (status === "unauthenticated") return;  // not logged in — nothing to do

    if (isSessionDead(session)) {
      signingOut.current = true;
      console.warn("[SessionGuard] dead session detected — signing out", {
        error:       session?.error,
        tokenDeadAt: session?.tokenDeadAt,
      });
      // Refresh token is already dead on Drupal's side.
      // No point calling /api/auth/revoke — just clear the local cookie.
      signOut({ callbackUrl: "/login?error=SessionExpired" });
    }
  }, [session, status]);

  return <>{children}</>;
}
