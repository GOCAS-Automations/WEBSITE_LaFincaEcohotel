import { notFound } from "next/navigation";

/**
 * Cualquier dirección del panel que no exista (`/admin/reserva`, `/admin/xyz`).
 *
 * Sin esta ruta, Next la mandaba a la 404 raíz —la del sitio público— y quien
 * trabaja en el panel salía de él. Así cae en `not-found.tsx` del panel, con
 * el menú a la vista. Las rutas de verdad (`/admin/reservas`, `/admin/login`,
 * `/admin/api/…`) son estáticas y siempre ganan a esta.
 */
export default function RutaInexistenteDelPanel(): never {
  notFound();
}
