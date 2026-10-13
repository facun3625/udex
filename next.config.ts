import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Imágenes de productos y certificados de ARCA viajan como multipart/form-data.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
