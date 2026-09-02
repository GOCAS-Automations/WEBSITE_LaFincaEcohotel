import Link from "next/link";

import {
  IconoCheck,
  IconoFlecha,
  IconoPersonas,
  IconoWhatsapp,
} from "@/components/sitio/iconos";
import { TarjetaCabana } from "@/components/sitio/tarjeta-cabana";
import { TarjetaPlan } from "@/components/sitio/tarjeta-plan";
import { Boton } from "@/components/ui/boton";
import { Galeria } from "@/components/ui/galeria";
import { Revelar } from "@/components/ui/revelar";
import { EncabezadoSeccion, Seccion } from "@/components/ui/seccion";
import {
  getAlojamientos,
  getContacto,
  getSeccionPlanes,
  type AlojamientoPublico,
} from "@/lib/contenido";
import { formatearCOP } from "@/lib/utils/formato";
import { enlaceWhatsapp, mensajeCabana } from "@/lib/whatsapp";

/**
 * Ficha de una cabaña.
 *
 * La galería va arriba del todo y a sangre porque es lo que decide la reserva:
 * el visitante quiere ver dónde va a dormir antes que leer nada. Debajo, las
 * tres tarifas **de esta cabaña** —no las generales— para que el precio que se
 * lee sea el que se va a pagar.
 */
export async function PaginaAlojamiento({
  alojamiento,
}: {
  alojamiento: AlojamientoPublico;
}) {
  const [contacto, seccionPlanes, todos] = await Promise.all([
    getContacto(),
    getSeccionPlanes(),
    getAlojamientos(),
  ]);

  const otras = todos.filter((otra) => otra.id !== alojamiento.id).slice(0, 3);
  const amenidades = alojamiento.amenidades ?? [];

  return (
    <>
      {/* Migas y encabezado */}
      <div className="border-b border-crema-200/70 bg-white">
        <div className="contenedor pt-6 pb-8 sm:pt-8 sm:pb-10">
          <nav aria-label="Ruta de navegación">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-crema-600">
              <li className="flex items-center gap-2">
                <Link
                  href="/"
                  className="underline-offset-4 transition-colors duration-200 hover:text-petroleo-700 hover:underline"
                >
                  Inicio
                </Link>
                <span aria-hidden="true">/</span>
              </li>
              <li className="flex items-center gap-2">
                <Link
                  href="/alojamientos"
                  className="underline-offset-4 transition-colors duration-200 hover:text-petroleo-700 hover:underline"
                >
                  Cabañas
                </Link>
                <span aria-hidden="true">/</span>
              </li>
              <li aria-current="page" className="text-petroleo-800">
                {alojamiento.nombre}
              </li>
            </ol>
          </nav>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl leading-tight font-extrabold text-petroleo-900 sm:text-4xl lg:text-5xl">
                {alojamiento.nombre}
              </h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-crema-700">
                <span className="flex items-center gap-1.5">
                  <IconoPersonas className="size-4 text-petroleo-500" />
                  Hasta {alojamiento.capacidad} personas
                </span>
                <span className="text-crema-400" aria-hidden="true">
                  ·
                </span>
                <span>Km 18 vía Cali–Buenaventura</span>
              </p>
            </div>

            {alojamiento.precio_desde !== null ? (
              <p className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                <span className="text-xs tracking-wide text-crema-600 uppercase">
                  Desde
                </span>
                <span className="font-titulo text-3xl font-extrabold text-dorado-600">
                  {formatearCOP(alojamiento.precio_desde)}
                </span>
                <span className="text-xs text-crema-600">
                  por noche · 2 personas
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Galería */}
      {alojamiento.galeria.length > 0 ? (
        <div className="bg-white pb-4">
          <div className="contenedor">
            <Galeria
              imagenes={alojamiento.galeria}
              disposicion="ficha"
              titulo={alojamiento.nombre}
              prioridad
            />
          </div>
        </div>
      ) : null}

      {/* Descripción y amenidades */}
      <Seccion fondo="blanco" espacio="compacto">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Revelar className="flex flex-col gap-5">
            <h2 className="font-titulo text-2xl font-bold text-petroleo-900">
              Sobre esta cabaña
            </h2>
            {alojamiento.descripcion ? (
              <p className="text-base leading-relaxed text-crema-700 sm:text-lg">
                {alojamiento.descripcion}
              </p>
            ) : null}
            <p className="text-base leading-relaxed text-crema-700">
              La estadía incluye el uso libre de las zonas sociales: piscina,
              decks, zona húmeda y senderos. El desayuno está incluido en los
              tres planes.
            </p>
          </Revelar>

          {amenidades.length > 0 ? (
            <Revelar retraso={90}>
              <div className="rounded-[var(--radius-generoso)] bg-crema-50 p-6 ring-1 ring-crema-200/70 sm:p-7">
                <h2 className="font-titulo text-lg font-bold text-petroleo-900">
                  La cabaña tiene
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {amenidades.map((amenidad) => (
                    <li
                      key={amenidad}
                      className="flex gap-2.5 text-sm leading-relaxed text-crema-800"
                    >
                      <IconoCheck className="mt-0.5 size-4 shrink-0 text-petroleo-500" />
                      {amenidad}
                    </li>
                  ))}
                </ul>
              </div>
            </Revelar>
          ) : null}
        </div>
      </Seccion>

      {/* Planes de ESTA cabaña */}
      {alojamiento.tarifas.length > 0 ? (
        <Seccion fondo="crema" id="planes">
          <EncabezadoSeccion
            antetitulo="Tarifas"
            titulo={`Planes para la ${alojamiento.nombre}`}
            descripcion="El precio depende del plan, no de la cabaña: elige el nivel de servicio que quieres."
          />

          <ul className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
            {alojamiento.tarifas.map((tarifa, indice) => (
              <Revelar
                key={tarifa.plan.id}
                como="li"
                retraso={indice * 90}
                className="h-full"
              >
                <TarjetaPlan
                  plan={tarifa.plan}
                  precio={tarifa.precio_noche}
                  destacado={indice === 1}
                  href={`/reservar?cabana=${alojamiento.slug}&plan=${encodeURIComponent(
                    tarifa.plan.nombre,
                  )}`}
                />
              </Revelar>
            ))}
          </ul>

          <p className="mt-8 text-center text-sm text-crema-600 italic">
            {seccionPlanes.nota}
          </p>
        </Seccion>
      ) : null}

      {/* Llamada a reservar */}
      <Seccion fondo="petroleo" espacio="compacto">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-2xl text-2xl leading-tight font-bold text-white sm:text-3xl">
            ¿Te quedas con la {alojamiento.nombre}?
          </h2>
          <p className="max-w-xl text-crema-100/90">
            Cuéntanos tus fechas y te confirmamos la disponibilidad el mismo
            día. Respondemos por WhatsApp todos los días.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Boton
              href={`/reservar?cabana=${alojamiento.slug}`}
              variante="claro"
              tamano="grande"
            >
              Reservar esta cabaña
            </Boton>
            <Boton
              href={enlaceWhatsapp(
                mensajeCabana(alojamiento.nombre),
                contacto.whatsapp,
              )}
              variante="claro"
              tamano="grande"
              externo
            >
              <IconoWhatsapp className="size-5" />
              Preguntar por WhatsApp
            </Boton>
          </div>
        </div>
      </Seccion>

      {/* Otras cabañas */}
      {otras.length > 0 ? (
        <Seccion fondo="blanco">
          <EncabezadoSeccion
            antetitulo="Más opciones"
            titulo="Otras cabañas"
            alineacion="izquierda"
          />

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otras.map((otra, indice) => (
              <Revelar
                key={otra.id}
                como="li"
                retraso={indice * 90}
                className="h-full"
              >
                <TarjetaCabana alojamiento={otra} />
              </Revelar>
            ))}
          </ul>

          <div className="mt-10 flex justify-center">
            <Boton href="/alojamientos" variante="contorno">
              Ver todas las cabañas
              <IconoFlecha className="size-4" />
            </Boton>
          </div>
        </Seccion>
      ) : null}
    </>
  );
}
