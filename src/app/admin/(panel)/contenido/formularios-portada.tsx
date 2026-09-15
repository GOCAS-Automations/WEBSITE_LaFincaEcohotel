"use client";

import {
  guardarCtaFinalAction,
  guardarHeroAction,
  guardarIntroAction,
  guardarPlanesAction,
  guardarInstagramAction,
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
 * Aquí estaba «Naturaleza» (`home.esencia`).
 *
 * La sección se retiró de la portada el 2026-09-15 —Cesar pidió acortarla— y
 * la clave salió del CMS con ella: no la usaba ninguna otra página. El texto
 * de marca que contaba vive en «Sobre nosotros» de `/conocenos`, que se edita
 * en la pantalla «Conócenos» de este mismo panel.
 * ------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 * Instagram
 * ------------------------------------------------------------------------- */

/**
 * La tira de Instagram de la portada.
 *
 * Dos avisos que hay que dejar escritos en la ayuda del formulario, porque
 * quien lo edita no tiene por qué saberlos:
 *
 *   · las fotos NO se traen del perfil de Instagram (eso exigiría una app de
 *     Meta y un token que caduca): son fotos del bucket, y la PRIMERA hace
 *     además de portada del reel;
 *   · el enlace del perfil y el arroba no se escriben aquí, salen de la
 *     pantalla «Contacto, WhatsApp y redes».
 */
export function FormularioInstagram({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarInstagramAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="ig_ante">
          <Entrada
            id="ig_ante"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="ig_titulo" obligatorio>
          <Entrada
            id="ig_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Descripción"
          htmlFor="ig_desc"
          className="sm:col-span-2"
        >
          <AreaTexto
            id="ig_desc"
            name="descripcion"
            defaultValue={texto(valor, "descripcion")}
            rows={3}
            maxLength={600}
          />
        </Campo>
        <Campo
          etiqueta="Enlace del reel"
          htmlFor="ig_reel"
          className="sm:col-span-2"
          ayuda="Pega la dirección de la publicación desde Instagram (por ejemplo https://www.instagram.com/reel/DbO8x0SxnFX/). El video NO se descarga hasta que el visitante lo toca. Si dejas esto vacío, la sección muestra solo las fotos."
        >
          <Entrada
            id="ig_reel"
            name="reel_url"
            type="url"
            defaultValue={texto(valor, "reel_url")}
            maxLength={500}
            placeholder="https://www.instagram.com/reel/…/"
          />
        </Campo>
        <Campo
          etiqueta="Descripción del video"
          htmlFor="ig_reel_alt"
          className="sm:col-span-2"
          ayuda="Qué se ve en el video, para quien no puede verlo."
        >
          <Entrada
            id="ig_reel_alt"
            name="reel_alt"
            defaultValue={texto(valor, "reel_alt")}
            maxLength={300}
          />
        </Campo>
        <Campo
          etiqueta="Fotos"
          className="sm:col-span-2"
          ayuda="Se muestran las cuatro primeras, en cuadrado. La PRIMERA es además la portada del video. No se traen de Instagram: son fotos del hotel, y al tocarlas se abre el perfil."
        >
          <EditorGaleria
            name="fotos"
            inicial={galeria(valor, "fotos")}
            carpeta="sitio"
            conPortada={false}
          />
        </Campo>
        <Campo
          etiqueta="Botón — texto"
          htmlFor="ig_cta"
          className="sm:col-span-2"
          ayuda="A dónde lleva el botón no se configura aquí: es el enlace de Instagram de la pantalla «Contacto, WhatsApp y redes»."
        >
          <Entrada
            id="ig_cta"
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
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
