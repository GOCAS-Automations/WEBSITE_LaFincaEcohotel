import type { Metadata } from "next";
import "./globals.css";

const urlSitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio),
  title: {
    default: "La Finca Eco Hotel — Cabañas y naturaleza cerca de Cali",
    template: "%s · La Finca Eco Hotel",
  },
  description:
    "Ecohotel de montaña a 45 minutos de Cali. Cabañas con vista a la montaña, jacuzzi, turco, piscina y senderos. Sumérgete en un bosque rodeado de neblina y aves.",
  keywords: [
    "ecohotel cerca de Cali",
    "cabañas con jacuzzi Valle del Cauca",
    "hotel Km 18 vía Buenaventura",
    "pasadía cerca de Cali",
  ],
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "La Finca Eco Hotel",
    title: "La Finca Eco Hotel — Cabañas y naturaleza cerca de Cali",
    description:
      "Ecohotel de montaña a 45 minutos de Cali. Paraíso escondido en el Valle del Cauca.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
