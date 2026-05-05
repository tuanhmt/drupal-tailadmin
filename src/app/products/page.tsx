import Link from "next/link";
import { productService } from "@/services/product.service";
import type { JsonApiQuery } from "@/lib/jsonapi/types";
import { JsonApiRequestError } from "@/lib/jsonapi/client";

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

  const query: JsonApiQuery = {
    sort: "-created",
    page: { limit, offset },
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
        <div className="page-header">
          <h1>Products</h1>
          <span className="muted">
            {total !== null
              ? `${total} total`
              : `${products.length} on this page`}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="card muted">No products found.</div>
        ) : (
          <div className="product-grid">
            {products.map((p) => {
              const title = (p.attributes?.title as string) ?? "(untitled)";
              const price = p.attributes?.price as
                | { number?: string; currency_code?: string }
                | undefined;
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="card product-card"
                  style={{ display: "block" }}
                >
                  <h3>{title}</h3>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {p.id}
                  </div>
                  {price?.number && (
                    <div className="price" style={{ marginTop: 10 }}>
                      {formatPrice(price.number, price.currency_code)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <Pagination
          page={pageNum}
          limit={limit}
          hasNext={hasNext}
          hasPrev={hasPrev}
        />
      </div>
    );
  } catch (err) {
    return <ErrorPanel err={err} />;
  }
}

/* ----------------------- helpers / sub-components ----------------------- */

function Pagination({
  page,
  limit,
  hasNext,
  hasPrev,
}: {
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}) {
  return (
    <div className="pagination">
      {hasPrev ? (
        <Link
          className="btn secondary"
          href={`/products?page=${page - 1}&limit=${limit}`}
        >
          ← Prev
        </Link>
      ) : (
        <button className="btn secondary" disabled>
          ← Prev
        </button>
      )}
      <span className="info">Page {page}</span>
      {hasNext ? (
        <Link
          className="btn secondary"
          href={`/products?page=${page + 1}&limit=${limit}`}
        >
          Next →
        </Link>
      ) : (
        <button className="btn secondary" disabled>
          Next →
        </button>
      )}
    </div>
  );
}

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
        <Link href="/login?callbackUrl=/products" className="btn">
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
