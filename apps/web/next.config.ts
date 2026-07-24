import type { NextConfig } from "next";

function buildRemotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const patterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [];
  const urls = [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_MEDIA_URL,
    process.env.S3_PUBLIC_URL,
  ].filter(Boolean) as string[];

  for (const raw of urls) {
    try {
      const u = new URL(raw);
      patterns.push({
        protocol: u.protocol.replace(":", "") as "http" | "https",
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname: "/**",
      });
    } catch {
      /* ignore invalid URL */
    }
  }

  if (patterns.length === 0) {
    patterns.push({
      protocol: "http",
      hostname: "localhost",
      port: "4000",
      pathname: "/api/v1/media/**",
    });
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildRemotePatterns(),
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
