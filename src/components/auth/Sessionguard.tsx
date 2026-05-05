"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { DrupalSession } from "@/types/auth";
import { PUBLIC_PATHS } from "@/lib/auth/constants";

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
  const { data: session, status } = useSession() as {
    data:   DrupalSession | null;
    status: string;
  };

  const signingOut = useRef(false);

  useEffect(() => {
    if (signingOut.current) return;
    if (status === "loading") return;
    if (status === "unauthenticated") return;

    if (isSessionDead(session)) {
      signingOut.current = true;
      console.warn("[SessionGuard] signing out — session no longer valid", {
        error: session?.error,
        tokenDeadAt: session?.tokenDeadAt,
      });
      signOut({
        callbackUrl: `${PUBLIC_PATHS.SIGNIN}?error=SessionExpired`,
      });
    }
  }, [session, status]);

  return <>{children}</>;
}
