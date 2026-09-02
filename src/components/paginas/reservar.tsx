import { Suspense } from "react";

import { Neblina } from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoWhatsapp } from "@/components/sitio/iconos";
import {
  SelectorReserva,
  type CabanaSeleccionable,
} from "@/components/sitio/selector-reserva";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { Seccion } from "@/components/ui/seccion";
import {
  getAlojamientos,
  getContacto,
  getHeroesListados,
  getPlanes,
  getReservar,
  getSeccionPlanes,
} from "@/lib/contenido";
import { hoyEnBogota } from "@/lib/utils/formato";
import { enlaceWhatsapp } from "@/lib/whatsapp";

/**
 * Hub de reserva.
 *
 * Hoy canaliza a WhatsApp, pero está diseñado para RECIBIR el motor de reservas
 * sin rehacer la página: el selector ya maneja cabaña, plan y fechas —el mismo
 * estado que necesitará el flujo de cuatro pasos— y lo único que cambiará es a
 * dónde va el botón del final.
 *
 * La página sigue siendo estática: el selector es lo único que corre en el
 * navegador, y lee los parámetros de la dirección
 * (`?cabana=…&plan=…&entrada=…&salida=…`) desde dentro de un `<Suspense>`.
 * Leerlos en el servidor habría vuelto dinámica toda la ruta.
 *
 * **Ojo con el `overflow` en la sección del selector.** El resumen de la
 * derecha es `position: sticky`, y un antepasado con `overflow` distinto de
 * `visible` lo rompe en silencio. Por eso aquí la sección lleva `relative`
 * pero NO `overflow-hidden`: la bruma se recorta sola, porque el contenedor
 * `.neblina` ya tiene su propio `overflow: hidden`.
 */
export async function PaginaReservar() {
  const [heroes, contenido, seccionPlanes, alojamientos, planes, contacto] =
    await Promise.all([
      getHeroesListados(),
      getReservar(),
      getSeccionPlanes(),
      getAlojamientos(),
      getPlanes(),
      getContacto(),
    ]);

  const cabanas: CabanaSeleccionable[] = alojamientos.map((alojamiento) => ({
    slug: alojamiento.slug,
    nombre: alojamiento.nombre,
    tarifas: alojamiento.tarifas.map((tarifa) => ({
      plan: tarifa.plan.nombre,
      precio: tarifa.precio_noche,
    })),
  }));

  return (
    <>
      <HeroPagina
        hero={heroes.reservar}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Reservar", ruta: "/reservar" },
        ]}
      />

      {/* Los tres pasos */}
      <Seccion fondo="blanco" espacio="compacto">
        <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-crema-700 sm:text-lg">
          {contenido.intro}
        </p>

        {contenido.pasos.length > 0 ? (
          <ol className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-3">
            {contenido.pasos.map((paso, indice) => (
              <Revelar
                key={paso.titulo}
                como="li"
                retraso={indice * 90}
                className="h-full"
              >
                <div className="flex h-full flex-col gap-2 rounded-[var(--radius-generoso)] rounded-tl-[2.5rem] bg-crema-50 p-5 ring-1 ring-crema-200/70">
                  <h2 className="font-titulo text-base font-bold text-petroleo-900">
                    {paso.titulo}
                  </h2>
                  <p className="text-sm leading-relaxed text-crema-700">
                    {paso.texto}
                  </p>
                </div>
              </Revelar>
            ))}
          </ol>
        ) : null}
      </Seccion>

      {/* Selector */}
      <Seccion fondo="crema" id="solicitud" className="relative">
        <Neblina tono="verde" className="opacity-50" />

        <div className="relative z-10">
          {cabanas.length > 0 && planes.length > 0 ? (
            <Suspense
              fallback={
                <p className="py-12 text-center text-crema-600">
                  Cargando las opciones de reserva…
                </p>
              }
            >
              <SelectorReserva
                cabanas={cabanas}
                planes={planes.map((plan) => plan.nombre)}
                whatsapp={contacto.whatsapp}
                hoy={hoyEnBogota()}
              />
            </Suspense>
          ) : (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <p className="max-w-md text-crema-700">
                Estamos actualizando las tarifas. Escríbenos por WhatsApp y te
                confirmamos disponibilidad y precio.
              </p>
              <Boton
                href={enlaceWhatsapp(
                  contacto.mensaje_whatsapp,
                  contacto.whatsapp,
                )}
                externo
                tamano="grande"
              >
                <IconoWhatsapp className="size-5" />
                Escribir por WhatsApp
              </Boton>
            </div>
          )}

          <p className="mt-10 text-center text-sm text-crema-600 italic">
            {seccionPlanes.nota}
          </p>

          {contenido.nota ? (
            <p className="mx-auto mt-4 max-w-xl rounded-[var(--radius-tarjeta)] bg-petroleo-50 px-5 py-4 text-center text-sm text-petroleo-800">
              {contenido.nota}
            </p>
          ) : null}
        </div>
      </Seccion>

      <CierreReserva
        fondoAnterior="bg-crema-50"
        titulo="¿Prefieres que te ayudemos a elegir?"
        texto="Escríbenos por WhatsApp con tus fechas y te decimos qué cabaña y qué plan te conviene."
        perfil="bruma"
      >
        <Boton
          href={enlaceWhatsapp(contacto.mensaje_whatsapp, contacto.whatsapp)}
          variante="crema"
          tamano="grande"
          externo
        >
          <IconoWhatsapp className="size-5" />
          Escribir por WhatsApp
        </Boton>
      </CierreReserva>
    </>
  );
}
