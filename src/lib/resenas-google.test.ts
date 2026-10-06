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
  actualizarRepertorio,
  describirAntiguedad,
  getResenasGoogle,
  normalizarRepertorioGuardado,
  normalizarRespuestaGoogle,
  seleccionarResenas,
  type EntradaRepertorio,
  type ResenaGoogle,
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
  id?: string;
}) {
  return {
    ...(opciones.id ? { name: opciones.id } : {}),
    rating: opciones.rating ?? 5,
    text: { text: opciones.texto ?? "Un lugar precioso, volveremos." },
    authorAttribution: {
      displayName: opciones.autor ?? "Ana",
      photoUri: "https://lh3.googleusercontent.com/a/foto",
      /* Un perfil por autor, como en Google: el mismo perfil es la misma
         reseña para el repertorio. */
      uri: `https://www.google.com/maps/contrib/${encodeURIComponent(opciones.autor ?? "Ana")}`,
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
      enRepertorio: 3,
      aprobadas: 3,
      delUltimoAno: 3,
    });
  });

  it("primero las del último año y, si no llegan a cinco, completa con las más antiguas", () => {
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

    expect(resumen?.resenas.map((r) => r.autor)).toEqual([
      "A",
      "B",
      "C",
      "Vieja",
      "Antigua",
    ]);
    expect(resumen?.seleccion).toEqual({
      devueltas: 5,
      enRepertorio: 5,
      aprobadas: 5,
      delUltimoAno: 3,
    });
  });

  it("una reciente de 4★ va delante de una antigua de 5★", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "Antigua 5", rating: 5, publicada: "2024-01-01T00:00:00Z" }),
        resenaCruda({ autor: "Reciente 4", rating: 4, publicada: "2026-05-01T00:00:00Z" }),
      ]),
      AHORA,
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual([
      "Reciente 4",
      "Antigua 5",
    ]);
  });

  it("entre las antiguas que completan, primero las de más estrellas", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "Vieja 4", rating: 4, publicada: "2025-01-01T00:00:00Z" }),
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
    expect(resumen?.seleccion?.delUltimoAno).toBe(1);
  });

  it("nunca completa con una de menos de 4★, aunque queden menos de cinco", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "A", publicada: "2026-09-01T00:00:00Z" }),
        resenaCruda({ autor: "B", publicada: "2026-08-01T00:00:00Z" }),
        resenaCruda({ autor: "C", publicada: "2026-07-01T00:00:00Z" }),
        resenaCruda({ autor: "D", publicada: "2022-07-01T00:00:00Z" }),
        resenaCruda({ autor: "Tres", rating: 3, publicada: "2026-09-15T00:00:00Z" }),
      ]),
      AHORA,
    );

    expect(resumen?.resenas.map((r) => r.autor)).toEqual(["A", "B", "C", "D"]);
  });

  it("el texto «Hace …» se recalcula desde la fecha, no se copia el de Google", () => {
    const resumen = normalizarRespuestaGoogle(
      respuestaGoogle([
        resenaCruda({ autor: "A", publicada: "2026-01-25T13:31:56.963048194Z" }),
      ]),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(resumen?.resenas[0]?.tiempoRelativo).toBe("Hace 8 meses");
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
    /* Dos escrituras de la MISMA llamada: el repertorio y el resumen. */
    expect(guardarCache).toHaveBeenCalledTimes(2);
    expect(guardarCache).toHaveBeenCalledWith(
      "resenas_google:repertorio",
      expect.objectContaining({ resenas: expect.any(Array) }),
    );
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

/* ===========================================================================
 * El repertorio: que siempre haya cinco sin gastar más llamadas
 * ======================================================================== */

/** Una reseña ya normalizada, como las que viven en el repertorio. */
function resena(
  autor: string,
  publicadaEn: string,
  extra: Partial<ResenaGoogle> = {},
): ResenaGoogle {
  return {
    autor,
    foto: null,
    perfil: `https://www.google.com/maps/contrib/${encodeURIComponent(autor)}`,
    calificacion: 5,
    texto: `Reseña de ${autor}.`,
    tiempoRelativo: "Hace un tiempo",
    publicadaEn,
    ...extra,
  };
}

function entrada(
  autor: string,
  publicadaEn: string,
  vistaEn: string,
  extra: Partial<ResenaGoogle> = {},
): EntradaRepertorio {
  return { ...resena(autor, publicadaEn, extra), vistaEn };
}

describe("describirAntiguedad", () => {
  const AHORA = new Date("2026-10-06T12:00:00Z");

  it.each([
    ["2026-10-06T08:00:00Z", "Hoy"],
    ["2026-10-05T08:00:00Z", "Hace un día"],
    ["2026-10-02T08:00:00Z", "Hace 4 días"],
    ["2026-09-29T08:00:00Z", "Hace una semana"],
    ["2026-09-20T08:00:00Z", "Hace 2 semanas"],
    ["2026-09-01T08:00:00Z", "Hace un mes"],
    ["2026-07-25T13:31:56.963048194Z", "Hace 2 meses"],
    ["2026-04-10T02:16:01Z", "Hace 5 meses"],
    ["2025-09-01T00:00:00Z", "Hace un año"],
    ["2023-01-01T00:00:00Z", "Hace 3 años"],
  ])("%s → %s", (fecha, esperado) => {
    expect(describirAntiguedad(fecha, AHORA)).toBe(esperado);
  });
});

describe("seleccionarResenas sobre el repertorio", () => {
  const AHORA = new Date("2026-10-06T12:00:00Z");

  it("con más de cinco del último año, las cinco mejores y, a igual nota, las más nuevas", () => {
    const { resenas, delUltimoAno } = seleccionarResenas(
      [
        resena("Cuatro", "2026-09-30T00:00:00Z", { calificacion: 4 }),
        resena("A", "2026-01-01T00:00:00Z"),
        resena("B", "2026-02-01T00:00:00Z"),
        resena("C", "2026-03-01T00:00:00Z"),
        resena("D", "2026-04-01T00:00:00Z"),
        resena("E", "2026-05-01T00:00:00Z"),
        resena("Antigua", "2022-01-01T00:00:00Z"),
      ],
      AHORA,
    );

    expect(resenas.map((r) => r.autor)).toEqual(["E", "D", "C", "B", "A"]);
    expect(delUltimoAno).toBe(5);
  });

  it("sin ninguna de 4★ o más, no publica nada", () => {
    expect(
      seleccionarResenas(
        [resena("Mala", "2026-09-01T00:00:00Z", { calificacion: 2 })],
        AHORA,
      ).resenas,
    ).toEqual([]);
  });
});

describe("actualizarRepertorio", () => {
  const AYER = "2026-10-05T12:00:00Z";
  const AHORA = new Date("2026-10-06T12:00:00Z");

  it("EL CASO REAL: una de las cinco de Google tiene 3★, pero el repertorio guarda las de días anteriores y se publican cinco", () => {
    /* Ayer Google devolvió A, B, C, D y una de 3★; hoy devuelve A, B, C, D
       y una nueva E. Cada día, cinco; acumulado, seis, y cinco publicables. */
    const ayer = actualizarRepertorio(
      [],
      [
        resena("A", "2026-09-01T00:00:00Z"),
        resena("B", "2026-07-01T00:00:00Z"),
        resena("C", "2026-05-01T00:00:00Z"),
        resena("D", "2026-02-01T00:00:00Z"),
        resena("Tres", "2026-08-01T00:00:00Z", { calificacion: 3 }),
      ],
      new Date(AYER),
    );
    expect(seleccionarResenas(ayer, new Date(AYER)).resenas).toHaveLength(4);

    const hoy = actualizarRepertorio(
      ayer,
      [
        resena("A", "2026-09-01T00:00:00Z"),
        resena("B", "2026-07-01T00:00:00Z"),
        resena("C", "2026-05-01T00:00:00Z"),
        resena("D", "2026-02-01T00:00:00Z"),
        resena("E", "2024-06-01T00:00:00Z"),
      ],
      AHORA,
    );

    expect(hoy).toHaveLength(6);
    expect(seleccionarResenas(hoy, AHORA).resenas.map((r) => r.autor)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });

  it("no duplica: la misma reseña (por id) queda una vez, con la versión de hoy", () => {
    const previo = [
      entrada("Ana", "2026-09-01T00:00:00Z", AYER, {
        id: "places/x/reviews/1",
        texto: "Texto de ayer.",
      }),
    ];

    const repertorio = actualizarRepertorio(
      previo,
      [
        resena("Ana", "2026-09-01T00:00:00Z", {
          id: "places/x/reviews/1",
          texto: "Texto de hoy.",
        }),
      ],
      AHORA,
    );

    expect(repertorio).toHaveLength(1);
    expect(repertorio[0]?.texto).toBe("Texto de hoy.");
    expect(repertorio[0]?.vistaEn).toBe(AHORA.toISOString());
  });

  it("no duplica una guardada sin id (de antes del repertorio): autor y fecha bastan, y hereda el id", () => {
    const previo = [
      entrada("Ana", "2026-09-01T10:00:00.123456789Z", AYER, { perfil: null }),
    ];

    const repertorio = actualizarRepertorio(
      previo,
      [
        resena("ana ", "2026-09-01T10:00:00.123456789Z", {
          id: "places/x/reviews/1",
          perfil: null,
        }),
      ],
      AHORA,
    );

    expect(repertorio).toHaveLength(1);
    expect(repertorio[0]?.id).toBe("places/x/reviews/1");
  });

  it("el mismo perfil es la misma reseña: si su autor la baja a 2★, deja de publicarse", () => {
    const previo = [entrada("Luis", "2026-03-01T00:00:00Z", AYER)];

    const repertorio = actualizarRepertorio(
      previo,
      [resena("Luis", "2026-09-30T00:00:00Z", { calificacion: 2 })],
      AHORA,
    );

    expect(repertorio).toHaveLength(1);
    expect(seleccionarResenas(repertorio, AHORA).resenas).toEqual([]);
  });

  it("una reseña que Google no devuelve hace más de 30 días sale del repertorio", () => {
    const repertorio = actualizarRepertorio(
      [
        entrada("Vista hace 29 días", "2026-01-01T00:00:00Z", "2026-09-07T12:00:00Z"),
        entrada("Vista hace 31 días", "2026-01-02T00:00:00Z", "2026-09-05T12:00:00Z"),
      ],
      [],
      AHORA,
    );

    expect(repertorio.map((r) => r.autor)).toEqual(["Vista hace 29 días"]);
  });

  it("no crece sin límite: se queda con las 50 más recientes", () => {
    const muchas = Array.from({ length: 60 }, (_, i) =>
      entrada(
        `Autor ${i}`,
        new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
        AYER,
      ),
    );

    const repertorio = actualizarRepertorio(muchas, [], AHORA);

    expect(repertorio).toHaveLength(50);
    expect(repertorio.at(-1)?.autor).toBe("Autor 10");
    expect(repertorio[0]?.autor).toBe("Autor 59");
  });
});

describe("normalizarRepertorioGuardado", () => {
  it("rechaza lo que no tiene forma de repertorio", () => {
    expect(normalizarRepertorioGuardado(null)).toBeNull();
    expect(normalizarRepertorioGuardado({})).toBeNull();
    expect(normalizarRepertorioGuardado({ resenas: "muchas" })).toBeNull();
  });

  it("descarta una a una las entradas dañadas, sin tirar las demás", () => {
    const buena = entrada("Ana", "2026-09-01T00:00:00Z", "2026-10-05T12:00:00Z");
    expect(
      normalizarRepertorioGuardado({
        resenas: [buena, { ...buena, vistaEn: "ayer" }, { autor: "Sin texto" }],
      }),
    ).toEqual([buena]);
  });
});

describe("refrescarResenasGoogle con repertorio", () => {
  let llamadasAGoogle: number;

  function googleDevuelve(resenas: unknown[]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        llamadasAGoogle += 1;
        return new Response(JSON.stringify(respuestaGoogle(resenas)), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
  }

  /** Lo que se guardó en una clave en este refresco. */
  function guardadoEn(clave: string): unknown {
    return vi.mocked(guardarCache).mock.calls.find(([c]) => c === clave)?.[1];
  }

  const hace = (dias: number) =>
    new Date(Date.now() - dias * 86_400_000).toISOString();

  beforeEach(() => {
    vi.mocked(leerCache).mockReset();
    vi.mocked(guardarCache).mockReset().mockResolvedValue(true);
    vi.mocked(tomarTurno).mockReset();
    llamadasAGoogle = 0;
    process.env.GOOGLE_PLACES_API_KEY = "clave-de-prueba";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("la primera vez siembra el repertorio con lo ya publicado y completa cinco con UNA llamada", async () => {
    /* Lo publicado: una reseña antigua que Google ya no está devolviendo. */
    vi.mocked(leerCache).mockImplementation(async (clave) =>
      clave === "resenas_google"
        ? {
            valor: {
              ...RESUMEN_GUARDADO,
              resenas: [resena("Vieja", "2025-03-01T00:00:00Z")],
            },
            actualizadoEn: hace(1),
          }
        : null,
    );
    googleDevuelve([
      resenaCruda({ autor: "A", publicada: hace(10) }),
      resenaCruda({ autor: "B", publicada: hace(40) }),
      resenaCruda({ autor: "C", publicada: hace(90) }),
      resenaCruda({ autor: "D", publicada: hace(200) }),
      resenaCruda({ autor: "Tres", rating: 3, publicada: hace(20) }),
    ]);

    const resultado = await refrescarResenasGoogle();

    expect(llamadasAGoogle).toBe(1);
    expect(resultado).toEqual({
      refrescado: true,
      resenas: 5,
      devueltas: 5,
      enRepertorio: 6,
      delUltimoAno: 4,
    });
    expect(
      (guardadoEn("resenas_google:repertorio") as { resenas: unknown[] }).resenas,
    ).toHaveLength(6);
    expect(
      (guardadoEn("resenas_google") as ResumenGoogle).resenas.map((r) => r.autor),
    ).toEqual(["A", "B", "C", "D", "Vieja"]);
  });

  it("acumula sobre el repertorio guardado sin duplicar lo que vuelve a llegar", async () => {
    vi.mocked(leerCache).mockImplementation(async (clave) =>
      clave === "resenas_google:repertorio"
        ? {
            valor: {
              resenas: [
                entrada("A", hace(10), hace(1)),
                entrada("Otra", hace(300), hace(2)),
              ],
            },
            actualizadoEn: hace(1),
          }
        : null,
    );
    googleDevuelve([resenaCruda({ autor: "A", publicada: hace(10) })]);

    const resultado = await refrescarResenasGoogle();

    expect(llamadasAGoogle).toBe(1);
    expect(resultado.enRepertorio).toBe(2);
    expect(resultado.resenas).toBe(2);
  });

  it("si Google falla, no se toca ni el repertorio ni el resumen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("cuota agotada", { status: 429 })),
    );

    expect(await refrescarResenasGoogle()).toEqual({
      refrescado: false,
      resenas: 0,
    });
    expect(guardarCache).not.toHaveBeenCalled();
    expect(leerCache).not.toHaveBeenCalled();
  });
});
