import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // extiende el timeout del servidor para requests largas
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
