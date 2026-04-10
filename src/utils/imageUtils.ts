/**
 * Utility to convert matching relative paths into absolute URLs.
 * Considers relative paths starting with '/assets' and prepends API_URL.
 * If the path is already an absolute URL or null, it returns it as-is.
 */
export const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;

  // If it's already an absolute URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Prepend API_URL if it's a relative path starting with /assets
  if (path.startsWith('/assets')) {
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    // Remove trailing slash from apiUrl if present and ensure path starts with /
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  return path;
};
