import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Route changes blur-dissolve and review titles morph between pages,
    // via React's <ViewTransition>.
    viewTransition: true,
  },
};

export default nextConfig;
