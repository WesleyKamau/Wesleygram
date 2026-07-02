import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No remotePatterns: every profile image is served through /api/image
  // (marked unoptimized on <Image>), and the only sources the Next image
  // optimizer touches are local files in /public. The previous
  // `hostname: "**"` made the optimizer an open proxy for any https host.
  images: {},
};

export default nextConfig;
