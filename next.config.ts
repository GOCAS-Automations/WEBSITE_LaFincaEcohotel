import type { NextConfig } from "next";

/**
 * Origen del bucket público de imágenes. Se deriva de la variable de entorno
 * para que un cambio de proyecto de Supabase no obligue a tocar este archivo.
 */
const origenSupabase = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://yyfuhytmoiehqmnrekkq.supabase.co",
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Imágenes servidas desde Supabase Storage (bucket `imagenes`)
        protocol: "https",
        hostname: origenSupabase.hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    /**
     * Anchos que Next puede generar. La lista por defecto trae ocho tamaños y
     * empieza en 640: aquí se recorta a los que el sitio usa de verdad y se
     * añade 390 (el ancho lógico de un iPhone actual), porque la mayoría de
     * los huéspedes llega desde el celular por redes y WhatsApp.
     */
    deviceSizes: [390, 640, 768, 1080, 1280, 1920],
    /** Tamaños para imágenes pequeñas (miniaturas de galería, avatares). */
    imageSizes: [64, 128, 256, 384],
    /**
     * Calidades permitidas. Next 15 exige declararlas: cualquier `quality`
     * fuera de esta lista falla en tiempo de compilación en vez de generar
     * silenciosamente una variante más.
     */
    qualities: [68, 75, 90],
    /**
     * 31 días de caché. Es seguro porque las fotos del bucket NUNCA se
     * sobrescriben: al subir una nueva se crea una ruta nueva, así que una URL
     * siempre devuelve la misma imagen.
     */
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
};

export default nextConfig;
