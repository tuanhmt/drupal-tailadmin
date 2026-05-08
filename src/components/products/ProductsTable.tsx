"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import EntityTable from "@/components/tables/EntityTable";
import Pagination from "@/components/tables/Pagination";
import type { TProduct } from "@/services/product.service";

type ProductsTableProps = {
  products: TProduct[];
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  total: number | null;
  search: string;
};

function buildProductsHref(page: number, limit: number, search: string): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search.trim()) {
    params.set("q", search.trim());
  }
  return `/products?${params.toString()}`;
}

function formatPrice(amount: string, currency = "USD"): string {
  const num = Number.parseFloat(amount);
  if (!Number.isFinite(num)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}

export default function ProductsTable({
  products,
  page,
  limit,
  hasNext,
  hasPrev,
  total,
  search,
}: ProductsTableProps) {
  const router = useRouter();
  const columns = [
    {
      key: "title",
      header: "Title",
      render: (product: TProduct) => {
        const title = (product.attributes?.title as string) ?? "(untitled)";
        return (
          <Link
            href={`/products/${product.id}`}
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {title}
          </Link>
        );
      },
    },
    {
      key: "price",
      header: "Price",
      className: "text-gray-700 dark:text-gray-300",
      render: (product: TProduct) => {
        const price = product.attributes?.price as
          | { number?: string; currency_code?: string }
          | undefined;
        return price?.number ? formatPrice(price.number, price.currency_code) : "-";
      },
    },
  ];

  const toolbar = (
    <form action="/products" method="get" className="flex flex-col gap-3 sm:flex-row">
      <input type="hidden" name="limit" value={limit} />
      <input
        type="text"
        name="q"
        defaultValue={search}
        placeholder="Seach..."
        className="h-11 sm:w-[300px] sm:min-w-[300px] rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      {search ? (
        <Link
          href={buildProductsHref(1, limit, "")}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );

  const totalPages =
    total !== null
      ? Math.max(1, Math.ceil(total / limit))
      : hasNext
        ? page + 1
        : page;

  const footer = (
    <div className="py-4 px-5 flex items-center justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {total !== null ? `${total} total` : `${products.length} on this page`}
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(nextPage) =>
          router.push(buildProductsHref(nextPage, limit, search))
        }
      />
    </div>
  );

  return (
    <EntityTable
      columns={columns}
      items={products}
      getRowKey={(product) => product.id}
      emptyMessage="No products found."
      toolbar={toolbar}
      footer={footer}
    />
  );
}
