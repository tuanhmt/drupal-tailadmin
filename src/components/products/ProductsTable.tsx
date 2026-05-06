import Link from "next/link";

import EntityTable from "@/components/tables/EntityTable";
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
        placeholder="Search by title..."
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Search
      </button>
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

  const footer = (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {total !== null ? `${total} total` : `${products.length} on this page`}
      </div>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            href={buildProductsHref(page - 1, limit, search)}
          >
            Prev
          </Link>
        ) : (
          <button
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-400 dark:border-gray-700"
            disabled
          >
            Prev
          </button>
        )}

        <span className="px-2 text-sm text-gray-500 dark:text-gray-400">
          Page {page}
        </span>

        {hasNext ? (
          <Link
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            href={buildProductsHref(page + 1, limit, search)}
          >
            Next
          </Link>
        ) : (
          <button
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-400 dark:border-gray-700"
            disabled
          >
            Next
          </button>
        )}
      </div>
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
