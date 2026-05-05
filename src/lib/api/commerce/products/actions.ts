"use server";

import type { JsonApiCreateResourceBody, JsonApiUpdateResourceBody } from "next-drupal";
import { JsonApiErrors } from "next-drupal";
import { ZodError } from "zod";

import { getProductResourceType } from "./config";
import { ProductApiError } from "./helpers";
import * as productQueries from "./queries";
import type {
  ActionResult,
  TProduct,
  TProductCollection,
  TProductCreateInput,
  TProductPatchInput,
  TJsonApiListParams,
} from "./types";
import {
  productCreateSchema,
  productListParamsSchema,
  productPatchSchema,
} from "./validation";

function toFailure(e: unknown): ActionResult<never> {
  if (e instanceof ProductApiError) {
    return { ok: false, error: e.message, status: e.status };
  }
  if (e instanceof JsonApiErrors) {
    return { ok: false, error: e.message, status: e.statusCode };
  }
  if (e instanceof ZodError) {
    return { ok: false, error: e.message, status: 422 };
  }
  console.error("[api/commerce/products]", e);
  return { ok: false, error: "Unexpected error", status: 500 };
}

export async function getProductsAction(
  params?: TJsonApiListParams
): Promise<ActionResult<TProductCollection>> {
  try {
    const parsed = productListParamsSchema.parse(
      params === undefined ? undefined : params
    );
    const data = await productQueries.getProducts(parsed);
    return { ok: true, data };
  } catch (e) {
    return toFailure(e);
  }
}

export async function getProductAction(
  id: string
): Promise<ActionResult<TProduct>> {
  if (!id?.trim()) {
    return { ok: false, error: "Product id is required", status: 400 };
  }
  try {
    const data = await productQueries.getProduct(id.trim());
    return { ok: true, data };
  } catch (e) {
    return toFailure(e);
  }
}

export async function createProductAction(
  input: TProductCreateInput
): Promise<ActionResult<TProduct>> {
  try {
    const parsed = productCreateSchema.parse(input);
    const type = getProductResourceType();
    const body: JsonApiCreateResourceBody = {
      data: {
        ...parsed.data,
        type: parsed.data.type ?? type,
      },
    } as JsonApiCreateResourceBody;
    const data = await productQueries.createProduct(body);
    return { ok: true, data };
  } catch (e) {
    return toFailure(e);
  }
}

export async function updateProductAction(
  input: TProductPatchInput
): Promise<ActionResult<TProduct>> {
  try {
    const parsed = productPatchSchema.parse(input);
    const body: JsonApiUpdateResourceBody = {
      data: parsed.data,
    } as JsonApiUpdateResourceBody;
    const data = await productQueries.updateProduct(
      parsed.data.id,
      body
    );
    return { ok: true, data };
  } catch (e) {
    return toFailure(e);
  }
}

export async function deleteProductAction(
  id: string
): Promise<ActionResult<{ deleted: boolean }>> {
  if (!id?.trim()) {
    return { ok: false, error: "Product id is required", status: 400 };
  }
  try {
    const deleted = await productQueries.deleteProduct(id.trim());
    if (!deleted) {
      return { ok: false, error: "Product not found or not deleted", status: 404 };
    }
    return { ok: true, data: { deleted: true } };
  } catch (e) {
    return toFailure(e);
  }
}
