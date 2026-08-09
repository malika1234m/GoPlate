import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static resolves its binary path from __dirname at runtime;
  // it must stay an external require, not be inlined into the server bundle.
  serverExternalPackages: ["ffmpeg-static"],

  // goplate.app is the canonical host: QR codes and printed cards carry it, so
  // www must not serve a second copy of the site. 301 rather than `permanent:
  // true` (which is a 308) because this is the redirect crawlers expect.
  // goplate.up.railway.app is deliberately NOT redirected — shipped app builds
  // and already-printed QR codes still resolve through it.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.goplate.app" }],
        destination: "https://goplate.app/:path*",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
