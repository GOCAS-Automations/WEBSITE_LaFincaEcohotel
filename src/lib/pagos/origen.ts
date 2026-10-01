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

  /*
    El host canónico, comparado SIN `www.` en los dos lados. El dominio real
    resuelve en las dos formas —`www` devuelve un 308 al apex— y cuál de las dos
    es la canónica ha cambiado ya una vez: comparar los dos recortados evita que
    el día que vuelva a cambiar esto deje de reconocer el sitio propio.
  */
  const sinWww = (host: string) => host.replace(/^www\./, "");
  const canonico = new URL(SITIO.url).hostname.toLowerCase();
  if (sinWww(limpio) === sinWww(canonico)) return true;

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

/**
 * El origen que se le puede dar a BOLD, que **siempre** es `https://`.
 *
 * ---------------------------------------------------------------------------
 * LA CAUSA DEL BTN-001 (2026-10-01)
 * ---------------------------------------------------------------------------
 * `origenDeLaPeticion()` devuelve `http://localhost:3000` en desarrollo, que es
 * lo correcto para cualquier otra cosa y **lo que Bold rechaza**. Su checkout no
 * abría y la pantalla decía «Something went wrong… BTN-001»; la consola del
 * navegador, el detalle exacto:
 *
 *     Bold Payment Button: 'http://localhost:3000/reservar/confirmacion?ref=…'
 *     is not a valid value for the 'data-redirection-url' attribute.
 *
 * La documentación de la integración manual pide «Valid HTTPS URL» para
 * `data-redirection-url` y `data-origin-url`, y eso incluye a `localhost`: no
 * hay excepción para desarrollo. (Sí la hay para la forma del host: «Para
 * pruebas locales no usar 127.0.0.1, en vez debe usar localhost» — pero el
 * esquema tiene que ser `https` igual, y en local no hay TLS.)
 *
 * ---------------------------------------------------------------------------
 * QUÉ SE HACE ENTONCES EN LOCAL
 * ---------------------------------------------------------------------------
 * Se cae al dominio real (`SITIO.url`). No es un apaño: **la base de datos es la
 * misma** en local y en producción, así que al volver del pago la página de
 * retorno del sitio publicado encuentra la referencia, consulta el estado a la
 * API de Bold y pinta el comprobante correcto. Lo único que cambia es en qué
 * dominio termina el navegador.
 *
 * `BOLD_URL_RETORNO` permite apuntar a otro sitio https —un túnel de ngrok, una
 * vista previa de Vercel— cuando se quiera depurar el retorno sin salir del
 * equipo. Si lo que trae no es https, se ignora: antes el dominio real que un
 * BTN-001.
 */
export function origenParaBold(peticion: Request): string {
  const propuestos = [
    process.env.BOLD_URL_RETORNO?.trim(),
    origenDeLaPeticion(peticion),
    SITIO.url,
    /* El último recurso, por si `NEXT_PUBLIC_SITE_URL` quedara mal puesta en
       algún despliegue: el dominio del hotel escrito a mano. Vale más un retorno
       al sitio equivocado que una pasarela que no abre. */
    "https://lafincaecohotel.com",
  ];

  for (const candidato of propuestos) {
    if (!candidato) continue;
    let url: URL;
    try {
      url = new URL(candidato);
    } catch {
      continue;
    }
    if (url.protocol !== "https:") continue;
    return candidato.replace(/\/+$/, "");
  }

  /* Inalcanzable: el último candidato es una constante https. */
  return "https://lafincaecohotel.com";
}
