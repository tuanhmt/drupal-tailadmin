import Link from "next/link";
import { notFound } from "next/navigation";
import { productService } from "@/services/product.service";
import { JsonApiRequestError } from "@/lib/jsonapi/client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DeleteProductButton } from "../DeleteProductButton";
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
  const title = (a.title as string) ?? "(untitled)";
  const initial = {
    id,
    title: (a.title as string) ?? "",
    body:
      (a.body as { value?: string } | undefined)?.value ??
      "",
    status: Boolean(a.status),
  };
  const actionTabClass =
    "inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-theme-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
  const backButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium whitespace-nowrap text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={title} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
          <Link href={`/products/${id}`} className={actionTabClass}>
            View
          </Link>
          <Link
            href={`/products/${id}/edit`}
            className={`${actionTabClass} shadow-theme-xs bg-white text-gray-900 dark:bg-gray-800 dark:text-white`}
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

      <ComponentCard
        title="Product Information"
        desc="Update the fields below and save your changes."
      >
        <ProductEditForm initial={initial} />
      </ComponentCard>
    </div>
  );
}
