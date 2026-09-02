import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoFlecha } from "@/components/sitio/iconos";
import { TarjetaCabana } from "@/components/sitio/tarjeta-cabana";
import { Boton } from "@/components/ui/boton";
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

      <Seccion fondo="crema">
        {alojamientos.length > 0 ? (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {alojamientos.map((alojamiento, indice) => (
                <Revelar
                  key={alojamiento.id}
                  como="li"
                  retraso={(indice % 3) * 90}
                  className="h-full"
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

        <div className="mt-10 flex justify-center">
          <Boton href="/reservar" tamano="grande">
            Reservar ahora
            <IconoFlecha className="size-4" />
          </Boton>
        </div>
      </Seccion>
    </>
  );
}
