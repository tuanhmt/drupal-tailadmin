import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { ProductAddForm } from "./ProductAddForm";

export default function ProductAddPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Add Product" />
      <ComponentCard
        title="Add Product"
        bodyClassName="p-4 sm:p-6 dark:border-gray-800"
        desc="Add a new product to your store."
      >
        <ProductAddForm />
      </ComponentCard>
    </div>
  );
}
