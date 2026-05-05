import Link from "next/link";
import ProductsTable from "@/components/products/ProductsTable";
import { productService } from "@/services/product.service";
import type { JsonApiQuery } from "@/lib/jsonapi/types";
import { JsonApiRequestError } from "@/lib/jsonapi/client";
import { PUBLIC_PATHS } from "@/lib/auth/constants";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";

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
        <PageBreadcrumb pageTitle="Products" />
        <ComponentCard title="Products">
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
