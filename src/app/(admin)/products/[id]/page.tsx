import Link from "next/link";
import { notFound } from "next/navigation";
import { productService } from "@/services/product.service";
import { JsonApiRequestError } from "@/lib/jsonapi/client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { DeleteProductButton } from "./DeleteProductButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

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
  const actionTabClass =
    "inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-theme-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
  const backButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium whitespace-nowrap text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={title} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
          <Link
            href={`/products/${id}`}
            className={`${actionTabClass} shadow-theme-xs bg-white text-gray-900 dark:bg-gray-800 dark:text-white`}
          >
            View
          </Link>
          <Link
            href={`/products/${id}/edit`}
            className={actionTabClass}
          >
            Edit
          </Link>
          <DeleteProductButton
            id={id}
            className={`${actionTabClass} text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300`}
          />
        </div>
        <Link href="/products" className={backButtonClass}>
          Back
        </Link>
      </div>

      <ComponentCard title="Product Information"
      bodyClassName="p-4 sm:p-6 dark:border-gray-800">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="product-title">Title</Label>
            <Input id="product-title" disabled defaultValue={title} />
          </div>
          <div>
            <Label htmlFor="product-status">Status</Label>
            <Input
              id="product-status"
              disabled
              defaultValue={status ? "Published" : "Unpublished"}
            />
          </div>
          <div>
            <Label htmlFor="product-price">Price</Label>
            <Input
              id="product-price"
              disabled
              defaultValue={
                price?.number
                  ? `${price.number} ${price.currency_code ?? ""}`.trim()
                  : "-"
              }
            />
          </div>
          <div>
            <Label htmlFor="product-created">Created</Label>
            <Input
              id="product-created"
              disabled
              defaultValue={created ? new Date(created).toLocaleString() : "-"}
            />
          </div>
          <div>
            <Label htmlFor="product-updated">Updated</Label>
            <Input
              id="product-updated"
              disabled
              defaultValue={changed ? new Date(changed).toLocaleString() : "-"}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="product-description">Description</Label>
          <textarea
            id="product-description"
            rows={8}
            disabled
            value={body?.value ?? ""}
            readOnly
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
          />
        </div>
      </ComponentCard>
    </div>
  );
}
