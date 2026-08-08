/**
 * Rewrite a remote image URL to go through our same-origin image proxy
 * (/api/image), which fetches CDN images server-side so they actually load in
 * the browser. Local paths and empty values are returned untouched.
 */
export function proxied(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}
