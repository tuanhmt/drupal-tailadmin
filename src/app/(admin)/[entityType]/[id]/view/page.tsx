"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import Button from "@/components/ui/button/Button";

/**
 * Generic entity view page
 * Route: /(admin)/[entityType]/[id]/view
 */
export default function EntityViewPage({
  params,
}: {
  params: Promise<{ entityType: string; id: string }>;
}) {
  const router = useRouter();
  const { entityType, id } = use(params);

  const [entity, setEntity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format entity type for API
  const getApiEntityType = (type: string): string => {
    if (type.startsWith("taxonomy/")) {
      const vocab = type.replace("taxonomy/", "");
      return `taxonomy_term--${vocab}`;
    }
    if (type === "users" || type === "user") {
      return "user--user";
    }
    if (type.endsWith("s") && type !== "users") {
      const singular = type.slice(0, -1);
      return `node--${singular}`;
    }
    return `node--${type}`;
  };

  useEffect(() => {
    const fetchEntity = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiEntityType = getApiEntityType(entityType);
        const response = await fetch(
          `/api/${encodeURIComponent(apiEntityType)}?id=${id}`
        );

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/signin");
            return;
          }
          if (response.status === 404) {
            setError("Entity not found");
            return;
          }
          throw new Error("Failed to fetch entity");
        }

        const result = await response.json();
        setEntity(result.data);
      } catch (err) {
        console.error("Error fetching entity:", err);
        setError("Failed to load entity. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEntity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, entityType]);

  const getPrimaryField = (entity: any): string => {
    return (
      entity?.title ||
      entity?.name ||
      entity?.label ||
      entity?.username ||
      entity?.id ||
      "Untitled"
    );
  };

  // Format entity type label
  const getEntityLabel = (type: string): string => {
    if (type.startsWith("taxonomy/")) {
      const vocab = type.replace("taxonomy/", "");
      return vocab.charAt(0).toUpperCase() + vocab.slice(1);
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Render field value
  const renderFieldValue = (value: any): string | React.ReactNode => {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value.map((v, i) => (
          <span key={i}>
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
            {i < value.length - 1 && ", "}
          </span>
        ));
      }
      if (value.uri?.url) {
        return <a href={value.uri.url}>{value.uri.url}</a>;
      }
      if (value.display_name) {
        return value.display_name;
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Loading..." />
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading entity...</p>
        </div>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Error" />
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400">
            {error || "Entity not found"}
          </p>
          <Link href={`/${entityType}`} className="mt-4 inline-block">
            <Button>Back to List</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get all fields from entity
  const fields = Object.entries(entity.attributes || entity || {}).filter(
    ([key]) => !key.startsWith("_") && key !== "id" && key !== "type"
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={getPrimaryField(entity)} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {getPrimaryField(entity)}
          </h1>
          <div className="flex gap-2">
            <Link href={`/${entityType}/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
            <Link href={`/${entityType}`}>
              <Button variant="outline">Back to List</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                ID
              </label>
              <p className="text-gray-900 dark:text-white">{entity.id}</p>
            </div>
            {entity.type && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                  Type
                </label>
                <p className="text-gray-900 dark:text-white">{entity.type}</p>
              </div>
            )}
            {entity.created && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                  Created
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(entity.created)}
                </p>
              </div>
            )}
            {entity.changed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                  Updated
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(entity.changed)}
                </p>
              </div>
            )}
          </div>

          {/* Dynamic fields */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fields
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {fields.map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}
                  </label>
                  <p className="text-gray-900 dark:text-white break-words">
                    {renderFieldValue(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
