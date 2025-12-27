import { NextDrupal } from "next-drupal"

// For development: accept self-signed certificates (like ddev)
// This is set at the Node.js process level to handle SSL certificate verification
// In production, this should be false for security
if (typeof process !== "undefined") {
  const isDevelopment = process.env.NODE_ENV !== "production"
  const acceptSelfSignedCerts =
    process.env.ACCEPT_SELF_SIGNED_CERTS === "true" || isDevelopment

  if (acceptSelfSignedCerts) {
    // Disable SSL certificate verification for development (ddev uses self-signed certs)
    // WARNING: Only use this in development, never in production!
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
  }
}

export const drupal = new NextDrupal(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL as string, {
  // Enable to use authentication
  auth: {
    clientId: process.env.DRUPAL_CLIENT_ID as string,
    clientSecret: process.env.DRUPAL_CLIENT_SECRET as string,
  },
  withAuth: true,
  debug: true,
})
