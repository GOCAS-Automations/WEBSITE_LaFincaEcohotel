"use server";

import { PAGINAS_CON_CABECERA } from "./secciones";
import { requireAdmin } from "@/lib/admin/auth";
import { leerFilaContenido } from "@/lib/admin/datos";
import { cadenasDe, limpiarImagenesHuerfanas } from "@/lib/admin/limpieza-storage";
import { refrescarPanel, revalidarSitioPublico } from "@/lib/admin/revalidar";
import { estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import {
  ErrorDeValidacion,
  aParrafos,
  aParrafosConLineas,
  ejecutarAccion,
  enteroOpcional,
  enumRequerido,
  fechaRequerida,
  listaGaleria,
  listaObjetos,
  listaTexto,
  mapaEmbebido,
  textoOpcional,
  textoRequerido,
  traducirErrorPostgres,
  urlImagenOpcional,
} from "@/lib/admin/validacion";
import { CLAVES_LEGALES, CLAVE_CMS_LEGAL } from "@/lib/legal";

const RUTA = "/admin/contenido";

/**
 * Guarda una fila del CMS FUSIONANDO con lo que ya había.
 *
 * El `valor` es un jsonb libre que puede tener claves que este formulario no
 * muestra. Sobrescribir el objeto entero las perdería, así que lo enviado pisa
 * lo existente y el resto se conserva. Es lo que exige el contrato de
 * `docs/CMS_CLAVES.md`.
 *
 * Después:
 *   · limpieza de las imágenes que salieron de la fila y ya no usa nadie,
 *   · revalidación de LAS DOS cachés de Next (etiqueta + rutas). Sin las dos,
 *     el cambio no se ve.
 */
async function guardarContenido(
  clave: string,
  parche: Record<string, unknown>,
  rutaSeccion: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const actual = await leerFilaContenido(supabase, clave);
  const fusionado = { ...actual, ...parche };

  const { error } = await supabase
    .from("contenido")
    .upsert({ clave, valor: fusionado }, { onConflict: "clave" });

  if (error) throw traducirErrorPostgres(error);

  /* Higiene de Storage: cualquier dirección que estuviera en la fila ANTES y
     ya no esté DESPUÉS queda potencialmente huérfana. No hace falta filtrar
     qué cadenas "parecen" una imagen: las que no lo sean nunca coinciden con
     el prefijo del bucket y se descartan solas más adelante. */
  const siguenUsadas = new Set(cadenasDe(fusionado));
  const huerfanas = cadenasDe(actual).filter((url) => !siguenUsadas.has(url));
  if (huerfanas.length > 0) {
    await limpiarImagenesHuerfanas(supabase, huerfanas);
  }

  refrescarPanel(RUTA, `${RUTA}/${rutaSeccion}`);
  revalidarSitioPublico();
}

const HECHO = "Guardado. El sitio ya muestra el cambio.";

/* ===========================================================================
 * Portada
 * ======================================================================== */

export async function guardarHeroAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "home.hero",
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        subtitulo: textoOpcional(formData, "subtitulo", 400) ?? "",
        parrafo: textoOpcional(formData, "parrafo", 800) ?? "",
        cta_texto: textoOpcional(formData, "cta_texto", 60) ?? "",
        cta_href: textoOpcional(formData, "cta_href", 200) ?? "",
        cta_secundario_texto:
          textoOpcional(formData, "cta_secundario_texto", 60) ?? "",
        cta_secundario_href:
          textoOpcional(formData, "cta_secundario_href", 200) ?? "",
        imagen: urlImagenOpcional(formData, "imagen"),
        imagen_movil: urlImagenOpcional(formData, "imagen_movil"),
        imagen_alt: textoOpcional(formData, "imagen_alt", 300) ?? "",
      },
      "portada",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarIntroAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "home.intro",
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        parrafos: aParrafos(textoOpcional(formData, "parrafos", 6000)),
        imagen: urlImagenOpcional(formData, "imagen"),
        imagen_alt: textoOpcional(formData, "imagen_alt", 300) ?? "",
        datos: listaObjetos(formData, "datos", ["valor", "etiqueta"], 4),
      },
      "portada",
    );
    return estadoOk(HECHO);
  });
}

/** `home.cabanas` y `home.experiencias` tienen exactamente la misma forma. */
const CLAVES_SECCION_SIMPLE = ["home.cabanas", "home.experiencias"] as const;

export async function guardarSeccionSimpleAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const clave = enumRequerido(
      formData,
      "clave",
      "Sección",
      CLAVES_SECCION_SIMPLE,
    );
    await guardarContenido(
      clave,
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        descripcion: textoOpcional(formData, "descripcion", 600) ?? "",
        cta_texto: textoOpcional(formData, "cta_texto", 60) ?? "",
        cta_href: textoOpcional(formData, "cta_href", 200) ?? "",
      },
      "portada",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarPlanesAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "home.planes",
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        descripcion: textoOpcional(formData, "descripcion", 600) ?? "",
        nota: textoOpcional(formData, "nota", 400) ?? "",
        cta_texto: textoOpcional(formData, "cta_texto", 60) ?? "",
        cta_href: textoOpcional(formData, "cta_href", 200) ?? "",
      },
      "portada",
    );
    return estadoOk(HECHO);
  });
}

/*
  Aquí estaba `guardarEsenciaAction` («Naturaleza» / `home.esencia`). La
  sección se retiró de la portada el 2026-09-15 y la clave salió del CMS: no la
  usaba ninguna otra página. Ver `docs/CMS_CLAVES.md`.
*/

/**
 * «Somos COP16».
 *
 * La clave dice `conocenos.` y no `home.` porque la sección se mudó de la
 * portada a `/conocenos` el 2026-09-14 (migración 008, que renombra la fila
 * existente para no perder lo que el hotel hubiera editado). Y por eso también
 * revalida la pantalla `lugar` del panel, no la de portada.
 */
export async function guardarReconocimientoAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "conocenos.reconocimiento",
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        parrafos: aParrafos(textoOpcional(formData, "parrafos", 6000)),
        imagen: urlImagenOpcional(formData, "imagen"),
        imagen_alt: textoOpcional(formData, "imagen_alt", 300) ?? "",
        /* La dirección del video. Va como texto y no por `CampoImagen`: el
           bucket de videos es otro (migración 007) y la subida de archivos del
           panel solo acepta imágenes. Si se deja vacía, la sección vuelve a
           pintarse con la foto. */
        video: textoOpcional(formData, "video", 500) ?? "",
        cta_texto: textoOpcional(formData, "cta_texto", 60) ?? "",
        cta_href: textoOpcional(formData, "cta_href", 200) ?? "",
      },
      "lugar",
    );
    return estadoOk(HECHO);
  });
}

/**
 * La tira de Instagram de la portada.
 *
 * `reel_url` se guarda como texto y NO se valida contra Instagram aquí: el
 * sitio lo hace al pintarla (`direccionEmbebido()` en
 * `src/components/sitio/reel-instagram.tsx` solo acepta un permalink de
 * instagram.com y, si no lo es, no pinta el reel). Validarlo también en el
 * panel obligaría a mantener la misma regla escrita en dos sitios, y la del
 * sitio es la que manda porque es la que decide qué acaba en un `<iframe>`.
 *
 * El enlace del perfil y el arroba NO están aquí: viven en `sitio.contacto`.
 */
export async function guardarInstagramAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "home.instagram",
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        descripcion: textoOpcional(formData, "descripcion", 600) ?? "",
        cta_texto: textoOpcional(formData, "cta_texto", 60) ?? "",
        reel_url: textoOpcional(formData, "reel_url", 500) ?? "",
        reel_alt: textoOpcional(formData, "reel_alt", 300) ?? "",
        fotos: listaGaleria(formData, "fotos"),
      },
      "portada",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarTestimoniosAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "home.testimonios",
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        items: listaObjetos(formData, "items", ["texto", "autor"], 20),
      },
      "portada",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarCtaFinalAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "home.cta_final",
      {
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        texto: textoOpcional(formData, "texto", 600) ?? "",
        cta_texto: textoOpcional(formData, "cta_texto", 60) ?? "",
        cta_href: textoOpcional(formData, "cta_href", 200) ?? "",
        imagen: urlImagenOpcional(formData, "imagen"),
        imagen_alt: textoOpcional(formData, "imagen_alt", 300) ?? "",
      },
      "portada",
    );
    return estadoOk(HECHO);
  });
}

/* ===========================================================================
 * Cabeceras de las siete páginas internas
 * ======================================================================== */

export async function guardarCabecerasAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const parche: Record<string, unknown> = {};

    for (const pagina of PAGINAS_CON_CABECERA.map((item) => item.clave)) {
      parche[pagina] = {
        titulo: textoOpcional(formData, `${pagina}__titulo`, 200) ?? "",
        subtitulo: textoOpcional(formData, `${pagina}__subtitulo`, 500) ?? "",
        imagen: urlImagenOpcional(formData, `${pagina}__imagen`),
        imagen_alt: textoOpcional(formData, `${pagina}__imagen_alt`, 300) ?? "",
      };
    }

    await guardarContenido("heroes.listados", parche, "cabeceras");
    return estadoOk(HECHO);
  });
}

/* ===========================================================================
 * Páginas internas
 * ======================================================================== */

export async function guardarPaginaExperienciasAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "experiencias",
      {
        intro: textoOpcional(formData, "intro", 800) ?? "",
        adicionales_titulo:
          textoOpcional(formData, "adicionales_titulo", 200) ?? "",
        adicionales_descripcion:
          textoOpcional(formData, "adicionales_descripcion", 600) ?? "",
        adicionales: listaObjetos(
          formData,
          "adicionales",
          ["nombre", "descripcion", "imagen", "imagen_alt"],
          12,
        ),
      },
      "experiencias",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarFaqAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "faq",
      {
        intro: textoOpcional(formData, "intro", 800) ?? "",
        items: listaObjetos(formData, "items", ["pregunta", "respuesta"], 40),
      },
      "preguntas",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarLugarAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "lugar",
      {
        antetitulo: textoOpcional(formData, "antetitulo", 120) ?? "",
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        parrafos: aParrafos(textoOpcional(formData, "parrafos", 8000)),
        imagen: urlImagenOpcional(formData, "imagen"),
        imagen_alt: textoOpcional(formData, "imagen_alt", 300) ?? "",
        imagen_secundaria: urlImagenOpcional(formData, "imagen_secundaria"),
        imagen_secundaria_alt:
          textoOpcional(formData, "imagen_secundaria_alt", 300) ?? "",
        instalaciones_titulo:
          textoOpcional(formData, "instalaciones_titulo", 200) ?? "",
        instalaciones_descripcion:
          textoOpcional(formData, "instalaciones_descripcion", 600) ?? "",
        instalaciones: listaObjetos(
          formData,
          "instalaciones",
          [
            "nombre",
            "descripcion",
            "imagen",
            "imagen_alt",
            "imagen_posicion",
          ],
          12,
        ),
        llegar_titulo: textoOpcional(formData, "llegar_titulo", 200) ?? "",
        llegar_parrafos: aParrafos(
          textoOpcional(formData, "llegar_parrafos", 6000),
        ),
        llegar_indicaciones: listaTexto(formData, "llegar_indicaciones", 12),
      },
      "lugar",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarGaleriaAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "galeria",
      {
        intro: textoOpcional(formData, "intro", 800) ?? "",
        imagenes: listaGaleria(formData, "imagenes").slice(0, 80),
      },
      "galeria",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarReservarAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "reservar",
      {
        intro: textoOpcional(formData, "intro", 800) ?? "",
        pasos: listaObjetos(formData, "pasos", ["titulo", "texto"], 8),
        nota: textoOpcional(formData, "nota", 400) ?? "",
      },
      "reservar",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarNoEncontradoAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "no_encontrado",
      {
        titulo: textoRequerido(formData, "titulo", "Titular", 200),
        mensaje: textoOpcional(formData, "mensaje", 600) ?? "",
        cta_texto: textoOpcional(formData, "cta_texto", 60) ?? "",
        cta_href: textoOpcional(formData, "cta_href", 200) ?? "",
      },
      "reservar",
    );
    return estadoOk(HECHO);
  });
}

/* ===========================================================================
 * Contacto y buscadores
 * ======================================================================== */

export async function guardarContactoAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    /* El número de WhatsApp se guarda SOLO con dígitos: es lo que espera el
       enlace `wa.me`. El sitio lo vuelve a limpiar por si acaso, pero aquí ya
       se normaliza para que lo guardado sea lo correcto. */
    const whatsapp = (textoOpcional(formData, "whatsapp", 30) ?? "").replace(
      /\D/g,
      "",
    );

    await guardarContenido(
      "sitio.contacto",
      {
        whatsapp,
        whatsapp_visible:
          textoOpcional(formData, "whatsapp_visible", 40) ?? "",
        mensaje_whatsapp:
          textoOpcional(formData, "mensaje_whatsapp", 500) ?? "",
        correo: textoOpcional(formData, "correo", 200) ?? "",
        direccion: textoOpcional(formData, "direccion", 200) ?? "",
        ciudad: textoOpcional(formData, "ciudad", 100) ?? "",
        region: textoOpcional(formData, "region", 100) ?? "",
        pais: textoOpcional(formData, "pais", 100) ?? "",
        direccion_completa:
          textoOpcional(formData, "direccion_completa", 300) ?? "",
        horario_restaurante:
          textoOpcional(formData, "horario_restaurante", 200) ?? "",
        rnt: textoRequerido(formData, "rnt", "RNT", 40),
        instagram: textoOpcional(formData, "instagram", 300) ?? "",
        instagram_usuario:
          textoOpcional(formData, "instagram_usuario", 100) ?? "",
        facebook: textoOpcional(formData, "facebook", 300) ?? "",
        tiktok: textoOpcional(formData, "tiktok", 300) ?? "",
        tiktok_usuario: textoOpcional(formData, "tiktok_usuario", 100) ?? "",
        mapa_url: textoOpcional(formData, "mapa_url", 800) ?? "",
        /* El mapa embebido acaba en un `<iframe src>` de dos páginas públicas:
           se comprueba que sea de Google o no se guarda. Ver
           `src/lib/mapa-embebido.ts`. */
        mapa_embed: mapaEmbebido(formData, "mapa_embed"),
        mapa_como_llegar:
          textoOpcional(formData, "mapa_como_llegar", 800) ?? "",
      },
      "contacto",
    );
    return estadoOk(HECHO);
  });
}

export async function guardarSeoAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await guardarContenido(
      "sitio.seo",
      {
        titulo: textoRequerido(formData, "titulo", "Título en Google", 200),
        descripcion: textoOpcional(formData, "descripcion", 400) ?? "",
        palabras_clave: listaTexto(formData, "palabras_clave", 20),
        imagen: {
          url: urlImagenOpcional(formData, "imagen_url"),
          alt: textoOpcional(formData, "imagen_alt", 300) ?? "",
          ancho: enteroOpcional(formData, "imagen_ancho", "Ancho", {
            min: 1,
            max: 5000,
          }) ?? 1200,
          alto: enteroOpcional(formData, "imagen_alto", "Alto", {
            min: 1,
            max: 5000,
          }) ?? 630,
        },
      },
      "buscadores",
    );
    return estadoOk(HECHO);
  });
}

/* ===========================================================================
 * Documentos legales
 * ===========================================================================
 *
 * Los cuatro documentos (`legal.privacidad`, `legal.terminos`, `legal.datos`,
 * `legal.cancelacion`) pasaron al CMS el 2026-09-16, por pedido de Cesar. Una
 * sola acción para los cuatro: tienen exactamente la misma forma, y cuatro
 * copias de esto habrían empezado a divergir a la primera corrección.
 *
 * Dos cuidados propios de estos textos:
 *   · **Los párrafos se cortan SOLO por línea en blanco** (`aParrafosConLineas`).
 *     Las listas de viñetas son un párrafo con varias líneas que empiezan por
 *     «- »; el `aParrafos()` de la portada las juntaría en una frase corrida.
 *   · **Las secciones caben enteras**: 12.000 caracteres por campo en vez de
 *     los 4.000 de una pregunta frecuente.
 * ======================================================================== */

export async function guardarLegalAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const clave = enumRequerido(
      formData,
      "clave_legal",
      "Documento",
      CLAVES_LEGALES,
    );

    const secciones = listaObjetos(
      formData,
      "secciones",
      ["titulo", "parrafos"],
      40,
      12_000,
    ).map((seccion) => ({
      titulo: seccion.titulo,
      parrafos: aParrafosConLineas(seccion.parrafos),
    }));

    if (secciones.length === 0) {
      throw new ErrorDeValidacion(
        "Un documento legal no puede quedarse sin secciones. Si quieres volver al texto original, borra lo que escribiste y avísale al desarrollador.",
      );
    }

    await guardarContenido(
      CLAVE_CMS_LEGAL[clave],
      {
        titulo: textoRequerido(formData, "titulo", "Título del documento", 200),
        entrada: textoOpcional(formData, "entrada", 600) ?? "",
        descripcion: textoOpcional(formData, "descripcion", 400) ?? "",
        actualizado: fechaRequerida(
          formData,
          "actualizado",
          "Fecha de actualización",
        ),
        secciones,
      },
      "legales",
    );

    return estadoOk(HECHO);
  });
}
