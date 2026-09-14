import Image from "next/image";

import { Neblina, PatronColibri, RamaBotanica } from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoUbicacion } from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { EncabezadoSeccion, RITMO, Seccion } from "@/components/ui/seccion";
import {
  getContacto,
  getHeroesListados,
  getLugar,
  getSeccionPlanes,
} from "@/lib/contenido";

/**
 * Conócenos: quiénes somos, instalaciones y cómo llegar.
 *
 * El mapa va embebido en modo búsqueda pública de Google Maps: no necesita
 * clave de API ni facturación, y se carga con `loading="lazy"` para que un
 * iframe de un tercero no compita con el contenido por el ancho de banda del
 * primer visor.
 */
export async function PaginaConocenos() {
  const [heroes, lugar, contacto, seccionPlanes] = await Promise.all([
    getHeroesListados(),
    getLugar(),
    getContacto(),
    getSeccionPlanes(),
  ]);

  return (
    <>
      <HeroPagina
        hero={heroes.conocenos}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Conócenos", ruta: "/conocenos" },
        ]}
      />

      {/* Sobre nosotros */}
      <Seccion fondo="crema" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-60" />
        <PatronColibri tono="claro" />
        <RamaBotanica
          className="absolute top-[8%] right-[-5%] hidden w-56 text-oliva-400/25 lg:block"
          ritmo="lenta"
          espejo
        />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar className="flex flex-col gap-6">
            <EncabezadoSeccion
              antetitulo={lugar.antetitulo}
              titulo={lugar.titulo}
              alineacion="izquierda"
            />
            <div className="flex flex-col gap-4">
              {lugar.parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700 sm:text-lg"
                >
                  {parrafo}
                </p>
              ))}
            </div>
          </Revelar>

          <Revelar retraso={110}>
            <div className="relative aspect-16/11 overflow-hidden rounded-[var(--radius-generoso)] rounded-tr-[7rem] bg-crema-200 shadow-[var(--shadow-elevada)]">
              <Image
                src={lugar.imagen}
                alt={lugar.imagen_alt}
                fill
                quality={75}
                sizes="(min-width: 1024px) 45vw, 92vw"
                className="object-cover"
              />
            </div>
          </Revelar>
        </div>
      </Seccion>

      {/* Instalaciones */}
      {lugar.instalaciones.length > 0 ? (
        <Seccion fondo="blanco" id="instalaciones">
          <EncabezadoSeccion
            antetitulo="Servicios"
            titulo={lugar.instalaciones_titulo}
            descripcion={lugar.instalaciones_descripcion}
          />

          <ul className={`${RITMO.trasTitulo} grid gap-6 sm:grid-cols-2 lg:grid-cols-3`}>
            {lugar.instalaciones.map((instalacion, indice) => (
              <Revelar
                key={instalacion.nombre}
                como="li"
                retraso={(indice % 3) * 90}
                className="h-full"
              >
                <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[3rem] bg-crema-50 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70 transition-shadow duration-300 hover:shadow-[var(--shadow-tarjeta)]">
                  <div className="relative aspect-4/3 bg-crema-200">
                    <Image
                      src={instalacion.imagen}
                      alt={instalacion.imagen_alt}
                      fill
                      quality={68}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
                    <h3 className="font-titulo text-lg font-bold text-petroleo-900">
                      {instalacion.nombre}
                    </h3>
                    <p className="text-sm leading-relaxed text-crema-700">
                      {instalacion.descripcion}
                    </p>
                  </div>
                </article>
              </Revelar>
            ))}
          </ul>
        </Seccion>
      ) : null}

      {/* Cómo llegar */}
      <Seccion fondo="crema" id="como-llegar">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar className="flex flex-col gap-6">
            <EncabezadoSeccion
              antetitulo="Ubicación"
              titulo={lugar.llegar_titulo}
              alineacion="izquierda"
            />

            <div className="flex flex-col gap-4">
              {lugar.llegar_parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700"
                >
                  {parrafo}
                </p>
              ))}
            </div>

            {lugar.llegar_indicaciones.length > 0 ? (
              <ul className="flex flex-col gap-3 rounded-[var(--radius-generoso)] bg-white p-5 ring-1 ring-crema-200/70 sm:p-6">
                {lugar.llegar_indicaciones.map((indicacion) => (
                  <li
                    key={indicacion.slice(0, 30)}
                    className="flex gap-3 text-sm leading-relaxed text-crema-800"
                  >
                    <IconoUbicacion className="mt-0.5 size-4 shrink-0 text-petroleo-500" />
                    {indicacion}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Boton
                href={contacto.mapa_como_llegar || contacto.mapa_url}
                variante="contorno"
                externo
              >
                Cómo llegar desde Cali
              </Boton>
              <Boton href={contacto.mapa_url} variante="secundario" externo>
                Ver la ficha en Google Maps
              </Boton>
            </div>
          </Revelar>

          <Revelar retraso={110}>
            <div className="h-80 overflow-hidden rounded-[var(--radius-generoso)] shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 sm:h-96 lg:h-full lg:min-h-[26rem]">
              <iframe
                src={contacto.mapa_embed}
                title="Mapa con la ubicación de La Finca Eco Hotel"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
              />
            </div>
          </Revelar>
        </div>
      </Seccion>

      <CierreReserva
        imagen={seccionPlanes.imagen_fondo}
        fondoAnterior="bg-crema-50"
        titulo="Ven a conocerlo"
        texto="Cinco cabañas, un bosque de niebla y 45 minutos de camino desde Cali."
        perfil="cresta"
      />
    </>
  );
}
