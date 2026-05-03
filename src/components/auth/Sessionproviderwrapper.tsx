"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SessionGuard from "@/components/auth/Sessionguard";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function SessionProviderWrapper({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SidebarProvider>
          <SessionGuard>{children}</SessionGuard>
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
