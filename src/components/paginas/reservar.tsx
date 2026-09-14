import Image from "next/image";
import { Suspense } from "react";

import {
  ColibriesSueltos,
  Neblina,
  RamaBotanica,
} from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoWhatsapp } from "@/components/sitio/iconos";
import {
  SelectorReserva,
  type CabanaSeleccionable,
} from "@/components/sitio/selector-reserva";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { RITMO, Seccion } from "@/components/ui/seccion";
import {
  getAlojamientos,
  getContacto,
  getHeroesListados,
  getPlanesConPrecio,
  getReservar,
  getSeccionPlanes,
} from "@/lib/contenido";
import { CLASE_FOTO_CON_FLAG, FOTO } from "@/lib/fotos";
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
      getPlanesConPrecio(),
      getContacto(),
    ]);

  /*
    LO QUE NECESITA EL MOTOR DE PRECIOS.
    No basta con el nombre del plan y un número: para saber qué noche cubre cada
    tarifa hace falta `tipo` y `dias_aplica` del plan, y para cotizar a una sola
    persona hace falta `precio_noche_1_persona`. Ver
    `src/lib/reserva/cotizacion.ts`.
  */
  const cabanas: CabanaSeleccionable[] = alojamientos.map((alojamiento) => ({
    slug: alojamiento.slug,
    nombre: alojamiento.nombre,
    tarifas: alojamiento.tarifas.map((tarifa) => ({
      plan: {
        nombre: tarifa.plan.nombre,
        tipo: tarifa.plan.tipo,
        dias_aplica: tarifa.plan.dias_aplica,
      },
      precio_noche: tarifa.precio_noche,
      precio_noche_1_persona: tarifa.precio_noche_1_persona,
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

      {/*
        LOS TRES PASOS, CON EL LUGAR AL LADO.
        Esta sección era una franja blanca con tres cajitas de texto: la página
        que decide la reserva era la más pobre del sitio, justo donde hace falta
        que el visitante siga sintiendo dónde va a dormir. Ahora los pasos
        comparten fila con una fotografía en el mismo lenguaje de la portada
        —curva grande arriba a la izquierda, nunca en la esquina del sello— y la
        sección respira el verde claro de la marca.
      */}
      <Seccion fondo="brote" espacio="compacto" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-40" />
        <RamaBotanica
          className="absolute right-[-5%] bottom-[-8%] hidden w-56 text-oliva-500/20 lg:block"
          ritmo="lenta"
          espejo
        />

        {/*
          LA FOTO Y LOS PASOS, A LA MISMA ALTURA.
          Antes la foto tenía proporción fija (`aspect-4/3`) y la columna de los
          tres pasos crecía con su texto: en escritorio quedaban descuadradas
          arriba o abajo según lo que hubiera escrito el hotel en el panel.
          Ahora la fila es `items-stretch` y la foto pierde su proporción a
          partir de `lg`: su alto lo fija la columna de al lado, y `object-cover`
          con `object-position: right top` recorta lo que sobre SIN tocar el
          sello de marca de la esquina (ver `src/lib/fotos.ts`).
        */}
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-14">
          <Revelar className="lg:h-full">
            <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[8rem] bg-crema-200 shadow-[var(--shadow-elevada)] sm:aspect-16/10 lg:aspect-auto lg:h-full lg:min-h-[24rem]">
              <Image
                src={FOTO.panoramica}
                alt="Las cabañas de techo azul de La Finca Eco Hotel sobre la ladera, entre el bosque de niebla"
                fill
                priority
                quality={75}
                sizes="(min-width: 1024px) 46vw, 92vw"
                className={CLASE_FOTO_CON_FLAG}
              />
            </div>
          </Revelar>

          <div className="flex flex-col justify-center gap-6">
            <p className="text-base leading-relaxed text-crema-700 sm:text-lg">
              {contenido.intro}
            </p>

            {contenido.pasos.length > 0 ? (
              <ol className="flex flex-col gap-4">
                {contenido.pasos.map((paso, indice) => (
                  <Revelar
                    key={paso.titulo}
                    como="li"
                    retraso={indice * 90}
                  >
                    <div className="flex gap-4 rounded-[var(--radius-generoso)] rounded-tl-[2rem] bg-white/85 p-5 ring-1 ring-white/70 backdrop-blur-sm">
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-petroleo-600 font-titulo text-sm font-bold text-white"
                      >
                        {indice + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        <h2 className="font-titulo text-base font-bold text-petroleo-900">
                          {paso.titulo}
                        </h2>
                        <p className="text-sm leading-relaxed text-crema-700">
                          {paso.texto}
                        </p>
                      </div>
                    </div>
                  </Revelar>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
      </Seccion>

      {/* Selector */}
      <Seccion fondo="crema" id="solicitud" className="relative">
        <Neblina tono="verde" className="opacity-50" />
        <ColibriesSueltos tono="claro" className="opacity-60" />

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
                planes={planes.map(({ plan, precio_minimo, varia }) => ({
                  nombre: plan.nombre,
                  tipo: plan.tipo,
                  dias_aplica: plan.dias_aplica,
                  descripcion: plan.descripcion,
                  incluye: plan.incluye ?? [],
                  /* El precio de referencia mientras no hay cabaña elegida: el
                     más bajo del catálogo para ese plan. Antes se leía
                     "precio_base", que solo existe en el Día de Calma, y los
                     otros tres salían con un «Consultar» innecesario: su precio
                     está publicado. */
                  precio_base: precio_minimo,
                  precio_varia: varia,
                  horario: plan.horario,
                }))}
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

          <p className={`${RITMO.nota} text-center text-sm text-crema-600 italic`}>
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
        imagen={seccionPlanes.imagen_fondo}
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
