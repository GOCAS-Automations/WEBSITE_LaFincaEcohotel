import { Neblina } from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import {
  IconoFacebook,
  IconoInstagram,
  IconoReloj,
  IconoTiktok,
  IconoUbicacion,
  IconoWhatsapp,
} from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { Seccion } from "@/components/ui/seccion";
import {
  getContacto,
  getHeroesListados,
  getSeccionPlanes,
} from "@/lib/contenido";
import { direccionDeMapa } from "@/lib/mapa-embebido";
import { SITIO } from "@/lib/sitio";
import { enlaceWhatsapp } from "@/lib/whatsapp";

/**
 * Contacto.
 *
 * **No hay formulario a propósito.** El hotel atiende por WhatsApp y no tiene
 * un flujo de respuesta montado para un formulario: el correo de contacto ya
 * se publica (2026-09-30), pero el envío automático (Resend) sigue pendiente.
 * Un formulario que no llega a ninguna parte es peor que no tenerlo: el
 * visitante cree que escribió y nadie le responde.
 */
export async function PaginaContacto() {
  const [heroes, contacto, seccionPlanes] = await Promise.all([
    getHeroesListados(),
    getContacto(),
    getSeccionPlanes(),
  ]);

  const redes = [
    contacto.instagram && {
      href: contacto.instagram,
      nombre: "Instagram",
      usuario: contacto.instagram_usuario,
      Icono: IconoInstagram,
    },
    contacto.facebook && {
      href: contacto.facebook,
      nombre: "Facebook",
      usuario: "La Finca Eco Hotel",
      Icono: IconoFacebook,
    },
    contacto.tiktok && {
      href: contacto.tiktok,
      nombre: "TikTok",
      usuario: contacto.tiktok_usuario,
      Icono: IconoTiktok,
    },
  ].filter(Boolean) as {
    href: string;
    nombre: string;
    usuario: string;
    Icono: (props: { className?: string }) => React.ReactElement;
  }[];

  return (
    <>
      <HeroPagina
        hero={heroes.contacto}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Contacto", ruta: "/contacto" },
        ]}
      />

      <Seccion fondo="crema" className="relative">
        <Neblina tono="verde" className="opacity-50" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar className="flex flex-col gap-8">
            {/* WhatsApp, el canal principal */}
            <div className="flex flex-col items-start gap-4 rounded-[var(--radius-generoso)] bg-white p-6 shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 sm:p-8">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#25D366]/12 text-[#128C4A]">
                <IconoWhatsapp className="size-6" />
              </span>
              <div>
                <h2 className="font-titulo text-xl font-bold text-petroleo-900">
                  Escríbenos por WhatsApp
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-crema-700">
                  Es la forma más rápida de resolver dudas y confirmar
                  disponibilidad. Respondemos todos los días.
                </p>
              </div>
              <Boton
                href={enlaceWhatsapp(
                  contacto.mensaje_whatsapp,
                  contacto.whatsapp,
                )}
                tamano="grande"
                externo
                className="w-full sm:w-auto"
              >
                <IconoWhatsapp className="size-5" />
                {contacto.whatsapp_visible}
              </Boton>
            </div>

            {/* Datos */}
            <dl className="flex flex-col gap-5">
              <div className="flex gap-4">
                <dt className="sr-only">Dirección</dt>
                <IconoUbicacion className="mt-0.5 size-5 shrink-0 text-petroleo-500" />
                <dd className="text-sm leading-relaxed text-crema-800">
                  {contacto.direccion_completa}
                  <br />
                  <span className="text-crema-600">
                    A 45 minutos de Cali. El parqueadero es externo y vigilado
                    24 horas.
                  </span>
                </dd>
              </div>

              <div className="flex gap-4">
                <dt className="sr-only">Horario del restaurante</dt>
                <IconoReloj className="mt-0.5 size-5 shrink-0 text-petroleo-500" />
                <dd className="text-sm leading-relaxed text-crema-800">
                  Restaurante: {contacto.horario_restaurante}
                </dd>
              </div>

              {contacto.correo ? (
                <div className="flex gap-4">
                  <dt className="sr-only">Correo electrónico</dt>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 font-titulo text-sm font-bold text-petroleo-500"
                  >
                    @
                  </span>
                  <dd className="text-sm text-crema-800">
                    <a
                      href={`mailto:${contacto.correo}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {contacto.correo}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* Redes */}
            {redes.length > 0 ? (
              <div>
                <h2 className="font-titulo text-sm font-semibold tracking-[0.16em] text-oliva-600 uppercase">
                  Síguenos
                </h2>
                <ul className="mt-4 flex flex-col gap-2">
                  {redes.map((red) => (
                    <li key={red.href}>
                      <a
                        href={red.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-[var(--radius-suave)] px-3 py-2.5 -mx-3 transition-colors duration-200 hover:bg-white"
                      >
                        <span className="flex size-10 items-center justify-center rounded-full bg-petroleo-50 text-petroleo-600 transition-colors duration-200 group-hover:bg-petroleo-100">
                          <red.Icono className="size-5" />
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="font-titulo text-sm font-semibold text-petroleo-900">
                            {red.nombre}
                          </span>
                          <span className="text-xs text-crema-600">
                            {red.usuario}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-xs text-crema-600">
              {SITIO.responsable.nombre} · NIT {SITIO.responsable.nit} ·
              Registro Nacional de Turismo (RNT) {contacto.rnt}
            </p>
          </Revelar>

          {/* Mapa */}
          <Revelar retraso={110} className="flex flex-col gap-4">
            {/* El marco solo se pinta si la dirección es un mapa embebido de
                Google: un valor del CMS no puede meter un iframe ajeno en la
                página del hotel. Ver `src/lib/mapa-embebido.ts`. */}
            {direccionDeMapa(contacto.mapa_embed) ? (
              <div className="h-80 overflow-hidden rounded-[var(--radius-generoso)] shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 sm:h-96 lg:h-full lg:min-h-[28rem]">
                <iframe
                  src={direccionDeMapa(contacto.mapa_embed) ?? undefined}
                  title="Mapa con la ubicación de La Finca Eco Hotel"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full border-0"
                />
              </div>
            ) : null}
            {/* «Cómo llegar» abre indicaciones DESDE CALI, no una búsqueda:
                es el trayecto que va a hacer quien lo pulse. */}
            <Boton
              href={contacto.mapa_como_llegar || contacto.mapa_url}
              variante="contorno"
              externo
            >
              Cómo llegar desde Cali
            </Boton>
          </Revelar>
        </div>
      </Seccion>

      <CierreReserva
        imagen={seccionPlanes.imagen_fondo}
        fondoAnterior="bg-crema-50"
        titulo="¿Ya tienes fecha?"
        texto="Cuéntanos cuándo quieres venir y te confirmamos disponibilidad el mismo día."
      />
    </>
  );
}
