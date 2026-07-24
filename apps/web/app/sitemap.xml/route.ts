const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/v1/seo/sitemap.xml`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("sitemap failed");
    const xml = await res.text();
    return new Response(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch {
    const domain = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${domain}</loc></url>
</urlset>`;
    return new Response(fallback, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}
