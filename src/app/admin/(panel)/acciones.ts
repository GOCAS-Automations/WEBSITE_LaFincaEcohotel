"use server";

import { redirect } from "next/navigation";

import { RUTA_LOGIN_ADMIN } from "@/lib/supabase/middleware";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Cierra la sesión y devuelve al formulario de entrada. */
export async function salirAction() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect(RUTA_LOGIN_ADMIN);
}
