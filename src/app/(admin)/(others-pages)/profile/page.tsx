"use client";

import { useState, useEffect } from "react";
import UserAddressCard from "@/components/user-profile/UserAddressCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useRouter } from "next/navigation";
import { AUTH_PATHS } from "@/lib/auth/constants";

interface User {
  id: string;
  type: string;
  attributes: {
    name?: string;
    mail?: string;
    created?: number;
    changed?: number;
    status?: boolean;
    timezone?: string;
    [key: string]: any;
  };
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/user/me");

        if (!response.ok) {
          if (response.status === 401) {
            router.push(AUTH_PATHS.SIGNIN);
            return;
          }
          throw new Error("Failed to fetch user");
        }

        const result = await response.json();
        setUser(result.data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to load user profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Profile" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Profile" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400">
              {error || "User not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pass user data to components
  const userData = {
    name: user.attributes.name || "User",
    email: user.attributes.mail || "",
    created: user.attributes.created,
    changed: user.attributes.changed,
    status: user.attributes.status,
    timezone: user.attributes.timezone,
    ...user.attributes,
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard user={userData} />
          <UserInfoCard user={userData} />
          <UserAddressCard />
        </div>
      </div>
    </div>
  );
}
