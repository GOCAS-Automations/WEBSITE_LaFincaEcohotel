import Image from "next/image";

import { Neblina } from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoWhatsapp } from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { EncabezadoSeccion, Seccion } from "@/components/ui/seccion";
import {
  getContacto,
  getContenidoExperiencias,
  getAdicionales,
  getExperiencias,
  getHeroesListados,
  getSeccionPlanes,
} from "@/lib/contenido";
import { formatearCOP } from "@/lib/utils/formato";
import { enlaceWhatsapp, mensajeExperiencia } from "@/lib/whatsapp";

/**
 * Experiencias.
 *
 * Dos bloques con distinto compromiso: arriba, las que tienen precio publicado
 * y viven en la tabla `extras` (se venderán dentro de la reserva cuando exista
 * el motor); abajo, las que el hotel arma a pedido y todavía no tienen tarifa
 * confirmada. Mezclarlas haría creer que todas cuestan lo mismo.
 */
export async function PaginaExperiencias() {
  const [heroes, contenido, experiencias, adicionales, contacto, seccionPlanes] =
    await Promise.all([
      getHeroesListados(),
      getContenidoExperiencias(),
      getExperiencias(),
      getAdicionales(),
      getContacto(),
      getSeccionPlanes(),
    ]);

  return (
    <>
      <HeroPagina
        hero={heroes.experiencias}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Experiencias", ruta: "/experiencias" },
        ]}
      />

      <Seccion fondo="crema" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-55" />

        <p className="relative z-10 mx-auto max-w-2xl text-center text-base leading-relaxed text-crema-700 sm:text-lg">
          {contenido.intro}
        </p>

        {experiencias.length > 0 ? (
          <ul className="relative z-10 mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
            {experiencias.map((experiencia, indice) => (
              <Revelar
                key={experiencia.id}
                como="li"
                retraso={indice * 90}
                className="h-full"
              >
                <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-generoso)] rounded-tr-[3.5rem] bg-white shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70">
                  {experiencia.imagen_url ? (
                    <div className="relative aspect-3/4 bg-crema-200">
                      <Image
                        src={experiencia.imagen_url}
                        alt={`Experiencia ${experiencia.nombre} preparada en una cabaña de La Finca`}
                        fill
                        quality={75}
                        sizes="(min-width: 640px) 45vw, 92vw"
                        className="object-cover"
                        priority={indice === 0}
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
                    <h2 className="font-titulo text-xl font-bold text-petroleo-900">
                      {experiencia.nombre}
                    </h2>
                    {experiencia.descripcion ? (
                      <p className="text-sm leading-relaxed text-crema-700">
                        {experiencia.descripcion}
                      </p>
                    ) : null}
                    <p className="mt-auto pt-3 font-titulo text-2xl font-extrabold text-petroleo-700">
                      {formatearCOP(experiencia.precio)}
                      <span className="ml-2 text-sm font-medium text-crema-600">
                        por estadía
                      </span>
                    </p>
                    <Boton
                      href={enlaceWhatsapp(
                        mensajeExperiencia(experiencia.nombre),
                        contacto.whatsapp,
                      )}
                      externo
                      className="mt-2 w-full"
                    >
                      <IconoWhatsapp className="size-5" />
                      Añadir a mi reserva
                    </Boton>
                  </div>
                </article>
              </Revelar>
            ))}
          </ul>
        ) : null}
      </Seccion>

      {/*
        LOS ADICIONALES, en lista y no en tarjetas con foto.
        Son el fondue ($25.000) y la segunda mascota ($50.000): cosas pequeñas
        que se suman a la reserva. Darles una tarjeta con fotografía del mismo
        tamaño que a una celebración de $150.000 confundía la jerarquía y hacía
        creer que el fondue era un plan.
      */}
      {adicionales.length > 0 ? (
        <Seccion fondo="blanco">
          <EncabezadoSeccion
            antetitulo="Adicionales"
            titulo="Detalles que puedes sumar"
            descripcion="Se piden al reservar o al llegar, y se cobran una sola vez por estadía."
          />

          <ul className="mx-auto mt-10 flex max-w-3xl flex-col gap-3">
            {adicionales.map((adicional, indice) => (
              <Revelar key={adicional.id} como="li" retraso={indice * 80}>
                <article className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-[var(--radius-generoso)] bg-crema-50 px-5 py-4 ring-1 ring-crema-200/70 sm:px-7 sm:py-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-titulo text-lg font-bold text-petroleo-900">
                      {adicional.nombre}
                    </h3>
                    {adicional.descripcion ? (
                      <p className="mt-1 text-sm leading-relaxed text-crema-700">
                        {adicional.descripcion}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-titulo text-xl font-extrabold whitespace-nowrap text-petroleo-700">
                    {formatearCOP(adicional.precio)}
                  </p>
                </article>
              </Revelar>
            ))}
          </ul>
        </Seccion>
      ) : null}

      {contenido.adicionales.length > 0 ? (
        <Seccion fondo="blanco">
          <EncabezadoSeccion
            antetitulo="A pedido"
            titulo={contenido.adicionales_titulo}
            descripcion={contenido.adicionales_descripcion}
          />

          <ul className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
            {contenido.adicionales.map((adicional, indice) => (
              <Revelar
                key={adicional.nombre}
                como="li"
                retraso={indice * 90}
                className="h-full"
              >
                <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[3.5rem] bg-crema-50 ring-1 ring-crema-200/70">
                  <div className="relative aspect-3/4 bg-crema-200">
                    <Image
                      src={adicional.imagen}
                      alt={adicional.imagen_alt}
                      fill
                      quality={75}
                      sizes="(min-width: 640px) 45vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
                    <h3 className="font-titulo text-xl font-bold text-petroleo-900">
                      {adicional.nombre}
                    </h3>
                    <p className="text-sm leading-relaxed text-crema-700">
                      {adicional.descripcion}
                    </p>
                    <Boton
                      href={enlaceWhatsapp(
                        mensajeExperiencia(adicional.nombre),
                        contacto.whatsapp,
                      )}
                      externo
                      variante="contorno"
                      className="mt-auto w-full"
                    >
                      Consultar precio
                    </Boton>
                  </div>
                </article>
              </Revelar>
            ))}
          </ul>
        </Seccion>
      ) : null}

      <CierreReserva
        imagen={seccionPlanes.imagen_fondo}
        fondoAnterior={
          contenido.adicionales.length > 0 || adicionales.length > 0
            ? "bg-white"
            : "bg-crema-50"
        }
        titulo="Todas se suman a tu reserva"
        texto="Elige primero la cabaña y el plan; la experiencia se añade después y queda lista antes de que llegues."
        espejo
      />
    </>
  );
}
