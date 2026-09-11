import { Neblina } from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { Galeria } from "@/components/ui/galeria";
import { Seccion } from "@/components/ui/seccion";
import {
  getGaleria,
  getHeroesListados,
  getSeccionPlanes,
} from "@/lib/contenido";

/**
 * Galería general.
 *
 * Es la única página del sitio donde el contenido ES la interfaz: nada de
 * encabezados de sección ni tarjetas, solo el mosaico y el visor.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ POR PÁGINAS Y NO TODO DE UN TIRÓN
 * ---------------------------------------------------------------------------
 * Las 31 fotos en una cuadrícula uniforme eran una hoja de contactos: todas del
 * mismo tamaño, todas con el mismo peso, ninguna mirada. Ahora van de doce en
 * doce, en un mosaico donde las piezas tienen tamaños distintos —hay fotos que
 * mandan y fotos que acompañan—, y cambiar de página es un gesto corto en vez
 * de un desplazamiento infinito.
 *
 * El beneficio no es solo visual: doce imágenes por página es un tercio de las
 * peticiones al abrir, y el visor sigue recorriendo las 31 sin que el visitante
 * tenga que volver a la cuadrícula para cambiar de página.
 *
 * **El orden manda.** Las piezas grandes del mosaico caen siempre en las mismas
 * posiciones de cada página (1.ª, 5.ª, 6.ª, 8.ª… ver `PATRON_EDITORIAL`), así
 * que la forma de destacar una foto desde el panel es subirla de posición. Está
 * documentado en `docs/CMS_CLAVES.md` para que quien edite el contenido lo sepa
 * sin tener que leer el código.
 */
export async function PaginaGaleria() {
  const [heroes, galeria, seccionPlanes] = await Promise.all([
    getHeroesListados(),
    getGaleria(),
    getSeccionPlanes(),
  ]);

  return (
    <>
      <HeroPagina
        hero={heroes.galeria}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Galería", ruta: "/galeria" },
        ]}
      />

      <Seccion fondo="crema" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-60" />

        <div className="relative z-10">
          <p className="mx-auto mb-10 max-w-2xl text-center text-base leading-relaxed text-crema-700 sm:text-lg">
            {galeria.intro}
          </p>

          <Galeria
            imagenes={galeria.imagenes}
            disposicion="editorial"
            porPagina={12}
            titulo="La Finca Eco Hotel"
            prioridad
          />
        </div>
      </Seccion>

      <CierreReserva
        imagen={seccionPlanes.imagen_fondo}
        fondoAnterior="bg-crema-50"
        titulo="Lo que se ve en las fotos se siente mejor en persona"
      />
    </>
  );
}
