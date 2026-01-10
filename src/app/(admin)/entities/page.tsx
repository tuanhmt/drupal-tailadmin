"use client";

import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { EntityTypeInfo } from "@/lib/drupal/openapi-parser";
import Button from "@/components/ui/button/Button";
import Link from "next/link";

/**
 * Admin page to view discovered entity types from OpenAPI metadata
 * This is useful for debugging and understanding what entities are available
 */
export default function EntitiesPage() {
  const [entities, setEntities] = useState<EntityTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/entities");

        if (!response.ok) {
          throw new Error("Failed to fetch entities");
        }

        const result = await response.json();
        setEntities(result.entities || []);
      } catch (err) {
        console.error("Error fetching entities:", err);
        setError("Failed to load entities. Please make sure you're authenticated.");
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, []);

  // Get admin path for entity type
  const getAdminPath = (entityType: string): string => {
    if (entityType.startsWith("node--")) {
      const type = entityType.replace("node--", "");
      return `/${type}s`;
    }
    if (entityType === "user--user") {
      return "/users";
    }
    return `/${entityType.replace("--", "-")}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Entity Types" />
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading entities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Entity Types" />
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Entity Types" />

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Discovered Entity Types
        </h1>

        {entities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No entities found. Make sure OpenAPI metadata is accessible.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {entities.map((entity) => (
              <div
                key={entity.machineName}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {entity.label}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {entity.machineName}
                    </p>
                  </div>
                  <Link href={getAdminPath(entity.machineName)}>
                    <Button>Manage</Button>
                  </Link>
                </div>

                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supported Operations:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {entity.supportedOperations.getCollection && (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        GET Collection
                      </span>
                    )}
                    {entity.supportedOperations.getIndividual && (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        GET Individual
                      </span>
                    )}
                    {entity.supportedOperations.post && (
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        POST
                      </span>
                    )}
                    {entity.supportedOperations.patch && (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        PATCH
                      </span>
                    )}
                    {entity.supportedOperations.delete && (
                      <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        DELETE
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Primary Field: <code className="text-xs">{entity.primaryField}</code>
                  </h3>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fields ({entity.fields.length}):
                  </h3>
                  <div className="max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {entity.fields.slice(0, 20).map((field) => (
                        <div
                          key={field.name}
                          className="rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {field.name}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {field.type}
                            {field.required && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {entity.fields.length > 20 && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        ... and {entity.fields.length - 20} more fields
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
