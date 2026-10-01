/**
 * De qué dirección sale el sitio en ESTA petición.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO BASTA `SITIO.url`
 * ---------------------------------------------------------------------------
 * Bold necesita dos direcciones absolutas: a dónde vuelve el huésped tras pagar
 * (`redirectionUrl`) y a dónde si abandona (`originUrl`). `SITIO.url` es la
 * canónica de producción, así que usarla a secas dejaría a quien prueba en
 * `localhost` —o en una vista previa de Vercel— volviendo al sitio publicado,
 * con una referencia que esa base no conoce.
 *
 * La documentación de Bold incluso lo contempla: «Debe ser una URL válida, debe
 * iniciar con el protocolo `https://` (…) **Para pruebas locales no usar
 * 127.0.0.1, en vez debe usar localhost**».
 *
 * ---------------------------------------------------------------------------
 * PERO LA CABECERA `Host` LA ESCRIBE QUIEN PIDE
 * ---------------------------------------------------------------------------
 * Cualquiera puede mandar `Host: sitio-del-atacante.com`. Si se usara tal cual,
 * esa dirección sería la de retorno del checkout. No hay un secreto que se fugue
 * —la referencia no confirma nada y la página de retorno solo consulta un
 * estado— pero es un redirector abierto con la marca del hotel delante, y eso se
 * usa para phishing.
 *
 * De ahí la lista blanca: solo se acepta el origen de la petición si es el
 * canónico, una vista previa de Vercel o `localhost`. Cualquier otra cosa cae a
 * `SITIO.url`, que es donde el sitio vive de verdad.
 */
import "server-only";

import { SITIO } from "../sitio";

/** ¿Este host es uno de los nuestros? */
function hostPropio(host: string): boolean {
  const limpio = host.toLowerCase().split(":")[0];
  if (limpio === "localhost") return true;

  /* El host canónico y su versión sin `www.`: el sitio se sirve en los dos. */
  const canonico = new URL(SITIO.url).hostname.toLowerCase();
  if (limpio === canonico) return true;
  if (limpio === canonico.replace(/^www\./, "")) return true;
  if (`www.${limpio}` === canonico) return true;

  /* Las vistas previas de Vercel, que cambian de nombre en cada despliegue. */
  if (limpio.endsWith(".vercel.app")) return true;

  return false;
}

/**
 * El origen (`esquema://host[:puerto]`) desde el que se sirvió esta petición,
 * sin barra final. Cae a `SITIO.url` si no se reconoce.
 */
export function origenDeLaPeticion(peticion: Request): string {
  const host =
    peticion.headers.get("x-forwarded-host") ?? peticion.headers.get("host") ?? "";

  if (!host || !hostPropio(host)) return SITIO.url;

  /* En Vercel llega `x-forwarded-proto: https`. En local, `http`. Lo que diga la
     URL de la petición es lo correcto en los dos casos y no hay que adivinarlo. */
  const protocolo =
    peticion.headers.get("x-forwarded-proto") ?? new URL(peticion.url).protocol.replace(":", "");

  return `${protocolo}://${host}`.replace(/\/+$/, "");
}
