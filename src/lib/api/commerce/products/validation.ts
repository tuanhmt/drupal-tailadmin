import { z } from "zod";

import { getProductResourceType } from "./config";

const productType = z
  .string()
  .refine((t) => t === getProductResourceType(), "Invalid JSON:API resource type");

/** Matches `TProductCreateInput` — body for createResource. */
export const productCreateSchema = z.object({
  data: z.object({
    type:    productType.optional(),
    attributes: z
      .object({
        title: z.string().min(1, "Title is required"),
      })
      .passthrough(),
    relationships: z.record(z.string(), z.unknown()).optional(),
  }),
});

/** Matches `TProductPatchInput` — body for updateResource. */
export const productPatchSchema = z.object({
  data: z.object({
    type:       productType,
    id:         z.string().min(1),
    attributes: z.record(z.string(), z.unknown()).optional(),
    relationships: z.record(z.string(), z.unknown()).optional(),
  }),
});

/** Optional JSON:API query string keys (pass-through to Drupal). */
export const productListParamsSchema = z
  .record(z.string(), z.string())
  .optional();
