import Image from "next/image";
import Link from "next/link";

import { getContacto } from "@/lib/contenido";
import { DOCUMENTOS_LEGALES, NAVEGACION, SITIO } from "@/lib/sitio";
import { enlaceWhatsapp } from "@/lib/whatsapp";

import {
  IconoFacebook,
  IconoInstagram,
  IconoReloj,
  IconoTiktok,
  IconoUbicacion,
  IconoWhatsapp,
} from "./iconos";

/**
 * Pie de página.
 *
 * El **RNT 114565** aparece aquí porque es una obligación legal para los
 * prestadores de servicios turísticos en Colombia, no un adorno: si se cae de
 * la plantilla, el sitio queda en falta. Por eso se lee del CMS con respaldo en
 * código y nunca puede quedar vacío.
 */
export async function Pie() {
  const contacto = await getContacto();
  const anio = new Date().getFullYear();

  const redes = [
    contacto.instagram && {
      href: contacto.instagram,
      etiqueta: `Instagram ${contacto.instagram_usuario}`,
      Icono: IconoInstagram,
    },
    contacto.facebook && {
      href: contacto.facebook,
      etiqueta: "Facebook de La Finca Eco Hotel",
      Icono: IconoFacebook,
    },
    contacto.tiktok && {
      href: contacto.tiktok,
      etiqueta: `TikTok ${contacto.tiktok_usuario}`,
      Icono: IconoTiktok,
    },
  ].filter(Boolean) as {
    href: string;
    etiqueta: string;
    Icono: (props: { className?: string }) => React.ReactElement;
  }[];

  return (
    <footer className="border-t border-petroleo-800/40 bg-petroleo-900 text-crema-100">
      <div className="contenedor py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Marca y contacto */}
          <div className="flex flex-col gap-5">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label={`${SITIO.nombre} — ir al inicio`}
            >
              <Image
                src="/marca/icono.png"
                alt=""
                width={513}
                height={513}
                className="size-11 object-contain brightness-0 invert"
              />
              <span className="flex flex-col leading-none">
                <span className="font-titulo text-lg font-extrabold tracking-tight text-white">
                  La Finca
                </span>
                <span className="mt-1 font-titulo text-[0.62rem] font-semibold tracking-[0.22em] text-crema-300 uppercase">
                  Eco Hotel
                </span>
              </span>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-crema-200/85">
              Ecohotel de montaña en un bosque de niebla del Valle del Cauca, a
              45 minutos de Cali.
            </p>

            <ul className="flex flex-col gap-3 text-sm text-crema-200/90">
              <li className="flex gap-3">
                <IconoUbicacion className="mt-0.5 size-4.5 shrink-0 text-dorado-300" />
                <span>{contacto.direccion_completa}</span>
              </li>
              <li className="flex gap-3">
                <IconoReloj className="mt-0.5 size-4.5 shrink-0 text-dorado-300" />
                <span>Restaurante: {contacto.horario_restaurante}</span>
              </li>
              <li className="flex gap-3">
                <IconoWhatsapp className="mt-0.5 size-4.5 shrink-0 text-dorado-300" />
                <a
                  href={enlaceWhatsapp(
                    contacto.mensaje_whatsapp,
                    contacto.whatsapp,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
                >
                  {contacto.whatsapp_visible}
                </a>
              </li>
            </ul>
          </div>

          {/* Navegación */}
          <nav aria-label="Secciones del sitio">
            <h2 className="font-titulo text-xs font-semibold tracking-[0.18em] text-dorado-300 uppercase">
              El sitio
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {[{ href: "/", etiqueta: "Inicio" }, ...NAVEGACION].map(
                (enlace) => (
                  <li key={enlace.href}>
                    <Link
                      href={enlace.href}
                      className="text-crema-200/90 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
                    >
                      {enlace.etiqueta}
                    </Link>
                  </li>
                ),
              )}
              <li>
                <Link
                  href="/reservar"
                  className="font-medium text-white underline-offset-4 transition-colors duration-200 hover:underline"
                >
                  Reservar
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legales */}
          <nav aria-label="Información legal">
            <h2 className="font-titulo text-xs font-semibold tracking-[0.18em] text-dorado-300 uppercase">
              Legal
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {DOCUMENTOS_LEGALES.map((documento) => (
                <li key={documento.href}>
                  <Link
                    href={documento.href}
                    className="text-crema-200/90 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
                  >
                    {documento.corto}
                  </Link>
                </li>
              ))}
            </ul>

            {redes.length > 0 ? (
              <>
                <h2 className="mt-8 font-titulo text-xs font-semibold tracking-[0.18em] text-dorado-300 uppercase">
                  Síguenos
                </h2>
                <ul className="mt-4 flex items-center gap-2">
                  {redes.map((red) => (
                    <li key={red.href}>
                      <a
                        href={red.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={red.etiqueta}
                        className="flex size-11 items-center justify-center rounded-full bg-white/10 text-crema-100 transition-colors duration-200 hover:bg-white/20 hover:text-white"
                      >
                        <red.Icono className="size-5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-crema-300/80 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {anio} {SITIO.nombre}. Todos los derechos reservados.
          </p>
          {/* Obligación legal: el RNT debe estar visible en el sitio. */}
          <p className="font-titulo tracking-wide">
            Registro Nacional de Turismo (RNT) {contacto.rnt}
          </p>
        </div>
      </div>
    </footer>
  );
}
