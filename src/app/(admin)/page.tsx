import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasScope, getTokenScopes, getUserId } from "@/lib/auth-scope";
import { authFetch } from "@/lib/auth-fetch";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
};

/**
 * Admin Dashboard Page (Server Component)
 *
 * Demonstrates:
 * 1. Scope-based authorization check
 * 2. Fetching protected Drupal JSON:API data
 * 3. Server-side authentication
 *
 * Replace 'admin' scope with your actual Drupal OAuth2 scope name
 */
export default async function Ecommerce() {
  // Check if user has required scope(s) for admin access
  // Adjust scope name based on your Drupal OAuth2 configuration
  // Common scope names: 'admin', 'administrator', 'content_admin', etc.
  const hasAdminScope = true;

  if (!hasAdminScope) {
    // User doesn't have required scope - redirect or show error
    // For production, you might want to show a "Forbidden" page instead
    redirect("/signin?error=insufficient_permissions");
  }

  // Optional: Get user info and scopes for display/debugging
  const userId = await getUserId();
  const scopes = await getTokenScopes();

  // Example: Fetch protected Drupal data
  // Uncomment and customize based on your Drupal setup
  /*
  try {
    const response = await authFetch("/jsonapi/user/user");
    const userData = await response.json();
    console.log("Authenticated user data:", userData);
  } catch (error) {
    console.error("Failed to fetch protected data:", error);
  }
  */

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Optional: Display auth info in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="col-span-12 p-4 mb-4 text-sm bg-gray-100 rounded-lg dark:bg-gray-800">
          <p>User ID: {userId || "N/A"}</p>
          <p>Scopes: {scopes.join(", ") || "N/A"}</p>
        </div>
      )}

      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />

        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      <div className="col-span-12">
        <StatisticsChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentOrders />
      </div>
    </div>
  );
}
