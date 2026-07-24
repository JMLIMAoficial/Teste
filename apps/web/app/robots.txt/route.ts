const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/v1/seo/robots.txt`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("robots failed");
    const text = await res.text();
    return new Response(text, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return new Response("User-agent: *\nAllow: /\n", {
      headers: { "Content-Type": "text/plain" },
    });
  }
}
