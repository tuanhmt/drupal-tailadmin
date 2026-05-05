import Link from "next/link";
import { notFound } from "next/navigation";
import { productService } from "@/services/product.service";
import { JsonApiRequestError } from "@/lib/jsonapi/client";
import { DeleteProductButton } from "./DeleteProductButton";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = params;

  let product;
  try {
    const res = await productService.getDetail(id);
    product = res.data;
  } catch (err) {
    if (err instanceof JsonApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const a = product.attributes ?? {};
  const title = (a.title as string) ?? "(untitled)";
  const body = a.body as { processed?: string; value?: string } | undefined;
  const price = a.price as
    | { number?: string; currency_code?: string }
    | undefined;
  const status = Boolean(a.status);
  const created = a.created as string | undefined;
  const changed = a.changed as string | undefined;

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <div className="row">
          <Link href={`/products/${id}/edit`} className="btn">
            Edit
          </Link>
          <DeleteProductButton id={id} />
          <Link href="/products" className="btn secondary">
            Back
          </Link>
        </div>
      </div>

      <div className="card">
        <dl className="kv">
          <dt>ID</dt>
          <dd>
            <code>{id}</code>
          </dd>

          <dt>Type</dt>
          <dd>
            <code>{product.type}</code>
          </dd>

          <dt>Status</dt>
          <dd>{status ? "Published" : "Unpublished"}</dd>

          {price?.number && (
            <>
              <dt>Price</dt>
              <dd>
                {price.number} {price.currency_code ?? ""}
              </dd>
            </>
          )}

          {created && (
            <>
              <dt>Created</dt>
              <dd>{new Date(created).toLocaleString()}</dd>
            </>
          )}

          {changed && (
            <>
              <dt>Updated</dt>
              <dd>{new Date(changed).toLocaleString()}</dd>
            </>
          )}
        </dl>

        {(body?.processed || body?.value) && (
          <>
            <hr
              style={{
                border: 0,
                borderTop: "1px solid var(--border)",
                margin: "20px 0",
              }}
            />
            <div
              dangerouslySetInnerHTML={{
                __html: body.processed ?? body.value ?? "",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
