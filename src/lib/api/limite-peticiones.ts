import "server-only";

/**
 * Freno de peticiones para los endpoints públicos y para el login.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES Y QUÉ NO ES
 * ---------------------------------------------------------------------------
 * Es una **ventana deslizante en memoria**: cuenta cuántas peticiones ha hecho
 * una misma clave (normalmente la IP) en los últimos N segundos y, pasado el
 * tope, responde 429 con `Retry-After`.
 *
 * Lo que SÍ resuelve, y es el problema real de este sitio:
 *
 *   · `/api/disponibilidad` y `/api/dia-de-calma/cupo` consultan con
 *     `service_role` y, la primera, además llama al Google Calendar del hotel.
 *     Sin freno, un script puede recorrer tres meses por cabaña en bucle: la
 *     base se satura, la cuota de la API de Google se agota y el hotel se queda
 *     sin calendario. Diez mil peticiones no roban un dato, pero tumban el
 *     motor de reservas el fin de semana que más se vende.
 *   · El login del panel: sin freno se pueden probar contraseñas a ritmo de
 *     máquina (la auditoría midió 12 intentos en 5,4 s sin que nada los
 *     detuviera).
 *
 * Lo que NO resuelve, y hay que saberlo: en Vercel cada instancia de la función
 * tiene SU propia memoria. Con varias instancias vivas, el tope efectivo se
 * multiplica por el número de instancias, y un despliegue lo reinicia. Es un
 * freno contra el abuso accidental y contra el atacante de un solo script, no
 * una garantía criptográfica. La garantía dura se compra en la capa de red
 * (reglas de Rate Limiting del firewall de Vercel) o con un contador
 * compartido (Upstash/Redis). Está anotado como pendiente en
 * `docs/AUDITORIA_SEGURIDAD.md`.
 *
 * Sin dependencias nuevas a propósito: un `Map` y un temporizador bastan, y
 * este proyecto no añade paquetes para lo que cabe en cuarenta líneas.
 */

type Marca = { conteo: number; desde: number };

/** Un registro por ventana y clave. Se limpia solo. */
const registro = new Map<string, Marca>();

/** Tope de claves vivas: un atacante con muchas IP no puede inflar la memoria. */
const MAXIMO_CLAVES = 10_000;

export type Limite = {
  /** Cuántas peticiones se admiten por ventana. */
  peticiones: number;
  /** Tamaño de la ventana, en segundos. */
  segundos: number;
};

export type ResultadoLimite = {
  /** `true` si la petición pasa. */
  permitido: boolean;
  /** Cuántas quedan en esta ventana. */
  restantes: number;
  /** Segundos hasta que la ventana se reinicie. */
  esperaSegundos: number;
};

/**
 * Cuenta una petición y dice si pasa.
 *
 * `clave` debe identificar a quien pide Y al recurso: así el tope de
 * disponibilidad no se gasta con las peticiones de cupo.
 */
export function contarPeticion(clave: string, limite: Limite): ResultadoLimite {
  const ahora = Date.now();
  const ventana = limite.segundos * 1000;

  /* Limpieza perezosa: solo cuando el mapa crece, y solo lo caducado. Evita un
     `setInterval` que mantendría viva la función sin necesidad. */
  if (registro.size > MAXIMO_CLAVES) {
    for (const [k, v] of registro) {
      if (ahora - v.desde > ventana) registro.delete(k);
    }
    /* Si aun así sigue lleno (ventanas largas), se vacía entero: perder el
       conteo es mucho menos grave que quedarse sin memoria. */
    if (registro.size > MAXIMO_CLAVES) registro.clear();
  }

  const marca = registro.get(clave);

  if (!marca || ahora - marca.desde >= ventana) {
    registro.set(clave, { conteo: 1, desde: ahora });
    return {
      permitido: true,
      restantes: limite.peticiones - 1,
      esperaSegundos: limite.segundos,
    };
  }

  marca.conteo += 1;
  const esperaSegundos = Math.max(
    1,
    Math.ceil((marca.desde + ventana - ahora) / 1000),
  );

  if (marca.conteo > limite.peticiones) {
    return { permitido: false, restantes: 0, esperaSegundos };
  }

  return {
    permitido: true,
    restantes: limite.peticiones - marca.conteo,
    esperaSegundos,
  };
}

/**
 * La IP de quien pide, tal como la deja Vercel.
 *
 * `x-forwarded-for` puede traer una cadena de proxies: la primera dirección es
 * la del cliente. En local no hay ninguna de las dos y se devuelve `local`, que
 * agrupa todas las peticiones de desarrollo bajo la misma clave (es lo que se
 * quiere para poder probar el 429 a mano).
 */
export function ipDeLaPeticion(peticion: Request): string {
  const cabecera =
    peticion.headers.get("x-forwarded-for") ??
    peticion.headers.get("x-real-ip") ??
    "";
  const primera = cabecera.split(",")[0]?.trim();
  return primera || "local";
}

/**
 * Respuesta 429 con el mensaje en español y `Retry-After`.
 *
 * El texto lo puede llegar a ver un huésped si el calendario del sitio pide
 * demasiadas veces seguidas, así que no dice «rate limit»: dice qué pasó y qué
 * hacer.
 */
export function respuesta429(esperaSegundos: number): Response {
  return new Response(
    JSON.stringify({
      error:
        "Demasiadas consultas seguidas desde tu conexión. Espera unos segundos y vuelve a intentarlo.",
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": String(esperaSegundos),
      },
    },
  );
}

/**
 * Atajo para un Route Handler: cuenta y devuelve la respuesta 429 ya hecha, o
 * `null` si la petición puede seguir.
 */
export function frenar(
  peticion: Request,
  recurso: string,
  limite: Limite,
): Response | null {
  const resultado = contarPeticion(
    `${recurso}:${ipDeLaPeticion(peticion)}`,
    limite,
  );
  return resultado.permitido ? null : respuesta429(resultado.esperaSegundos);
}

/**
 * Borra el conteo de una clave.
 *
 * Lo usa el login cuando alguien entra BIEN: quien acierta la contraseña no
 * arrastra los intentos fallidos de antes, así que un administrador que se
 * equivoca tres veces y luego acierta no se queda fuera un cuarto de hora.
 */
export function olvidarPeticiones(clave: string): void {
  registro.delete(clave);
}

/** Solo para las pruebas: deja el registro en blanco. */
export function reiniciarLimites(): void {
  registro.clear();
}
