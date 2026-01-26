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
      <PageBreadcrumb pageTitle={`${getEntityLabel(entityType)}`} />
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{getEntityLabel(entityType)}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">List of all {getEntityLabel(entityType)}</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition  px-6 py-3.5 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/3 dark:hover:text-gray-300 ">
              Export<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.667 13.3333V15.4166C16.667 16.1069 16.1074 16.6666 15.417 16.6666H4.58295C3.89259 16.6666 3.33295 16.1069 3.33295 15.4166V13.3333M10.0013 13.3333L10.0013 3.33325M6.14547 9.47942L9.99951 13.331L13.8538 9.47942" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            </button>
            <a className="bg-brand-500 shadow-sm hover inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600" href={`/${entityType}/create`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 10.0002H15.0006M10.0002 5V15.0006" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              Add {getEntityLabel(entityType)}
            </a>
          </div>
        </div>
        {/* End Header */}

        <div className="px-6 py-4 dark:border-gray-800">
          <div className="flex gap-3 sm:justify-between">
            <div className="relative flex-1 sm:flex-auto">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.04199 9.37336937363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z" fill="">
                </path>
              </svg>
              </span>
              <input placeholder="Search..." className="shadow-sm focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pr-4 pl-11 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-none sm:w-[300px] sm:min-w-[300px] dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30" type="text"></input>
              </div>
              <div className="relative">
                <button className="shadow-theme-xs flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 sm:w-auto sm:min-w-[100px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" type="button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M14.6537 5.90414C14.6537 4.48433 13.5027 3.33331 12.0829 3.33331C10.6631 3.33331 9.51206 4.48433 9.51204 5.90415M14.6537 5.90414C14.6537 7.32398 13.5027 8.47498 12.0829 8.47498C10.663 8.47498 9.51204 7.32398 9.51204 5.90415M14.6537 5.90414L17.7087 5.90411M9.51204 5.90415L2.29199 5.90411M5.34694 14.0958C5.34694 12.676 6.49794 11.525 7.91777 11.525C9.33761 11.525 10.4886 12.676 10.4886 14.0958M5.34694 14.0958C5.34694 15.5156 6.49794 16.6666 7.91778 16.6666C9.33761 16.6666 10.4886 15.5156 10.4886 14.0958M5.34694 14.0958L2.29199 14.0958M10.4886 14.0958L17.7087 14.0958" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    </path>
                  </svg>
                  Filter
                </button>
              </div>
            </div>
          </div>

        {/* Table */}
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
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="px-6 py-3.5 border-t border-gray-100 border-y bg-gray-50 dark:border-white/[0.05] dark:bg-gray-900">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="cursor-pointer px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="cursor-pointer px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Created
                    </TableCell>
                    <TableCell
                      isHeader
                      className="cursor-pointer px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                  {entities.map((entity) => (
                    <TableRow key={entity.id} className="transition hover:bg-gray-50 dark:hover:bg-gray-900">
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <h3 className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {getPrimaryField(entity)}
                          </h3>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {getCreatedDate(entity) || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 text-theme-sm dark:text-white/90">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center flex-col sm:flex-row justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
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
      {/* End Table */}
    </div>
  );
}
