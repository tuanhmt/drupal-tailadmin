import type { ProductDefaultType } from "./types";

/** JSON:API resource type for the default product bundle. */
export const PRODUCT_DEFAULT_TYPE: ProductDefaultType = "commerce_product--default";

export function getProductResourceType(): ProductDefaultType {
  const fromEnv = process.env.PRODUCT_RESOURCE_TYPE;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv as ProductDefaultType;
  }
  return PRODUCT_DEFAULT_TYPE;
}
