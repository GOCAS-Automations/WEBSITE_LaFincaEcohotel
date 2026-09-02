import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Imágenes servidas desde Supabase Storage (bucket `imagenes`)
        protocol: "https",
        hostname: "yyfuhytmoiehqmnrekkq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
