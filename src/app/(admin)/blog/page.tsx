"use client";
import type { Metadata } from "next"
import PageBreadcrumb from "@/components/common/PageBreadCrumb"
import type { DrupalNode } from "next-drupal"
import { ArticleTeaser } from "@/components/drupal/ArticleTeaser"
import { useState, useEffect } from "react";
import { NextResponse } from "next/server";
import Pagination from "@/components/tables/Pagination";

interface ArticlesResponse {
  data: DrupalNode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}


export default function BlogPage() {
  const [articles, setArticles] = useState<DrupalNode[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;

  const fetchArticles = async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/articles?page=${page}&limit=${itemsPerPage}`
      );

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          // Redirect to login if not authenticated
          return NextResponse.redirect("/signin");
        }
        throw new Error("Failed to fetch articles");
      }

      const result: ArticlesResponse = await response.json();

      setArticles(result.data);
      setTotalItems(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      console.error("Error fetching articles:", err);
      setError("Failed to load articles. Please try again.");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + articles.length;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Blog" />

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Blog Articles
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading articles...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No articles found. Make sure your Drupal site is accessible and
              has article content.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleTeaser key={article.id} node={article} />
            ))}
          </div>
        )}
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
    </div>
  );
}
