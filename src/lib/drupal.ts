import { NextDrupal } from "next-drupal";

/**
 * Default Drupal client (unauthenticated)
 * Use for public requests only
 */
export const drupal = new NextDrupal(
  process.env.NEXT_PUBLIC_DRUPAL_BASE_URL!, {}
);
