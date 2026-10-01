/**
 * Pruebas de `resenas-google.ts`.
 *
 * Lo que se prueba aquí no es «que las reseñas se vean»: eso se mira en una
 * captura. Lo que se prueba es la propiedad que cuesta dinero si se rompe:
 *
 *   **Una visita al sitio NUNCA llama a Google, salvo el arranque en frío, y el
 *   arranque en frío llama EXACTAMENTE una vez aunque entren diez visitas a la
 *   vez.**
 *
 * Google cobra por llamada (1.000 gratis al mes, 20 USD el millar después) y un
 * fallo en esta lógica no se nota en pantalla: se nota en la factura, un mes
 * después. Por eso se cuentan las llamadas a `fetch` en vez de comprobar el
 * resultado.
 *
 * La capa de base de datos (`cache-externo`) se sustituye por un doble en
 * memoria: lo que importa es la DECISIÓN (leer / pedir turno / llamar / guardar),
 * no la sintaxis de PostgREST, que ya se verificó contra la base real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* El doble de `cache-externo`. `vi.mock` se iza, así que las funciones se
   declaran con `vi.fn()` dentro de la factoría y se recuperan después. */
vi.mock("./cache-externo", () => ({
  leerCache: vi.fn(),
  guardarCache: vi.fn(),
  tomarTurno: vi.fn(),
}));

import { guardarCache, leerCache, tomarTurno } from "./cache-externo";
import {
  getResenasGoogle,
  normalizarRespuestaGoogle,
  normalizarResumenGuardado,
  refrescarResenasGoogle,
  MAPS_URL_RESPALDO,
  type ResumenGoogle,
} from "./resenas-google";

/* ===========================================================================
 * Material de prueba
 * ======================================================================== */

/** Una reseña cruda tal como la devuelve Places API (New). */
function resenaCruda(opciones: {
  autor?: string;
  rating?: number;
  texto?: string;
  publicada?: string;
}) {
  return {
    rating: opciones.rating ?? 5,
    text: { text: opciones.texto ?? "Un lugar precioso, volveremos." },
    authorAttribution: {
      displayName: opciones.autor ?? "Ana",
      photoUri: "https://lh3.googleusercontent.com/a/foto",
      uri: "https://www.google.com/maps/contrib/123",
    },
    publishTime: opciones.publicada ?? "2026-08-01T10:00:00Z",
    relativePublishTimeDescription: "Hace 2 meses",
  };
}

function respuestaGoogle(resenas: unknown[]) {
  return {
    rating: 4.7,
    userRatingCount: 50,
    googleMapsUri: "https://maps.google.com/?cid=123",
    reviews: resenas,
  };
}

/** Un resumen ya cocinado, como el que vive en `cache_externo.valor`. */
const RESUMEN_GUARDADO: ResumenGoogle = {
  promedio: 4.7,
  total: 50,
  mapsUrl: "https://maps.google.com/?cid=123",
  resenas: [
    {
      autor: "Ana",
      foto: null,
      perfil: null,
      calificacion: 5,
      texto: "Un lugar precioso, volveremos.",
      tiempoRelativo: "Hace 2 meses",
      publicadaEn: "2026-08-01T10:00:00Z",
    },
  ],
};

/* ===========================================================================
 * Normalización de lo que manda Google
 * ======================================================================== */

describe("normalizarRespuestaGoogle", () => {
  it("descarta las reseñas de menos de 4 estrellas", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "Buena", rating: 5 }),
        resenaCruda({ autor: "Regular", rating: 3 }),
        resenaCruda({ autor: "Mala", rating: 1 }),
      ]),
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual(["Buena"]);
  });

  const AHORA = new Date("2026-10-01T12:00:00Z");

  it("ordena por puntuación descendente y, a igual puntuación, la más reciente primero", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "Cuatro nueva", rating: 4, publicada: "2026-09-20T00:00:00Z" }),
        resenaCruda({ autor: "Cinco vieja", rating: 5, publicada: "2025-11-01T00:00:00Z" }),
        resenaCruda({ autor: "Cinco nueva", rating: 5, publicada: "2026-08-01T00:00:00Z" }),
      ]),
      AHORA,
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual([
      "Cinco nueva",
      "Cinco vieja",
      "Cuatro nueva",
    ]);
    expect(resumen?.seleccion).toEqual({
      devueltas: 3,
      aprobadas: 3,
      ventanaMeses: 12,
    });
  });

  it("filtra a los últimos 12 meses cuando quedan al menos 3", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "A", publicada: "2026-09-01T00:00:00Z" }),
        resenaCruda({ autor: "B", publicada: "2026-03-01T00:00:00Z" }),
        resenaCruda({ autor: "C", publicada: "2025-11-01T00:00:00Z" }),
        resenaCruda({ autor: "Vieja", publicada: "2025-06-01T00:00:00Z" }),
        resenaCruda({ autor: "Antigua", publicada: "2023-01-01T00:00:00Z" }),
      ]),
      AHORA,
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual(["A", "B", "C"]);
    expect(resumen?.seleccion).toEqual({
      devueltas: 5,
      aprobadas: 3,
      ventanaMeses: 12,
    });
  });

  it("si 12 meses deja menos de 3, relaja la ventana a 24 meses", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "A", publicada: "2026-09-01T00:00:00Z" }),
        resenaCruda({ autor: "B", publicada: "2025-03-01T00:00:00Z" }),
        resenaCruda({ autor: "C", publicada: "2024-12-01T00:00:00Z" }),
        resenaCruda({ autor: "Antigua", publicada: "2023-01-01T00:00:00Z" }),
      ]),
      AHORA,
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual(["A", "B", "C"]);
    expect(resumen?.seleccion?.ventanaMeses).toBe(24);
  });

  it("sin reseñas recientes suficientes, usa las mejores disponibles sin filtro de fecha", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "Vieja 4", rating: 4, publicada: "2022-01-01T00:00:00Z" }),
        resenaCruda({ autor: "Vieja 5", rating: 5, publicada: "2021-01-01T00:00:00Z" }),
        resenaCruda({ autor: "Reciente", publicada: "2026-09-01T00:00:00Z" }),
      ]),
      AHORA,
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual([
      "Reciente",
      "Vieja 5",
      "Vieja 4",
    ]);
    expect(resumen?.seleccion).toEqual({
      devueltas: 3,
      aprobadas: 3,
      ventanaMeses: null,
    });
  });

  it("nunca publica más de cinco", () => {
    const muchas = Array.from({ length: 9 }, (_, i) =>
      resenaCruda({ autor: `Autor ${i}` }),
    );

    expect(normalizarRespuestaGoogle(respuestaGoogle(muchas))?.resenas).toHaveLength(
      5,
    );
  });

  it("descarta la reseña sin texto, sin autor o sin fecha válida", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        { ...resenaCruda({}), text: { text: "   " } },
        { ...resenaCruda({}), authorAttribution: { displayName: "" } },
        { ...resenaCruda({}), publishTime: "ayer por la tarde" },
        resenaCruda({ autor: "La única buena" }),
      ]),
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual(["La única buena"]);
  });

  it("sin `rating` o sin `userRatingCount` no hay resumen", () => {
    expect(
      normalizarRespuestaGoogle({ reviews: [resenaCruda({})] }),
    ).toBeNull();
    expect(
      normalizarRespuestaGoogle({ rating: 4.7, reviews: [resenaCruda({})] }),
    ).toBeNull();
  });

  it("si no queda ninguna reseña publicable, devuelve null", () => {
    expect(
      normalizarRespuestaGoogle(
        respuestaGoogle([resenaCruda({ rating: 2 })]),
      ),
    ).toBeNull();
  });

  it("cae al enlace oficial si Google no manda `googleMapsUri`", () => {
    const resumen = normalizarRespuestaGoogle({
      rating: 4.7,
      userRatingCount: 50,
      reviews: [resenaCruda({})],
    });

    expect(resumen?.mapsUrl).toBe(MAPS_URL_RESPALDO);
  });

  it("solo acepta la foto del autor si viene del host de Google por https", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        {
          ...resenaCruda({ autor: "Con foto ajena" }),
          authorAttribution: {
            displayName: "Con foto ajena",
            photoUri: "https://example.com/foto.jpg",
          },
        },
      ]),
    );

    expect(resumen?.resenas[0]?.foto).toBeNull();
  });
});

/* ===========================================================================
 * Revalidación de lo que salió del jsonb
 * ======================================================================== */

describe("normalizarResumenGuardado", () => {
  it("acepta un resumen bien formado", () => {
    expect(normalizarResumenGuardado(RESUMEN_GUARDADO)).toEqual(
      RESUMEN_GUARDADO,
    );
  });

  it("rechaza basura, null y filas a medio escribir", () => {
    expect(normalizarResumenGuardado(null)).toBeNull();
    expect(normalizarResumenGuardado({})).toBeNull();
    expect(normalizarResumenGuardado("4.7")).toBeNull();
    expect(
      normalizarResumenGuardado({ ...RESUMEN_GUARDADO, resenas: [] }),
    ).toBeNull();
    expect(
      normalizarResumenGuardado({ ...RESUMEN_GUARDADO, mapsUrl: "no-es-url" }),
    ).toBeNull();
    expect(
      normalizarResumenGuardado({ ...RESUMEN_GUARDADO, promedio: "muy bueno" }),
    ).toBeNull();
  });

  it("descarta la reseña guardada a la que le falta lo imprescindible", () => {
    const resumen = normalizarResumenGuardado({
      ...RESUMEN_GUARDADO,
      resenas: [
        { ...RESUMEN_GUARDADO.resenas[0], texto: "" },
        RESUMEN_GUARDADO.resenas[0],
      ],
    });

    expect(resumen?.resenas).toHaveLength(1);
  });
});

/* ===========================================================================
 * LO QUE DE VERDAD IMPORTA: cuántas veces se llama a Google
 * ======================================================================== */

describe("getResenasGoogle: el sitio no llama a Google", () => {
  let llamadasAGoogle: number;

  beforeEach(() => {
    vi.clearAllMocks();
    llamadasAGoogle = 0;
    process.env.GOOGLE_PLACES_API_KEY = "clave-de-prueba";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        llamadasAGoogle += 1;
        return new Response(
          JSON.stringify(respuestaGoogle([resenaCruda({})])),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("con el caché lleno: CERO llamadas a Google", async () => {
    vi.mocked(leerCache).mockResolvedValue({
      valor: RESUMEN_GUARDADO,
      actualizadoEn: "2026-10-01T12:00:00Z",
    });

    const resumen = await getResenasGoogle();

    expect(llamadasAGoogle).toBe(0);
    expect(tomarTurno).not.toHaveBeenCalled();
    expect(guardarCache).not.toHaveBeenCalled();
    expect(resumen?.promedio).toBe(4.7);
  });

  it("arranque en frío con el turno ganado: UNA sola llamada, y se guarda", async () => {
    vi.mocked(leerCache).mockResolvedValue(null);
    vi.mocked(tomarTurno).mockResolvedValue(true);
    vi.mocked(guardarCache).mockResolvedValue(true);

    const resumen = await getResenasGoogle();

    expect(llamadasAGoogle).toBe(1);
    expect(guardarCache).toHaveBeenCalledTimes(1);
    expect(guardarCache).toHaveBeenCalledWith(
      "resenas_google",
      expect.objectContaining({ promedio: 4.7, total: 50 }),
    );
    expect(resumen?.resenas).toHaveLength(1);
  });

  it("arranque en frío sin el turno (la estampida): CERO llamadas", async () => {
    vi.mocked(leerCache).mockResolvedValue(null);
    vi.mocked(tomarTurno).mockResolvedValue(false);

    const resumen = await getResenasGoogle();

    expect(llamadasAGoogle).toBe(0);
    expect(guardarCache).not.toHaveBeenCalled();
    /* Sin dato, la portada cae a los testimonios del CMS: nunca un error. */
    expect(resumen).toBeNull();
  });

  it("una fila corrupta en la base se trata como caché vacío, no revienta", async () => {
    vi.mocked(leerCache).mockResolvedValue({
      valor: { promedio: "cuatro y pico" },
      actualizadoEn: "2026-10-01T12:00:00Z",
    });
    vi.mocked(tomarTurno).mockResolvedValue(false);

    await expect(getResenasGoogle()).resolves.toBeNull();
    expect(llamadasAGoogle).toBe(0);
  });
});

describe("refrescarResenasGoogle: el refresco diario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_PLACES_API_KEY = "clave-de-prueba";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda y reporta cuántas reseñas quedaron", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify(
              respuestaGoogle([
                resenaCruda({ autor: "Ana" }),
                resenaCruda({ autor: "Luis" }),
              ]),
            ),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    vi.mocked(guardarCache).mockResolvedValue(true);

    expect(await refrescarResenasGoogle()).toMatchObject({
      refrescado: true,
      resenas: 2,
    });
  });

  it("si Google responde con error, NO se guarda nada: se conserva lo último bueno", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("cuota agotada", { status: 429 })),
    );

    expect(await refrescarResenasGoogle()).toEqual({
      refrescado: false,
      resenas: 0,
    });
    expect(guardarCache).not.toHaveBeenCalled();
  });

  it("si la red falla, tampoco se toca lo guardado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ETIMEDOUT");
      }),
    );

    expect(await refrescarResenasGoogle()).toEqual({
      refrescado: false,
      resenas: 0,
    });
    expect(guardarCache).not.toHaveBeenCalled();
  });

  it("sin GOOGLE_PLACES_API_KEY no se intenta ni la llamada", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);

    expect(await refrescarResenasGoogle()).toEqual({
      refrescado: false,
      resenas: 0,
    });
    expect(espia).not.toHaveBeenCalled();
  });
});
