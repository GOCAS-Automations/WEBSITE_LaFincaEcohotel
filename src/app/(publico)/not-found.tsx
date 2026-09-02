import { ContenidoNoEncontrado } from "@/components/paginas/no-encontrado";

/**
 * 404 dentro del sitio público: la que aparece cuando una página llama a
 * `notFound()` —por ejemplo, `/alojamientos/cabana-99`—.
 *
 * Solo el contenido: el encabezado, el pie y el botón de WhatsApp los pone el
 * layout del grupo. Repetirlos aquí los duplicaría en pantalla.
 */
export default function NoEncontradoPublico() {
  return <ContenidoNoEncontrado />;
}
