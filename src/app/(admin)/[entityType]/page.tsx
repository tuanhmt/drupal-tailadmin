"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/tables/Pagination";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import EyeIcon from "@/icons/eye.svg";
import PencilIcon from "@/icons/pencil.svg";
import TrashBinIcon from "@/icons/trash.svg";

interface EntityResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Generic entity list page
 * Route: /(admin)/[entityType]
 * Example: /articles, /users, /taxonomy/tags
 */
export default function EntityListPage({
  params,
}: {
  params: Promise<{ entityType: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { entityType } = use(params);

  const [entities, setEntities] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState(searchParams.get("filter") || "");

  const itemsPerPage = 10;

  // Format entity type for API (convert URL-friendly to Drupal format)
  const getApiEntityType = (type: string): string => {
    // /articles -> node--article
    // /users or /user -> user--user
    // /taxonomy/tags -> taxonomy_term--tags
    if (type.startsWith("taxonomy/")) {
      const vocab = type.replace("taxonomy/", "");
      return `taxonomy_term--${vocab}`;
    }
    if (type === "users" || type === "user") {
      return "user--user";
    }
    if (type.endsWith("s") && type !== "users") {
      // Plural to singular: articles -> article
      const singular = type.slice(0, -1);
      return `node--${singular}`;
    }
    return `node--${type}`;
  };

  const fetchEntities = async (page: number, searchFilter?: string) => {
    setLoading(true);
    setError(null);

    try {
      const apiEntityType = getApiEntityType(entityType);
      let url = `/api/${encodeURIComponent(apiEntityType)}?page=${page}&limit=${itemsPerPage}`;

      // Add filter if provided
      if (searchFilter) {
        // Try to filter by common fields (title, name, label)
        url += `&filter[title][value]=${encodeURIComponent(searchFilter)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/signin");
          return;
        }
        throw new Error("Failed to fetch entities");
      }

      const result: EntityResponse = await response.json();

      setEntities(result.data || []);
      setTotalItems(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      console.error("Error fetching entities:", err);
      setError("Failed to load entities. Please try again.");
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities(currentPage, filter);
    // Update URL with current page
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", currentPage.toString());
    if (filter) {
      params.set("filter", filter);
    } else {
      params.delete("filter");
    }
    router.replace(`/${entityType}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, entityType]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEntities(1, filter);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entity?")) {
      return;
    }

    try {
      const apiEntityType = getApiEntityType(entityType);
      const response = await fetch(
        `/api/${encodeURIComponent(apiEntityType)}?id=${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete entity");
      }

      // Refresh the list
      fetchEntities(currentPage, filter);
    } catch (err) {
      console.error("Error deleting entity:", err);
      alert("Failed to delete entity. Please try again.");
    }
  };

  // Get primary field value (title, name, label, etc.)
  const getPrimaryField = (entity: any): string => {
    return (
      entity.title ||
      entity.name ||
      entity.label ||
      entity.username ||
      entity.id ||
      "Untitled"
    );
  };

  // Get created date
  const getCreatedDate = (entity: any): string | null => {
    return entity.created ? formatDate(entity.created) : null;
  };

  // Format entity type label
  const getEntityLabel = (type: string): string => {
    if (type.startsWith("taxonomy/")) {
      const vocab = type.replace("taxonomy/", "");
      return vocab.charAt(0).toUpperCase() + vocab.slice(1);
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + entities.length;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={`${getEntityLabel(entityType)} Management`} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {getEntityLabel(entityType)}s
          </h1>
          <Link href={`/${entityType}/create`}>
            <Button>Create New</Button>
          </Link>
        </div>

        {/* Filter */}
        <form onSubmit={handleFilter} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            <Button type="submit">Search</Button>
            {filter && (
              <Button
                type="button"
                onClick={() => {
                  setFilter("");
                  setCurrentPage(1);
                  fetchEntities(1, "");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : entities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No entities found.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/3 dark:bg-white/3">
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/5">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Name
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Created
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                    {entities.map((entity) => (
                      <TableRow key={entity.id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div>
                            <h3 className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {getPrimaryField(entity)}
                            </h3>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {getCreatedDate(entity) || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/${entityType}/${entity.id}/view`}
                              className="inline-flex items-center justify-center text-gray-600 hover:text-brand-500 focus:outline-hidden dark:text-gray-400 dark:hover:text-brand-400 transition"
                              aria-label="View"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </Link>
                            <Link
                              href={`/${entityType}/${entity.id}/edit`}
                              className="inline-flex items-center justify-center text-gray-600 hover:text-brand-500 focus:outline-hidden dark:text-gray-400 dark:hover:text-brand-400 transition"
                              aria-label="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(entity.id)}
                              className="inline-flex items-center justify-center text-gray-600 hover:text-red-600 focus:outline-hidden dark:text-gray-400 dark:hover:text-red-400 transition"
                              aria-label="Delete"
                            >
                              <TrashBinIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1 mt-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {startIndex + 1} to {endIndex} of {totalItems} entries
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
