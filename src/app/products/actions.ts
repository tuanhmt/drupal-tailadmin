"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { productService, type TProductAttributes } from "@/services/product.service";
import { JsonApiRequestError } from "@/lib/jsonapi/client";

/**
 * Server Actions for the product UI. All run server-side, so the bearer
 * token is read from the cookie-bound NextAuth session and never exposed
 * to the browser.
 */

export type TProductActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Update a product. Designed to be called from a `<form action={updateProduct}>`
 * with hidden `id` and string fields for the editable attributes.
 */
export async function updateProductAction(
  _prev: TProductActionResult | undefined,
  formData: FormData,
): Promise<TProductActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing product id." };

  const title = (formData.get("title") ?? "").toString().trim();
  const bodyValue = (formData.get("body") ?? "").toString();
  const statusRaw = formData.get("status");

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  const attributes: Partial<TProductAttributes> = {
    title,
    status: statusRaw === "on" || statusRaw === "true" || statusRaw === "1",
  };

  if (bodyValue.length > 0) {
    attributes.body = { value: bodyValue, format: "basic_html" };
  }

  try {
    await productService.update(id, attributes);
  } catch (err) {
    return { ok: false, error: formatJsonApiError(err) };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidatePath(`/products/${id}/edit`);
  return { ok: true };
}

/**
 * Delete a product, then redirect to /products.
 */
export async function deleteProductAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await productService.remove(id);
  } catch (err) {
    // Re-throw so Next.js shows the error boundary; alternatively log and
    // return a structured result if you'd like a softer UX.
    throw new Error(formatJsonApiError(err));
  }

  revalidatePath("/products");
  redirect("/products");
}

function formatJsonApiError(err: unknown): string {
  if (err instanceof JsonApiRequestError) {
    if (err.errors.length > 0) {
      return err.errors
        .map((e) => e.detail ?? e.title ?? `HTTP ${err.status}`)
        .join("; ");
    }
    return `Request failed (${err.status}).`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error.";
}
