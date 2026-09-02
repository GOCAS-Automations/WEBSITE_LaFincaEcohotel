import type { Metadata } from "next";

import { PaginaContacto } from "@/components/paginas/contacto";
import { getContacto, getHeroesListados } from "@/lib/contenido";
import { metadatosPagina } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [heroes, contacto] = await Promise.all([
    getHeroesListados(),
    getContacto(),
  ]);
  const hero = heroes.contacto;

  return metadatosPagina({
    titulo: "Contacto",
    descripcion: `Escríbenos por WhatsApp al ${contacto.whatsapp_visible}. La Finca Eco Hotel está en el Km 18 vía Cali–Buenaventura, Vereda Loma Alta.`,
    ruta: "/contacto",
    imagen: { url: hero.imagen, alt: hero.imagen_alt },
  });
}

export default function Contacto() {
  return <PaginaContacto />;
}
