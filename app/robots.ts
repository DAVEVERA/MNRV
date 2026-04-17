import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://mnrv.nl/sitemap.xml",
    host: "https://mnrv.nl",
  };
}
