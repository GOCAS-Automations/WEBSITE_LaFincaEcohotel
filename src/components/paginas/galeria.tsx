import { HeroPagina } from "@/components/sitio/hero-pagina";
import { Boton } from "@/components/ui/boton";
import { Galeria } from "@/components/ui/galeria";
import { Seccion } from "@/components/ui/seccion";
import { getGaleria, getHeroesListados } from "@/lib/contenido";

/**
 * Galería general.
 *
 * Es la única página del sitio donde el contenido ES la interfaz: nada de
 * encabezados de sección ni tarjetas, solo la cuadrícula y el visor.
 */
export async function PaginaGaleria() {
  const [heroes, galeria] = await Promise.all([
    getHeroesListados(),
    getGaleria(),
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

      <Seccion fondo="crema">
        <p className="mx-auto mb-10 max-w-2xl text-center text-base leading-relaxed text-crema-700 sm:text-lg">
          {galeria.intro}
        </p>

        <Galeria imagenes={galeria.imagenes} titulo="La Finca Eco Hotel" />

        <div className="mt-12 flex justify-center">
          <Boton href="/reservar" tamano="grande">
            Reservar ahora
          </Boton>
        </div>
      </Seccion>
    </>
  );
}
