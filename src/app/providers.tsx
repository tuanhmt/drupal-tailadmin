"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";

/**
 * Wraps the app with NextAuth's SessionProvider so client components
 * can read the session via `useSession()`.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider><ThemeProvider><SidebarProvider>{children}</SidebarProvider></ThemeProvider></SessionProvider>;
}
