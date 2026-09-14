"use client";

import {
  guardarCtaFinalAction,
  guardarEsenciaAction,
  guardarHeroAction,
  guardarIntroAction,
  guardarPlanesAction,
  guardarReconocimientoAction,
  guardarSeccionSimpleAction,
  guardarTestimoniosAction,
} from "./acciones";
import {
  comoTextarea,
  galeria,
  objetos,
  texto,
  textos,
} from "./lectura";
import { CampoImagen } from "@/components/admin/campo-imagen";
import { EditorGaleria } from "@/components/admin/editor-galeria";
import { EditorLista } from "@/components/admin/editor-lista";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { AreaTexto, Campo, Entrada } from "@/components/admin/ui";

type Valor = Record<string, unknown>;

const AYUDA_VACIO =
  "Si dejas un campo en blanco, el sitio muestra el texto que trae por defecto.";

/* ---------------------------------------------------------------------------
 * Primera pantalla de la portada
 * ------------------------------------------------------------------------- */

export function FormularioHero({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarHeroAction} etiquetaEnviar="Guardar portada">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="hero_antetitulo">
          <Entrada
            id="hero_antetitulo"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>

        <Campo etiqueta="Titular grande" htmlFor="hero_titulo" obligatorio>
          <Entrada
            id="hero_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>

        <Campo
          etiqueta="Subtítulo"
          htmlFor="hero_subtitulo"
          className="sm:col-span-2"
        >
          <Entrada
            id="hero_subtitulo"
            name="subtitulo"
            defaultValue={texto(valor, "subtitulo")}
            maxLength={400}
          />
        </Campo>

        <Campo
          etiqueta="Párrafo"
          htmlFor="hero_parrafo"
          className="sm:col-span-2"
        >
          <AreaTexto
            id="hero_parrafo"
            name="parrafo"
            defaultValue={texto(valor, "parrafo")}
            maxLength={800}
            rows={3}
          />
        </Campo>

        <Campo etiqueta="Botón principal — texto" htmlFor="hero_cta_texto">
          <Entrada
            id="hero_cta_texto"
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
          />
        </Campo>

        <Campo
          etiqueta="Botón principal — a dónde lleva"
          htmlFor="hero_cta_href"
          ayuda="Una dirección del sitio, como /reservar."
        >
          <Entrada
            id="hero_cta_href"
            name="cta_href"
            defaultValue={texto(valor, "cta_href")}
            maxLength={200}
          />
        </Campo>

        <Campo etiqueta="Botón secundario — texto" htmlFor="hero_cta2_texto">
          <Entrada
            id="hero_cta2_texto"
            name="cta_secundario_texto"
            defaultValue={texto(valor, "cta_secundario_texto")}
            maxLength={60}
          />
        </Campo>

        <Campo
          etiqueta="Botón secundario — a dónde lleva"
          htmlFor="hero_cta2_href"
        >
          <Entrada
            id="hero_cta2_href"
            name="cta_secundario_href"
            defaultValue={texto(valor, "cta_secundario_href")}
            maxLength={200}
          />
        </Campo>

        <Campo
          etiqueta="Foto para computador (horizontal)"
          ayuda="Lo ideal es una foto apaisada de al menos 1920 × 1080."
        >
          <CampoImagen
            name="imagen"
            urlInicial={texto(valor, "imagen")}
            proporcion="apaisada"
          />
        </Campo>

        <Campo
          etiqueta="Foto para celular (vertical)"
          ayuda="La horizontal recortada al celular pierde justo las cabañas. Ideal 1080 × 1920."
        >
          <CampoImagen
            name="imagen_movil"
            urlInicial={texto(valor, "imagen_movil")}
          />
        </Campo>

        <Campo
          etiqueta="Descripción de las fotos"
          htmlFor="hero_imagen_alt"
          className="sm:col-span-2"
          ayuda="Sirve para quien no puede ver la imagen y para Google. Es la misma para las dos fotos."
        >
          <Entrada
            id="hero_imagen_alt"
            name="imagen_alt"
            defaultValue={texto(valor, "imagen_alt")}
            maxLength={300}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Bienvenida
 * ------------------------------------------------------------------------- */

export function FormularioIntro({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion
      accion={guardarIntroAction}
      etiquetaEnviar="Guardar bienvenida"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="intro_antetitulo">
          <Entrada
            id="intro_antetitulo"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>

        <Campo etiqueta="Titular" htmlFor="intro_titulo" obligatorio>
          <Entrada
            id="intro_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>

        <Campo
          etiqueta="Párrafos"
          htmlFor="intro_parrafos"
          className="sm:col-span-2"
          ayuda="Deja una línea en blanco entre un párrafo y el siguiente."
        >
          <AreaTexto
            id="intro_parrafos"
            name="parrafos"
            defaultValue={comoTextarea(textos(valor, "parrafos"))}
            rows={6}
          />
        </Campo>

        <Campo etiqueta="Foto">
          <CampoImagen name="imagen" urlInicial={texto(valor, "imagen")} />
        </Campo>

        <Campo etiqueta="Descripción de la foto" htmlFor="intro_imagen_alt">
          <Entrada
            id="intro_imagen_alt"
            name="imagen_alt"
            defaultValue={texto(valor, "imagen_alt")}
            maxLength={300}
          />
        </Campo>

        <Campo
          etiqueta="Cifras destacadas"
          className="sm:col-span-2"
          ayuda="De dos a cuatro. Por ejemplo: 45 min · desde Cali."
        >
          <EditorLista
            name="datos"
            inicial={objetos(valor, "datos", ["valor", "etiqueta"])}
            etiquetaElemento="cifra"
            maximo={4}
            campos={[
              { clave: "valor", etiqueta: "Cifra", tipo: "texto", marcador: "45 min" },
              {
                clave: "etiqueta",
                etiqueta: "Qué significa",
                tipo: "texto",
                marcador: "desde Cali",
              },
            ]}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Encabezados de bloque (cabañas y experiencias)
 * ------------------------------------------------------------------------- */

export function FormularioSeccionSimple({
  clave,
  valor,
}: {
  clave: "home.cabanas" | "home.experiencias";
  valor: Valor;
}) {
  const sufijo = clave.replace(".", "_");
  return (
    <FormularioAccion
      accion={guardarSeccionSimpleAction}
      etiquetaEnviar="Guardar"
    >
      <input type="hidden" name="clave" value={clave} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor={`${sufijo}_ante`}>
          <Entrada
            id={`${sufijo}_ante`}
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor={`${sufijo}_titulo`} obligatorio>
          <Entrada
            id={`${sufijo}_titulo`}
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Descripción"
          htmlFor={`${sufijo}_desc`}
          className="sm:col-span-2"
        >
          <AreaTexto
            id={`${sufijo}_desc`}
            name="descripcion"
            defaultValue={texto(valor, "descripcion")}
            maxLength={600}
            rows={2}
          />
        </Campo>
        <Campo etiqueta="Botón — texto" htmlFor={`${sufijo}_cta`}>
          <Entrada
            id={`${sufijo}_cta`}
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
          />
        </Campo>
        <Campo etiqueta="Botón — a dónde lleva" htmlFor={`${sufijo}_href`}>
          <Entrada
            id={`${sufijo}_href`}
            name="cta_href"
            defaultValue={texto(valor, "cta_href")}
            maxLength={200}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

export function FormularioPlanes({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarPlanesAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="planes_ante">
          <Entrada
            id="planes_ante"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="planes_titulo" obligatorio>
          <Entrada
            id="planes_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Descripción"
          htmlFor="planes_desc"
          className="sm:col-span-2"
        >
          <AreaTexto
            id="planes_desc"
            name="descripcion"
            defaultValue={texto(valor, "descripcion")}
            maxLength={600}
            rows={2}
          />
        </Campo>
        <Campo
          etiqueta="Nota sobre las tarifas"
          htmlFor="planes_nota"
          className="sm:col-span-2"
          ayuda="Los precios NO se escriben aquí: salen de lo que pongas en cada cabaña."
        >
          <AreaTexto
            id="planes_nota"
            name="nota"
            defaultValue={texto(valor, "nota")}
            maxLength={400}
            rows={2}
          />
        </Campo>
        <Campo etiqueta="Botón — texto" htmlFor="planes_cta">
          <Entrada
            id="planes_cta"
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
          />
        </Campo>
        <Campo etiqueta="Botón — a dónde lleva" htmlFor="planes_href">
          <Entrada
            id="planes_href"
            name="cta_href"
            defaultValue={texto(valor, "cta_href")}
            maxLength={200}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Naturaleza
 * ------------------------------------------------------------------------- */

export function FormularioEsencia({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarEsenciaAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="esencia_ante">
          <Entrada
            id="esencia_ante"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="esencia_titulo" obligatorio>
          <Entrada
            id="esencia_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Párrafos"
          htmlFor="esencia_parrafos"
          className="sm:col-span-2"
          ayuda="Deja una línea en blanco entre un párrafo y el siguiente."
        >
          <AreaTexto
            id="esencia_parrafos"
            name="parrafos"
            defaultValue={comoTextarea(textos(valor, "parrafos"))}
            rows={5}
          />
        </Campo>
        <Campo
          etiqueta="Fotos"
          className="sm:col-span-2"
          ayuda="Tres se ven bien; con menos, la fila se recompone sola."
        >
          <EditorGaleria
            name="imagenes"
            inicial={galeria(valor, "imagenes")}
            carpeta="sitio"
            conPortada={false}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Reconocimiento (COP16)
 * ------------------------------------------------------------------------- */

export function FormularioReconocimiento({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion
      accion={guardarReconocimientoAction}
      etiquetaEnviar="Guardar"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="recon_ante">
          <Entrada
            id="recon_ante"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="recon_titulo" obligatorio>
          <Entrada
            id="recon_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Párrafos"
          htmlFor="recon_parrafos"
          className="sm:col-span-2"
          ayuda="Deja una línea en blanco entre un párrafo y el siguiente."
        >
          <AreaTexto
            id="recon_parrafos"
            name="parrafos"
            defaultValue={comoTextarea(textos(valor, "parrafos"))}
            rows={4}
          />
        </Campo>
        <Campo
          etiqueta="Foto"
          ayuda="Si hay video, esta foto es la que se ve antes de reproducirlo."
        >
          <CampoImagen
            name="imagen"
            urlInicial={texto(valor, "imagen")}
            proporcion="apaisada"
          />
        </Campo>
        <Campo etiqueta="Descripción de la foto" htmlFor="recon_alt">
          <Entrada
            id="recon_alt"
            name="imagen_alt"
            defaultValue={texto(valor, "imagen_alt")}
            maxLength={300}
          />
        </Campo>
        <Campo
          etiqueta="Video (opcional)"
          htmlFor="recon_video"
          className="sm:col-span-2"
          ayuda="Dirección de un archivo .mp4 o .webm. Si la dejas vacía, la sección muestra la foto. El video se reproduce solo, silenciado y en bucle, con controles para subir el volumen."
        >
          <Entrada
            id="recon_video"
            name="video"
            type="url"
            defaultValue={texto(valor, "video")}
            maxLength={500}
            placeholder="https://…/videos/sitio/cop16-la-finca.mp4"
          />
        </Campo>
        <Campo etiqueta="Botón — texto" htmlFor="recon_cta">
          <Entrada
            id="recon_cta"
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
          />
        </Campo>
        <Campo etiqueta="Botón — a dónde lleva" htmlFor="recon_href">
          <Entrada
            id="recon_href"
            name="cta_href"
            defaultValue={texto(valor, "cta_href")}
            maxLength={200}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Testimonios
 * ------------------------------------------------------------------------- */

export function FormularioTestimonios({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarTestimoniosAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="testi_ante">
          <Entrada
            id="testi_ante"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="testi_titulo" obligatorio>
          <Entrada
            id="testi_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Reseñas"
          className="sm:col-span-2"
          ayuda="Son reseñas reales de huéspedes. Se publican sin foto: el sitio muestra las iniciales del nombre."
        >
          <EditorLista
            name="items"
            inicial={objetos(valor, "items", ["texto", "autor"])}
            etiquetaElemento="reseña"
            maximo={20}
            campos={[
              {
                clave: "texto",
                etiqueta: "Qué dijo",
                tipo: "parrafo",
                marcador: "Excelente experiencia…",
              },
              {
                clave: "autor",
                etiqueta: "Quién lo dijo",
                tipo: "texto",
                marcador: "Angela Buitrago",
              },
            ]}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Cierre de la portada
 * ------------------------------------------------------------------------- */

export function FormularioCtaFinal({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarCtaFinalAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          etiqueta="Titular"
          htmlFor="cta_titulo"
          obligatorio
          className="sm:col-span-2"
        >
          <Entrada
            id="cta_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Texto"
          htmlFor="cta_texto_largo"
          className="sm:col-span-2"
        >
          <AreaTexto
            id="cta_texto_largo"
            name="texto"
            defaultValue={texto(valor, "texto")}
            maxLength={600}
            rows={2}
          />
        </Campo>
        <Campo etiqueta="Botón — texto" htmlFor="cta_boton">
          <Entrada
            id="cta_boton"
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
          />
        </Campo>
        <Campo etiqueta="Botón — a dónde lleva" htmlFor="cta_href_final">
          <Entrada
            id="cta_href_final"
            name="cta_href"
            defaultValue={texto(valor, "cta_href")}
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Foto de fondo (horizontal)"
          ayuda="Ocupa todo el ancho de la pantalla."
        >
          <CampoImagen
            name="imagen"
            urlInicial={texto(valor, "imagen")}
            proporcion="apaisada"
          />
        </Campo>
        <Campo etiqueta="Descripción de la foto" htmlFor="cta_alt">
          <Entrada
            id="cta_alt"
            name="imagen_alt"
            defaultValue={texto(valor, "imagen_alt")}
            maxLength={300}
          />
        </Campo>
      </div>
      <p className="mt-4 text-[0.75rem] text-crema-600">{AYUDA_VACIO}</p>
    </FormularioAccion>
  );
}
