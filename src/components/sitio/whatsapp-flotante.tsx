import { getContacto } from "@/lib/contenido";
import { enlaceWhatsapp } from "@/lib/whatsapp";

import { BotonWhatsappFlotante } from "./boton-whatsapp";

/**
 * Botón flotante de WhatsApp — envoltorio de servidor.
 *
 * Lee el número y el mensaje del CMS (`sitio.contacto`) en el servidor y le
 * pasa al cliente solo el enlace ya compuesto. Así el componente de navegador
 * no necesita saber nada de Supabase ni del formato del número, y el enlace ya
 * viene en el HTML: funciona aunque el JavaScript tarde en cargar.
 *
 * Va en el layout público, así que acompaña TODAS las páginas (§5 del plan:
 * "el botón de WhatsApp se mantiene en todo el sitio").
 */
export async function WhatsappFlotante() {
  const contacto = await getContacto();
  const enlace = enlaceWhatsapp(contacto.mensaje_whatsapp, contacto.whatsapp);

  return <BotonWhatsappFlotante enlace={enlace} />;
}
