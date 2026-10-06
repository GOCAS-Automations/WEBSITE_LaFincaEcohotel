import { Foto } from "@/components/ui/foto";
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
  getExtras,
  getHeroesListados,
  getPlanesConPrecio,
  getReservar,
  getSeccionPlanes,
} from "@/lib/contenido";
import { CLASE_FOTO_CON_FLAG, FOTO } from "@/lib/fotos";
import { pagoEnLineaDisponible } from "@/lib/pagos/bold";
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
  const [
    heroes,
    contenido,
    seccionPlanes,
    alojamientos,
    planes,
    extras,
    contacto,
  ] = await Promise.all([
    getHeroesListados(),
    getReservar(),
    getSeccionPlanes(),
    getAlojamientos(),
    getPlanesConPrecio(),
    getExtras(),
    getContacto(),
  ]);

  /*
    LO QUE NECESITA EL MOTOR DE PRECIOS.
    No basta con el nombre del plan y un número: para saber qué noche cubre cada
    tarifa hace falta `tipo` y `dias_aplica` del plan, y para cotizar a una sola
    persona hace falta `precio_noche_1_persona`, y para las fechas con tarifa
    de temporada, sus `temporadas`. Ver `src/lib/reserva/cotizacion.ts`.
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
      /* Las temporadas viajan con su tarifa: el desglose enseña el precio de
         cada noche con el mismo cálculo con que cobra el servidor. */
      temporadas: tarifa.temporadas,
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
        LOS CINCO PASOS, CON EL LUGAR AL LADO.
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
          pasos crecía con su texto: en escritorio quedaban descuadradas
          arriba o abajo según lo que hubiera escrito el hotel en el panel.
          Ahora la fila es `items-stretch` y la foto pierde su proporción a
          partir de `lg`: su alto lo fija la columna de al lado, y `object-cover`
          con `object-position: right top` recorta lo que sobre SIN tocar el
          sello de marca de la esquina (ver `src/lib/fotos.ts`).
        */}
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-14">
          <Revelar className="lg:h-full">
            <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[8rem] bg-crema-200 shadow-[var(--shadow-elevada)] sm:aspect-16/10 lg:aspect-auto lg:h-full lg:min-h-[24rem]">
              <Foto
                src={FOTO.panoramica}
                alt="Las cabañas de techo azul de La Finca Eco Hotel sobre la ladera, entre el bosque de niebla"
                fill
                priority
                sizes="(min-width: 1024px) 46vw, 92vw"
                className={CLASE_FOTO_CON_FLAG}
              />
            </div>
          </Revelar>

          {/*
            LOS CINCO PASOS EN DOS COLUMNAS, SIN CRECER DE ALTO.
            Eran tres tarjetas en una columna; ahora son los cinco del selector
            —cabaña, fechas, plan, experiencias por noche y cuánto se paga
            hoy; desde el 2026-10-03 la cabaña va antes que las fechas—. Poner cinco tarjetas del tamaño de las anteriores habría
            duplicado el alto de la sección y descolgado la fotografía, así que
            van en dos columnas y más densas: título de una línea, texto corto,
            `p-4` en vez de `p-5` y el número a 1.75rem. Con cinco tarjetas y
            dos columnas la última queda sola en su fila: `sm:col-span-2` la
            deja a lo ancho, que se lee como un cierre y no como un hueco.
            Entre `lg` y `xl` van en UNA columna: la de texto mide ahí unos
            440 px y en dos columnas cada paso se quedaba en 149 px. Ojo: el
            `col-span-2` de la última tiene que volver a 1 en ese tramo, o
            crea una segunda columna implícita.
          */}
          <div className="flex flex-col justify-center gap-5">
            <p className="text-base leading-relaxed text-crema-700">
              {contenido.intro}
            </p>

            {contenido.pasos.length > 0 ? (
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {contenido.pasos.map((paso, indice) => (
                  <Revelar
                    key={paso.titulo}
                    como="li"
                    retraso={Math.min(indice, 4) * 70}
                    className={
                      indice === contenido.pasos.length - 1 &&
                      contenido.pasos.length % 2 === 1
                        ? "sm:col-span-2 lg:col-span-1 xl:col-span-2"
                        : undefined
                    }
                  >
                    <div className="flex h-full gap-3 rounded-[var(--radius-tarjeta)] rounded-tl-[1.75rem] bg-white/85 p-4 ring-1 ring-white/70 backdrop-blur-sm">
                      <span
                        aria-hidden="true"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-petroleo-600 font-titulo text-xs font-bold text-white"
                      >
                        {indice + 1}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="font-titulo text-sm font-bold text-petroleo-900">
                          {paso.titulo}
                        </h2>
                        <p className="text-[0.8125rem] leading-snug text-crema-700">
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
      {/* `diferida={false}`: el resumen de la derecha es `position: sticky`, y el
          `contain` de maquetación que trae `content-visibility` lo rompe en
          silencio. Ver `Seccion`. */}
      <Seccion fondo="crema" id="solicitud" diferida={false} className="relative">
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
                /* Las experiencias del paso 4: se eligen NOCHE POR NOCHE
                   (ver `src/lib/reserva/total.ts`). Los adicionales van en su
                   propio bloque, para toda la estadía. */
                extras={extras.map((extra) => ({
                  id: extra.id,
                  tipo: extra.tipo,
                  nombre: extra.nombre,
                  descripcion: extra.descripcion,
                  precio: extra.precio,
                }))}
                whatsapp={contacto.whatsapp}
                hoy={hoyEnBogota()}
                /*
                  ¿HAY PAGO EN LÍNEA? LO DECIDE EL SERVIDOR.

                  `pagoEnLineaDisponible()` son DOS cosas: que las llaves estén
                  puestas (`boldConfigurado()`) y que el interruptor del negocio
                  esté encendido (`PAGOS_ACTIVOS=1`). Vive en un módulo
                  `server-only` —la llave secreta no puede acercarse al
                  navegador— y lo que cruza es un booleano.

                  El interruptor existe porque desde que el dominio real apunta
                  aquí, el sitio publicado es el del hotel: con las llaves de
                  PRUEBAS puestas, un huésped de verdad pasaría por una pasarela
                  que no cobra nada. Mientras esté en `0`, el botón de pagar no
                  se pinta.

                  Se evalúa en el render de una página estática con ISR de una
                  hora. Es correcto porque las dos cosas son configuración del
                  despliegue, no un dato que cambie entre visitas: el día que se
                  cambien en Vercel, el despliegue las trae.

                  Con `false` el selector cierra por WhatsApp igual que antes de
                  la fase de pagos, con el mismo resumen y el mismo desglose.
                  Nada se queda a medias.
                */
                pagoEnLinea={pagoEnLineaDisponible()}
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
