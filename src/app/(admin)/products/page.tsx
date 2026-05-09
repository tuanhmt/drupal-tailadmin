import Link from "next/link";
import ProductsTable from "@/components/products/ProductsTable";
import { productService } from "@/services/product.service";
import type { JsonApiQuery } from "@/lib/jsonapi/types";
import { JsonApiRequestError } from "@/lib/jsonapi/client";
import { PUBLIC_PATHS } from "@/lib/auth/constants";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DownloadIcon, PlusIcon } from "@/icons";

type SearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  searchParams?: SearchParams;
}

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

const DEFAULT_LIMIT = 20;

export const dynamic = "force-dynamic"; // always show fresh, authenticated data

export default async function ProductsPage({ searchParams }: PageProps) {
  const limit = clampInt(pickStr(searchParams?.limit), DEFAULT_LIMIT, 1, 100);
  const pageNum = clampInt(pickStr(searchParams?.page), 1, 1, 9_999);
  const offset = (pageNum - 1) * limit;
  const titleQuery = (pickStr(searchParams?.q) ?? "").trim();

  const query: JsonApiQuery = {
    sort: "-created",
    page: { limit, offset },
    ...(titleQuery ? { filter: { title: titleQuery } } : {}),
  };

  try {
    const res = await productService.list(query);
    const products = res.data;
    const total =
      typeof res.meta?.count === "number" ? (res.meta.count as number) : null;
    const hasNext = !!res.links?.next;
    const hasPrev = pageNum > 1;

    return (
      <div>
        <PageBreadcrumb pageTitle="Products List" />
        <ComponentCard
          title="Products List"
          desc="Track your store's progress to boost your sales."
          headerActions={
            <>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/3 dark:hover:text-gray-300"
              >
                Export
                <DownloadIcon className="h-5 w-5" />
              </button>
              <Link
                href="/products/add"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                <PlusIcon className="h-5 w-5" />
                Add Product
              </Link>
            </>
          }
        >
          <ProductsTable
            products={products}
            page={pageNum}
            limit={limit}
            hasNext={hasNext}
            hasPrev={hasPrev}
            total={total}
            search={titleQuery}
          />
        </ComponentCard>
      </div>
    );
  } catch (err) {
    return <ErrorPanel err={err} />;
  }
}

/* ----------------------- helpers / sub-components ----------------------- */

function ErrorPanel({ err }: { err: unknown }) {
  const isAuth =
    err instanceof JsonApiRequestError && (err.status === 401 || err.status === 403);

  return (
    <div className="card">
      <h1>Couldn&rsquo;t load products</h1>
      <p className="muted">
        {isAuth
          ? "Your session may have expired. Please sign in again."
          : err instanceof Error
            ? err.message
            : "Unknown error."}
      </p>
      {isAuth && (
        <Link href={PUBLIC_PATHS.SIGNIN} className="btn">
          Sign in
        </Link>
      )}
    </div>
  );
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
