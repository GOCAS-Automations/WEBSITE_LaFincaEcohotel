/**
 * Refresco de sesión y protección de rutas para el middleware de Next.
 *
 * ---------------------------------------------------------------------------
 * CAPA 1 DE LAS TRES QUE PROTEGEN EL PANEL
 * ---------------------------------------------------------------------------
 * El middleware corre antes de cada petición a `/admin/*` (y SOLO a esas: ver
 * el `matcher` de `src/middleware.ts`, para que el sitio público siga siendo
 * estático y no pague el costo de leer cookies en cada visita). Aquí:
 *
 *   1. Se crea un cliente de Supabase que lee las cookies de la petición y
 *      escribe las renovadas en la respuesta. Así el token se refresca solo y
 *      la sesión no se cae a la hora.
 *   2. Se resuelve el usuario con `getUser()`, que valida el JWT contra el
 *      servidor de Auth. `getSession()` se limita a leer la cookie —que el
 *      navegador puede haber manipulado— y por eso NO sirve para tomar
 *      decisiones de seguridad.
 *   3. Sin sesión → a `/admin/login?next=…`. Con sesión en `/admin/login` → al
 *      panel.
 *
 * Las otras dos capas: `requireAdmin()` en cada página y cada Server Action
 * (`src/lib/admin/auth.ts`) y, la última palabra, las políticas RLS de la base.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  CABECERAS_SIN_CACHE,
  OPCIONES_COOKIE_SESION,
} from "./opciones-cookie";

export const RUTA_LOGIN_ADMIN = "/admin/login";
export const RUTA_INICIO_ADMIN = "/admin";

/**
 * Solo se acepta como destino después de entrar una ruta interna del panel.
 *
 * Evita el "open redirect": un enlace `?next=https://sitio-falso.com` que, tras
 * un inicio de sesión legítimo, dejara al administrador en una página ajena
 * con aspecto de nuestra. Se rechaza además `//host` y `/\host`, que son rutas
 * relativas al protocolo y también salen del sitio.
 */
export function destinoAdminSeguro(valor: string | null | undefined): string {
  if (typeof valor !== "string") return RUTA_INICIO_ADMIN;
  if (!valor.startsWith("/admin") || valor.startsWith("//")) {
    return RUTA_INICIO_ADMIN;
  }
  if (valor.startsWith("/\\")) return RUTA_INICIO_ADMIN;
  if (valor === RUTA_LOGIN_ADMIN || valor.startsWith(`${RUTA_LOGIN_ADMIN}?`)) {
    return RUTA_INICIO_ADMIN;
  }
  return valor;
}

export async function actualizarSesion(peticion: NextRequest) {
  let respuesta = NextResponse.next({ request: peticion });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !claveAnon) {
    // Sin configuración no hay forma de comprobar la sesión: se deja pasar la
    // petición y `requireAdmin()` (capa 2) cortará en el servidor.
    return respuesta;
  }

  const supabase = createServerClient(url, claveAnon, {
    cookieOptions: OPCIONES_COOKIE_SESION,
    cookies: {
      getAll() {
        return peticion.cookies.getAll();
      },
      setAll(cookiesNuevas) {
        for (const { name, value } of cookiesNuevas) {
          peticion.cookies.set(name, value);
        }
        respuesta = NextResponse.next({ request: peticion });
        for (const { name, value, options } of cookiesNuevas) {
          respuesta.cookies.set(name, value, options);
        }
        /* Una respuesta que lleva la sesión de alguien no puede quedarse en
           ninguna caché intermedia: ver `CABECERAS_SIN_CACHE`. */
        for (const [clave, valor] of Object.entries(CABECERAS_SIN_CACHE)) {
          respuesta.headers.set(clave, valor);
        }
      },
    },
  });

  const {
    data: { user: usuario },
  } = await supabase.auth.getUser();

  const { pathname, search } = peticion.nextUrl;
  const esRutaLogin = pathname === RUTA_LOGIN_ADMIN;

  if (!usuario && !esRutaLogin) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = RUTA_LOGIN_ADMIN;
    destino.search = "";
    destino.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }

  if (usuario && esRutaLogin) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = RUTA_INICIO_ADMIN;
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}
