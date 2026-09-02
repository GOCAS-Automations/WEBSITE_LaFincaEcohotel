import { Neblina } from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { TarjetaCabana } from "@/components/sitio/tarjeta-cabana";
import { Revelar } from "@/components/ui/revelar";
import { Seccion } from "@/components/ui/seccion";
import { getAlojamientos, getHeroesListados, getSeccionPlanes } from "@/lib/contenido";

/**
 * Listado de cabañas.
 *
 * Todas caben en una sola pantalla de escritorio, así que no hay filtros ni
 * paginación: cinco tarjetas y el camino a la ficha. Añadir un buscador aquí
 * sería interfaz por interfaz.
 */
export async function PaginaAlojamientos() {
  const [heroes, alojamientos, seccionPlanes] = await Promise.all([
    getHeroesListados(),
    getAlojamientos(),
    getSeccionPlanes(),
  ]);

  return (
    <>
      <HeroPagina
        hero={heroes.alojamientos}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Cabañas", ruta: "/alojamientos" },
        ]}
      />

      <Seccion fondo="crema" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-55" />

        <div className="relative z-10">
          {alojamientos.length > 0 ? (
            <>
              {/*
                Escalón en la segunda columna (y solo en escritorio): cinco
                tarjetas perfectamente alineadas se leen como una tabla de
                inventario. Con el desfase, como una selección.

                `lg:pb-12` compensa lo que la tarjeta desplazada se sale de su
                fila: lleva `h-full` más un margen superior, y en CSS Grid eso
                desborda la celda por exactamente el alto del margen.
              */}
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:pb-12">
                {alojamientos.map((alojamiento, indice) => (
                  <Revelar
                    key={alojamiento.id}
                    como="li"
                    retraso={(indice % 3) * 90}
                    className={
                      indice % 3 === 1 ? "h-full lg:mt-12" : "h-full"
                    }
                  >
                    <TarjetaCabana
                      alojamiento={alojamiento}
                      prioridad={indice < 3}
                    />
                  </Revelar>
                ))}
              </ul>

              <p className="mt-8 text-center text-sm text-crema-600 italic">
                {seccionPlanes.nota}
              </p>
            </>
          ) : (
            <p className="py-12 text-center text-crema-700">
              Estamos actualizando la información de las cabañas. Escríbenos por
              WhatsApp y te contamos qué hay disponible.
            </p>
          )}
        </div>
      </Seccion>

      <CierreReserva
        fondoAnterior="bg-crema-50"
        titulo="Elige la tuya y cuéntanos las fechas"
        texto="Te confirmamos disponibilidad el mismo día, sin intermediarios ni comisiones."
        espejo
      />
    </>
  );
}
