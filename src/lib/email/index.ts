/**
 * Correos transaccionales de La Finca Eco Hotel (Resend).
 *
 *     import { avisarReservaConfirmada } from "@/lib/email";
 *
 * Tres capas:
 *
 *   · `plantillas.ts` — **puro**. Redacta asunto, HTML y texto plano. Se puede
 *     renderizar sin red ni claves: `npm run correos:probar` lo hace.
 *   · `send.ts`       — `server-only`. Habla con Resend. **Dormido** mientras no
 *     exista `RESEND_API_KEY`: registra lo que habría enviado y nunca lanza.
 *   · `avisos.ts`     — `server-only`. Lee la reserva de la base y dispara los
 *     correos de cada momento. **Tampoco lanza nunca.**
 *
 * Los tres correos:
 *
 *   1. **Solicitud recibida** — al huésped, al crearse la solicitud. Código,
 *      resumen, anticipo y qué sigue. NO dice que esté confirmada.
 *   2. **Reserva confirmada** — al huésped, al confirmar en el panel o al
 *      aprobarse el pago. Todo lo anterior más cómo llegar, horarios, qué
 *      llevar y a quién buscar. El Día de Calma tiene su propia variante.
 *   3. **Aviso a la administración** — interno, siempre en español, con el
 *      teléfono del huésped y el enlace directo a la ficha del panel.
 */
export {
  avisarPagoAprobado,
  avisarReservaConfirmada,
  avisarSolicitudCreada,
  datosDeReserva,
  type ResumenAvisos,
} from "./avisos";

export {
  correosConfigurados,
  destinatariosInternos,
  enviarAvisoAdministracion,
  enviarReservaConfirmada,
  enviarSolicitudRecibida,
  responderA,
  type ResultadoCorreo,
} from "./send";

export {
  ANFITRION,
  HORARIO_DIA,
  LLEGADA,
  escaparHtml,
  renderAvisoAdministracion,
  renderReservaConfirmada,
  renderSolicitudRecibida,
  type ContactoCorreo,
  type CorreoRenderizado,
  type DatosCorreo,
  type ExperienciaCorreo,
  type NocheCorreo,
  type PagoCorreo,
} from "./plantillas";
