export function formatDate(input: string): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function absoluteUrl(input: string) {
  const baseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL || ''
  // Remove trailing slash from baseUrl and leading slash from input to avoid double slashes
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const cleanInput = input.startsWith('/') ? input : `/${input}`
  return `${cleanBaseUrl}${cleanInput}`
}
