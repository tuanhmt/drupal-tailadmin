import { makeJsonApiCrud } from "@/lib/jsonapi/crud";
import { jsonApi } from "@/lib/jsonapi/client";
import type {
  JsonApiResource,
  JsonApiQuery,
} from "@/lib/jsonapi/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Drupal Commerce stores prices as `{ number: string, currency_code: string }`.
 * The exact attribute name depends on how the product type is configured
 * (variations carry the price; default products may expose a computed one).
 */
export interface TPrice {
  number: string;
  currency_code: string;
  formatted?: string;
}

/**
 * Attributes for `commerce_product--default`. This is intentionally a
 * superset of common fields — adjust to match your Drupal schema. All
 * fields are optional because Drupal returns sparse fieldsets and field
 * permissions vary per role.
 */
export interface TProductAttributes {
  drupal_internal__product_id?: number;
  title?: string;
  body?: { value?: string; format?: string; processed?: string; summary?: string };
  status?: boolean;
  created?: string;
  changed?: string;
  path?: { alias?: string; pid?: number; langcode?: string };
  /** Convenience price attribute if exposed on the product. */
  price?: TPrice;
  /** Allow unknown extra fields without losing type safety on known ones. */
  [k: string]: unknown;
}

/**
 * Fully-typed product resource. Includes JSON:API `id`, `type`, and
 * (optional) relationships.
 */
export type TProduct = JsonApiResource<TProductAttributes>;
export type TStore = JsonApiResource<{ is_default?: boolean; name?: string }>;

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

/**
 * Underlying CRUD helper for `commerce_product--default`.
 * The service below exposes higher-level methods on top of this.
 */
export const productCrud = makeJsonApiCrud<TProductAttributes>({
  resourceType: "commerce_product--default",
  resourcePath: "commerce_product/default",
});

/**
 * Default query used when listing products. Tune as needed.
 */
const DEFAULT_LIST_QUERY: JsonApiQuery = {
  sort: "-created",
  page: { limit: 20, offset: 0 },
  // Include common relationships that pages typically render.
  // Comment out if your schema doesn't expose them.
  // include: ["variations", "stores"],
};

export const productService = {
  ...productCrud,

  /**
   * List products with sane defaults merged in.
   */
  list(query?: JsonApiQuery, opts?: Parameters<typeof productCrud.list>[1]) {
    return productCrud.list({ ...DEFAULT_LIST_QUERY, ...query }, opts);
  },

  /**
   * Fetch a product with relationships included for the detail page.
   */
  getDetail(id: string, opts?: Parameters<typeof productCrud.get>[2]) {
    return productCrud.get(
      id,
      {
        // include: ["variations", "stores"],
      },
      opts,
    );
  },

  /**
   * Fetch the default store from `/jsonapi/store` (`is_default = true`).
   */
  async getDefaultStore(
    opts?: Parameters<typeof jsonApi.getCollection>[2],
  ): Promise<TStore | null> {
    const res = await jsonApi.getCollection<{ is_default?: boolean; name?: string }>(
      "store",
      {
        filter: { is_default: true },
        page: { limit: 1, offset: 0 },
      },
      opts,
    );
    return (res.data[0] as TStore | undefined) ?? null;
  },
};

export type TProductService = typeof productService;
