type SiteEnvironment = Record<string, string | undefined>;

/** Resolve one absolute origin for metadata, canonicals, and sitemap entries. */
export function resolveSiteUrl(
  environment: SiteEnvironment = process.env
): URL {
  const configured =
    environment.NEXT_PUBLIC_SITE_URL?.trim() ||
    environment.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    environment.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  const value = /^[a-z][a-z\d+.-]*:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function siteOrigin(environment?: SiteEnvironment): string {
  return resolveSiteUrl(environment).origin;
}
