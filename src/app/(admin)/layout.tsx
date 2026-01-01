import React from "react";
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
    <AdminLayoutClient>{children}</AdminLayoutClient>
  );
}
