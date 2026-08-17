import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static resolves its binary path from __dirname at runtime;
  // it must stay an external require, not be inlined into the server bundle.
  // draco3dgltf and sharp load native/wasm binaries from their own package
  // directories for the same reason — bundling breaks those lookups.
  serverExternalPackages: ["ffmpeg-static", "draco3dgltf", "sharp"],

  // goplate.app is the canonical host: QR codes and printed cards carry it, so
  // www must not serve a second copy of the site. 301 rather than `permanent:
  // true` (which is a 308) because this is the redirect crawlers expect.
  // goplate.up.railway.app is deliberately NOT redirected — shipped app builds
  // and already-printed QR codes still resolve through it.
  /**
   * Baseline security headers.
   *
   * Framing is handled in two tiers on purpose. Customer menus stay embeddable,
   * because a restaurant putting its own /r/<slug> menu in an iframe on its
   * website is a legitimate thing to want. Everything an owner or admin signs
   * into is DENY: without it, an attacker's page could frame the back office
   * and trick a signed-in admin into clicking Approve or Activate — the clicks
   * carry their session, and those buttons move money and access.
   */
  async headers() {
    const baseline = [
      // Do not let a browser second-guess our declared content types.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Send the origin only, so upload and menu URLs don't leak in referrers.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Two years, subdomains included. Safe here: goplate.app is HTTPS-only.
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];

    return [
      { source: "/:path*", headers: baseline },
      {
        source: "/:path(admin|account|login|register|dashboard|forgot-password|reset-password)/:rest*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/:path(admin|account|login|register|dashboard|forgot-password|reset-password)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },

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
