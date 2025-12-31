import React from "react";
import AuthWrapper from "@/components/auth/AuthWrapper";
import AdminLayoutClient from "./AdminLayoutClient";

/**
 * Admin Layout (Server Component)
 *
 * Wraps admin pages with authentication check.
 * Uses AuthWrapper to verify token before rendering client layout.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AuthWrapper>
  );
}
