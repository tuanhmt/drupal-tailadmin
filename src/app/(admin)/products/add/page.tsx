import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { ProductAddForm } from "./ProductAddForm";

export default function ProductAddPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Add Product" />
      <ComponentCard title="Products Description" headerActions={
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium whitespace-nowrap text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Back
        </Link>
      }
      bodyClassName="p-4 sm:p-6 dark:border-gray-800">
        <ProductAddForm />
      </ComponentCard>
    </div>
  );
}
