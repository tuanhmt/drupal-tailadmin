import Link from "next/link";
import { notFound } from "next/navigation";
import { productService } from "@/services/product.service";
import { JsonApiRequestError } from "@/lib/jsonapi/client";
import { ProductEditForm } from "./ProductEditForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProductEditPage({ params }: PageProps) {
  const { id } = await params;

  let product;
  try {
    const res = await productService.get(id);
    product = res.data;
  } catch (err) {
    if (err instanceof JsonApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const a = product.attributes ?? {};
  const initial = {
    id,
    title: (a.title as string) ?? "",
    body:
      (a.body as { value?: string } | undefined)?.value ??
      "",
    status: Boolean(a.status),
  };

  return (
    <div>
      <div className="page-header">
        <h1>Edit product</h1>
        <div className="row">
          <Link href={`/products/${id}`} className="btn secondary">
            Cancel
          </Link>
        </div>
      </div>

      <div className="card">
        <ProductEditForm initial={initial} />
      </div>
    </div>
  );
}
