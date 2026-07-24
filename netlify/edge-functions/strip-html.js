// Redirect any request that still ends in ".html" to its clean, extensionless
// URL (e.g. /about.html -> /about, /services/ed-treatment.html ->
// /services/ed-treatment). Netlify already SERVES the clean URLs via pretty-URL
// handling; this closes the gap so the ".html" variants 301 instead of serving
// duplicate content. One rule here covers every current and future page, which
// netlify.toml redirects cannot do (they have no working wildcard for a
// ".html" suffix).
export default async (request, context) => {
  const url = new URL(request.url);
  const { pathname } = url;

  // Only act on ".html" requests; everything else passes straight through.
  if (!pathname.endsWith(".html")) {
    return context.next();
  }

  // Leave the blog article template alone — it is served with a ?slug= query
  // (via the /blog/:slug rewrite) and must keep its extension.
  if (pathname === "/blog/article.html") {
    return context.next();
  }

  // Strip the ".html" suffix.
  let clean = pathname.slice(0, -".html".length);

  // Collapse "/index" (e.g. /locations/index.html) to its directory root.
  if (clean.endsWith("/index")) {
    clean = clean.slice(0, -"index".length); // keep the trailing slash
  }
  if (clean === "") {
    clean = "/";
  }

  url.pathname = clean;
  return Response.redirect(url.toString(), 301);
};

export const config = {
  path: "/*",
  // Skip assets and API/function routes so the function only runs on page URLs.
  excludedPath: [
    "/css/*",
    "/js/*",
    "/images/*",
    "/data/*",
    "/api/*",
    "/.netlify/*",
    "/*.xml",
    "/*.txt",
    "/*.json",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.svg",
    "/*.ico",
    "/*.webp",
  ],
};
