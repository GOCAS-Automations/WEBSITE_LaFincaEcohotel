/**
 * Documentos legales del sitio.
 *
 * ---------------------------------------------------------------------------
 * SE EDITAN DESDE EL PANEL (decisión de Cesar, 2026-09-16)
 * ---------------------------------------------------------------------------
 * Hasta hoy vivían SOLO en código, con este argumento: son documentos
 * jurídicos, se revisan enteros y se versionan con el repositorio. La decisión
 * se revierte porque el cliente tiene que poder corregir una frase de su
 * política de cancelación sin esperar un despliegue, y porque el sitio entra a
 * revisión legal con Amapola: cada vuelta de esa revisión era, si no, un
 * cambio de código.
 *
 * Lo que queda de la decisión anterior es lo que la hacía valiosa: **el texto
 * de este archivo sigue siendo el valor por defecto**. Si la fila del CMS no
 * existe, o alguien la vacía, el sitio publica esto. El CMS superpone, nunca
 * sustituye a la nada. Las cuatro claves son `legal.privacidad`,
 * `legal.terminos`, `legal.datos` y `legal.cancelacion`
 * (ver `docs/CMS_CLAVES.md`).
 *
 * ⚠ **Los datos de contacto que aparecen dentro del texto legal quedan
 * congelados aquí.** Antes se interpolaban desde `sitio.contacto`, así que el
 * número de WhatsApp del texto legal siempre coincidía con el del pie. Al pasar
 * el texto al CMS eso deja de ser automático: si el hotel cambia de número o de
 * dirección hay que corregirlo también en estos cuatro documentos, desde el
 * panel. Está avisado en la propia pantalla del panel.
 *
 * ⚠ SON BORRADORES. Están redactados para que el sitio pueda publicarse y para
 * que la pasarela de pagos (Wompi exige política de datos, términos y política
 * de cancelación publicadas) encuentre lo que pide. **Deben ser aprobados por
 * el cliente antes del lanzamiento**, y las cifras de la política de
 * cancelación son una propuesta, no una decisión suya. El pendiente está
 * anotado en `docs/MEMORIA.md`.
 *
 * ACTUALIZACIÓN (septiembre de 2026): las reglas de negocio ya NO son una
 * propuesta nuestra. La política de cancelación, las condiciones de pago y los
 * horarios de llegada y salida son los que el hotel confirmó en
 * `docs/DATOS_CLIENTE.md`. Lo que sigue pendiente es la revisión jurídica y la
 * aprobación de Amapola sobre la REDACCIÓN.
 *
 * Los datos fiscales y el correo de contacto llegaron el 2026-09-30 (persona
 * natural: Raquel Lenis García, NIT 66830269-5) y el cliente aprobó los
 * textos; la revisión jurídica posterior sigue pendiente.
 */
import { LEGAL_ACTUALIZADO, SITIO } from "./sitio";

export type ClaveLegal =
  | "privacidad"
  | "terminos"
  | "datos"
  | "cancelacion";

export const CLAVES_LEGALES: readonly ClaveLegal[] = [
  "privacidad",
  "terminos",
  "datos",
  "cancelacion",
] as const;

/* ---------------------------------------------------------------------------
 * La forma que se guarda en el CMS
 * ------------------------------------------------------------------------- */

/**
 * Una sección del documento: un título y sus párrafos.
 *
 * **Las listas de viñetas son párrafos con una convención**: un párrafo cuyas
 * líneas empiezan todas por «- » se pinta como lista de viñetas. Así el panel
 * edita el documento entero con cajas de texto normales —una sección, una
 * caja— sin inventarse un editor de bloques, y el sitio conserva las listas que
 * ya tenían los cuatro documentos. Ver `esLista()` y el componente
 * `src/components/paginas/legal.tsx`.
 */
export type SeccionLegal = {
  titulo: string;
  /** Párrafos separados por una línea en blanco en el panel. */
  parrafos: string[];
};

export type DocumentoLegal = {
  titulo: string;
  /** Frase de entrada que resume de qué trata el documento. */
  entrada: string;
  /** Descripción para los metadatos. */
  descripcion: string;
  /** Fecha `AAAA-MM-DD` de la última revisión. */
  actualizado: string;
  secciones: SeccionLegal[];
};

/** Dónde vive cada documento. La ruta NO se edita: es la dirección del sitio. */
export const RUTA_LEGAL: Record<ClaveLegal, string> = {
  privacidad: "/legal/privacidad",
  terminos: "/legal/terminos",
  datos: "/legal/datos",
  cancelacion: "/legal/cancelacion",
};

/** La clave del CMS de cada documento. */
export const CLAVE_CMS_LEGAL: Record<ClaveLegal, string> = {
  privacidad: "legal.privacidad",
  terminos: "legal.terminos",
  datos: "legal.datos",
  cancelacion: "legal.cancelacion",
};

/**
 * ¿Este párrafo es en realidad una lista de viñetas?
 *
 * Lo es cuando tiene más de una línea y **todas** empiezan por «- ». Una sola
 * línea suelta no cuenta: un párrafo que empieza por un guion es un párrafo.
 */
export function esLista(parrafo: string): boolean {
  const lineas = parrafo.split("\n").map((linea) => linea.trim()).filter(Boolean);
  return lineas.length > 1 && lineas.every((linea) => linea.startsWith("- "));
}

/** Los elementos de un párrafo que es lista, ya sin el guion. */
export function itemsDeLista(parrafo: string): string[] {
  return parrafo
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => linea.replace(/^-\s*/, ""));
}

/* ---------------------------------------------------------------------------
 * El texto por defecto
 * ------------------------------------------------------------------------- */

/** Forma intermedia con la que se REDACTA aquí abajo, más cómoda de leer. */
type BloqueFuente =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; items: string[] };

type DocumentoFuente = Omit<DocumentoLegal, "secciones"> & {
  ruta: string;
  secciones: { titulo: string; bloques: BloqueFuente[] }[];
};

const p = (texto: string): BloqueFuente => ({ tipo: "parrafo", texto });
const lista = (items: string[]): BloqueFuente => ({ tipo: "lista", items });

/**
 * Los cuatro documentos con el texto de partida.
 *
 * Los datos de contacto se toman de `SITIO` —no de la fila `sitio.contacto` del
 * CMS— porque esto es el respaldo: tiene que poder construirse sin base de
 * datos, en el build y en el generador del seed. Y porque, una vez el texto
 * está en el CMS, dejan de estar ligados: ver el aviso de la cabecera.
 */
function documentosFuente(): Record<ClaveLegal, DocumentoFuente> {
  const correo = SITIO.contacto.correo;
  const canal = `WhatsApp ${SITIO.contacto.whatsappVisible} o el correo ${correo}`;
  const domicilio = SITIO.contacto.direccionCompleta;
  const responsable = `${SITIO.nombre} (titular: ${SITIO.responsable.nombre}, persona natural · NIT ${SITIO.responsable.nit} · RNT ${SITIO.rnt})`;

  return {
    /* ------------------------------------------------------------------ */
    privacidad: {
      titulo: "Política de privacidad",
      entrada:
        "Cómo tratamos la información de quienes visitan este sitio y se comunican con nosotros.",
      descripcion:
        "Política de privacidad de La Finca Eco Hotel: qué información recogemos en el sitio web, para qué la usamos y con quién la compartimos.",
      ruta: "/legal/privacidad",
      actualizado: LEGAL_ACTUALIZADO,
      secciones: [
        {
          titulo: "1. Quiénes somos",
          bloques: [
            p(
              `${responsable} es el responsable de la información personal que se recoge a través de este sitio web. Nuestro domicilio es ${domicilio} y nuestro canal de atención es ${canal}.`,
            ),
          ],
        },
        {
          titulo: "2. Qué información recogemos",
          bloques: [
            p(
              "Este sitio no tiene formularios de registro ni de contacto: no pedimos datos para navegarlo. La información personal llega por dos vías:",
            ),
            lista([
              "La que nos escribes voluntariamente por WhatsApp o por nuestras redes sociales cuando consultas disponibilidad o haces una reserva: nombre, número de teléfono y los datos de la estadía.",
              "La que entregas al reservar y pagar, cuando ese servicio esté disponible en el sitio: nombre, documento de identidad, correo electrónico, teléfono y los datos de la transacción.",
            ]),
            p(
              "También recogemos información técnica anónima de navegación (páginas visitadas, tipo de dispositivo, ciudad aproximada) mediante herramientas de analítica, con el único fin de entender qué contenido resulta útil y mejorar el sitio.",
            ),
          ],
        },
        {
          titulo: "3. Para qué la usamos",
          bloques: [
            lista([
              "Responder tus consultas y confirmar tu reserva.",
              "Prestar el servicio de alojamiento y los servicios adicionales que contrates.",
              "Cumplir las obligaciones legales de un prestador de servicios turísticos en Colombia, incluido el registro de huéspedes.",
              "Enviarte información sobre tu reserva (confirmación, instrucciones de llegada, cambios).",
              "Mejorar el sitio y nuestros servicios con información estadística agregada.",
            ]),
            p(
              "No vendemos ni cedemos tu información a terceros con fines publicitarios.",
            ),
          ],
        },
        {
          titulo: "4. Con quién la compartimos",
          bloques: [
            p(
              "Solo con los proveedores que hacen posible el servicio, y únicamente con lo que necesitan para prestarlo:",
            ),
            lista([
              "El proveedor de alojamiento del sitio y de la base de datos, para almacenar la información de forma segura.",
              "La pasarela de pagos, cuando hagas un pago en línea. Los datos de tu tarjeta se procesan directamente en la pasarela: nosotros nunca los recibimos ni los guardamos.",
              "El proveedor de correo transaccional, para enviarte la confirmación de tu reserva.",
              "Las autoridades competentes, cuando una norma nos obligue a entregarla.",
            ]),
          ],
        },
        {
          titulo: "5. Cookies y analítica",
          bloques: [
            p(
              "El sitio usa cookies técnicas necesarias para funcionar y, cuando estén activas, cookies de analítica que nos ayudan a medir el tráfico de forma agregada. Puedes bloquearlas o borrarlas desde la configuración de tu navegador; el sitio seguirá funcionando.",
            ),
            p(
              "El mapa de la página de contacto es un servicio de Google incrustado: al cargarlo, Google puede recoger información según sus propias políticas.",
            ),
          ],
        },
        {
          titulo: "6. Tus derechos",
          bloques: [
            p(
              "Puedes conocer, actualizar, rectificar y suprimir tu información, y revocar la autorización que nos diste para tratarla, en los términos de la Ley 1581 de 2012. El detalle del procedimiento está en nuestra política de tratamiento de datos personales.",
            ),
            p(`Para ejercerlos, escríbenos al correo ${correo}.`),
          ],
        },
        {
          titulo: "7. Cambios en esta política",
          bloques: [
            p(
              "Si modificamos esta política publicaremos la nueva versión en esta misma página, con su fecha de actualización. Te recomendamos revisarla de vez en cuando.",
            ),
          ],
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    terminos: {
      titulo: "Términos y condiciones",
      entrada:
        "Las reglas de uso del sitio y las condiciones de la reserva y la estadía.",
      descripcion:
        "Términos y condiciones de La Finca Eco Hotel: uso del sitio, reservas, tarifas, pagos y normas de la estadía en la reserva natural.",
      ruta: "/legal/terminos",
      actualizado: LEGAL_ACTUALIZADO,
      secciones: [
        {
          titulo: "1. Objeto y aceptación",
          bloques: [
            p(
              `Estos términos regulan el uso del sitio web de ${responsable} y la contratación de los servicios de alojamiento y experiencias que ofrecemos. Al usar el sitio o al hacer una reserva, aceptas estas condiciones.`,
            ),
          ],
        },
        {
          titulo: "2. Información del sitio",
          bloques: [
            p(
              "Procuramos que la información publicada —descripciones, fotografías, servicios y tarifas— sea exacta y esté al día. Las fotografías son de nuestras instalaciones reales y son ilustrativas: la decoración y la dotación pueden variar entre cabañas y con el tiempo.",
            ),
            p(
              "Las tarifas publicadas son referenciales para temporada baja y pueden variar según la temporada, los días festivos y la demanda. La tarifa aplicable es la que se confirme al momento de cerrar la reserva.",
            ),
          ],
        },
        {
          titulo: "3. Reservas",
          bloques: [
            lista([
              "Una solicitud de reserva no es una reserva confirmada. La reserva queda en firme cuando la confirmamos expresamente y se cumple la condición de pago acordada.",
              "Las cabañas están diseñadas para dos personas. Cualquier ocupación distinta debe acordarse antes de la llegada.",
              "Para hacer una reserva debes ser mayor de edad y entregar información veraz.",
              "Al llegar, todos los huéspedes deben presentar un documento de identidad válido, como exige la normativa turística colombiana.",
            ]),
          ],
        },
        {
          titulo: "4. Tarifas y pagos",
          bloques: [
            lista([
              "Todos los precios se expresan en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo que se indique lo contrario.",
              "La tarifa corresponde al plan elegido (Entre Semana, Estándar o Premium) por noche y para dos personas. El plan Día de Calma se cobra por el día y no incluye hospedaje.",
              "Las experiencias y servicios adicionales se cobran aparte de la tarifa de alojamiento.",
              "Para confirmar la reserva se paga un anticipo de mínimo el 50 % del total; al reservar puedes elegir adelantar más, hasta el 100 %. Lo que quede pendiente se paga antes de la llegada, mediante un link de pago que enviamos con anticipación.",
              "En La Finca no hay datáfono ni se maneja efectivo. Nunca solicitamos datos de tarjeta por WhatsApp ni por ningún otro canal de mensajería.",
              "Los pagos en línea se procesan a través de una pasarela autorizada. No almacenamos los datos de tu medio de pago.",
            ]),
          ],
        },
        {
          titulo: "5. Llegada, salida y estadía",
          bloques: [
            p(
              `Desde las ${SITIO.estadia.llegadaZonas} puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las ${SITIO.estadia.checkIn} y la salida es hasta las ${SITIO.estadia.checkOut}. Los cambios de horario dependen de la disponibilidad y deben acordarse previamente.`,
            ),
            p(
              "El restaurante atiende todos los días en el horario publicado en el sitio y es de uso exclusivo para huéspedes. El desayuno está incluido en los tres planes de hospedaje.",
            ),
            p(
              "La Finca es un establecimiento para adultos. No se permite el ingreso ni el alojamiento de menores de edad en ninguna de las cabañas ni en las zonas comunes, sin excepción. La reserva se entiende hecha para huéspedes mayores de dieciocho (18) años, y el incumplimiento de esta condición faculta al hotel para no prestar el servicio, sin derecho a reembolso.",
            ),
          ],
        },
        {
          titulo: "6. Normas de la reserva natural",
          bloques: [
            p(
              "La Finca está dentro de una reserva natural. Estas normas existen para proteger el bosque y a las especies que lo habitan, y su incumplimiento puede dar lugar a la terminación de la estadía sin reembolso:",
            ),
            lista([
              "No se permite el ingreso de vehículos a la propiedad. El parqueadero es externo y vigilado 24 horas.",
              "El recorrido del bosque se hace únicamente por los senderos habilitados. No está permitido internarse en el bosque.",
              "Las mascotas son bienvenidas en todas las áreas, bajo la responsabilidad y el cuidado permanente de sus acompañantes. La primera no tiene costo; a partir de la segunda se cobra el valor publicado por estadía.",
              "No está permitido fumar dentro de las cabañas ni en las zonas cerradas.",
              "No se permite encender fuego fuera de los espacios dispuestos para ello.",
              "Te pedimos cuidar el descanso de los demás huéspedes: somos pocas cabañas y el silencio es parte de lo que se viene a buscar.",
            ]),
          ],
        },
        {
          titulo: "7. Responsabilidad",
          bloques: [
            p(
              "Respondemos por la correcta prestación de los servicios contratados. No respondemos por los objetos de valor que dejes sin custodia, ni por los daños derivados del incumplimiento de las normas de seguridad y de la reserva natural, ni por hechos de fuerza mayor o caso fortuito, como cierres de vía, fenómenos climáticos o cortes prolongados de servicios públicos.",
            ),
            p(
              "El uso de la piscina, el jacuzzi, el turco y los senderos es bajo tu propia responsabilidad.",
            ),
          ],
        },
        {
          titulo: "8. Propiedad intelectual",
          bloques: [
            p(
              `Los textos, fotografías, marcas y demás contenidos de este sitio son propiedad de ${SITIO.nombre} o se usan con autorización. No pueden reproducirse ni usarse con fines comerciales sin nuestro permiso escrito.`,
            ),
          ],
        },
        {
          titulo: "9. Ley aplicable y solución de controversias",
          bloques: [
            p(
              "Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se intentará resolver de buena fe entre las partes y, de no lograrse, se someterá a los jueces competentes del país.",
            ),
          ],
        },
        {
          titulo: "10. Cambios",
          bloques: [
            p(
              "Podemos actualizar estos términos. La versión vigente es siempre la publicada en esta página, con su fecha de actualización. Los cambios no afectan las reservas ya confirmadas.",
            ),
          ],
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    datos: {
      titulo: "Política de tratamiento de datos personales",
      entrada:
        "Política adoptada conforme a la Ley 1581 de 2012 y al Decreto 1074 de 2015.",
      descripcion:
        "Política de tratamiento de datos personales de La Finca Eco Hotel, conforme a la Ley 1581 de 2012: finalidades, derechos del titular y procedimiento de consultas y reclamos.",
      ruta: "/legal/datos",
      actualizado: LEGAL_ACTUALIZADO,
      secciones: [
        {
          titulo: "1. Responsable del tratamiento",
          bloques: [
            p(
              `${responsable}, con domicilio en ${domicilio}, es el responsable del tratamiento de los datos personales que recolecta en desarrollo de su actividad de alojamiento turístico. Canal de atención: ${canal}.`,
            ),
            p(
              `Razón social: ${SITIO.responsable.nombre}, persona natural. NIT ${SITIO.responsable.nit}. Nombre comercial: ${SITIO.nombre}. Registro Nacional de Turismo (RNT): ${SITIO.rnt}.`,
            ),
          ],
        },
        {
          titulo: "2. Marco normativo",
          bloques: [
            p(
              "Esta política se adopta en cumplimiento de la Ley 1581 de 2012, del Decreto 1074 de 2015 (que compiló el Decreto 1377 de 2013) y de las demás normas que los modifiquen o complementen.",
            ),
          ],
        },
        {
          titulo: "3. Datos que tratamos",
          bloques: [
            lista([
              "Datos de identificación: nombre completo, tipo y número de documento.",
              "Datos de contacto: teléfono, correo electrónico y ciudad de residencia.",
              "Datos de la reserva: fechas de estadía, cabaña, plan, número de acompañantes y solicitudes especiales.",
              "Datos de la transacción: valor, medio de pago y estado. Los datos de la tarjeta los procesa directamente la pasarela de pagos y no quedan en nuestros sistemas.",
            ]),
            p(
              "No solicitamos datos sensibles. Si por alguna necesidad de la estadía nos compartes información de salud o alimentación, la trataremos únicamente para atender esa solicitud, con tu autorización expresa y sabiendo que no estás obligado a entregarla.",
            ),
          ],
        },
        {
          titulo: "4. Finalidades del tratamiento",
          bloques: [
            lista([
              "Gestionar la reserva, el pago y la prestación del servicio de alojamiento y de las experiencias contratadas.",
              "Enviar comunicaciones relacionadas con la reserva y la estadía.",
              "Cumplir las obligaciones legales, contables y tributarias, incluido el registro de huéspedes exigido a los prestadores de servicios turísticos.",
              "Atender peticiones, quejas y reclamos.",
              "Evaluar la calidad del servicio.",
              "Enviar información comercial sobre promociones y novedades, únicamente si nos autorizas expresamente para ello.",
            ]),
          ],
        },
        {
          titulo: "5. Autorización del titular",
          bloques: [
            p(
              "La autorización es previa, expresa e informada, y se obtiene ANTES de que nos entregues tus datos. En el sitio web, antes de enviar una solicitud de reserva tienes que marcar una casilla —que nunca viene marcada— en la que autorizas el tratamiento y desde la que puedes abrir esta política.",
            ),
            p(
              "Si la reserva se hace por teléfono o en el hotel, te informamos de las finalidades y te pedimos la autorización de viva voz antes de tomar tus datos. Nunca entendemos el silencio ni el simple uso del sitio como una autorización.",
            ),
            p(
              "Conservamos prueba de la autorización otorgada, en los términos del artículo 2.2.2.25.2.4 del Decreto 1074 de 2015: de cada reserva queda registrada la fecha en que autorizaste, el canal por el que lo hiciste y la versión de esta política que estaba publicada en ese momento.",
            ),
            p(
              "Puedes revocar la autorización en cualquier momento escribiéndonos por los canales de la sección 7, salvo que exista un deber legal o contractual que nos obligue a conservar algún dato (por ejemplo, las facturas).",
            ),
          ],
        },
        {
          titulo: "6. Derechos del titular",
          bloques: [
            p(
              "Como titular de los datos, y de acuerdo con el artículo 8 de la Ley 1581 de 2012, tienes derecho a:",
            ),
            lista([
              "Conocer, actualizar y rectificar tus datos personales.",
              "Solicitar prueba de la autorización que otorgaste.",
              "Ser informado, previa solicitud, sobre el uso que le hemos dado a tus datos.",
              "Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.",
              "Revocar la autorización y solicitar la supresión de tus datos, cuando no exista un deber legal o contractual que obligue a conservarlos.",
              "Acceder de forma gratuita a los datos que hayan sido objeto de tratamiento.",
            ]),
          ],
        },
        {
          titulo: "7. Consultas y reclamos",
          bloques: [
            p(
              `Toda consulta o reclamo puede presentarse al correo ${correo}, que es el canal dispuesto para que los titulares ejerzan sus derechos sobre sus datos personales (Ley 1581 de 2012), o por WhatsApp ${SITIO.contacto.whatsappVisible}, indicando tu nombre, tu documento, la descripción de los hechos y los datos de contacto para responderte.`,
            ),
            lista([
              "Consultas: se atienden en un término máximo de diez (10) días hábiles. Si no fuera posible, te informaremos los motivos y la fecha en que se atenderá, dentro de los cinco (5) días hábiles siguientes al vencimiento del primer plazo.",
              "Reclamos: se atienden en un término máximo de quince (15) días hábiles contados desde el día siguiente a su recepción. Si no fuera posible, te informaremos los motivos y la nueva fecha, que no superará los ocho (8) días hábiles siguientes al vencimiento del primer término.",
              "Si el reclamo llega incompleto, te pediremos que lo completes dentro de los cinco (5) días siguientes; transcurridos dos (2) meses sin respuesta, se entenderá desistido.",
            ]),
          ],
        },
        {
          titulo: "8. Seguridad y conservación",
          bloques: [
            p(
              "Aplicamos medidas técnicas, humanas y administrativas razonables para proteger los datos contra el acceso no autorizado, la pérdida o la alteración. El acceso está restringido al personal que lo necesita para prestar el servicio.",
            ),
            p(
              "Los datos se conservan durante el tiempo necesario para cumplir las finalidades descritas y los plazos de conservación legales y contables aplicables. Estos son los plazos que aplicamos:",
            ),
            lista([
              "Solicitudes de reserva que no llegan a concretarse: se eliminan a los seis (6) meses.",
              "Datos de una reserva cumplida (nombre, contacto y detalle de la estadía): cinco (5) años desde la salida, que es el plazo de prescripción de las obligaciones civiles y comerciales en Colombia.",
              "Documento de identidad del registro de huéspedes: el tiempo que exija la normativa turística y tributaria aplicable, y no más.",
              "Soportes contables y de pago: diez (10) años, por el artículo 28 de la Ley 962 de 2005 y las normas contables.",
              "Prueba de la autorización de tratamiento: mientras conservemos los datos a los que se refiere, y dos (2) años más.",
              "Conversaciones de WhatsApp con solicitudes de reserva: dos (2) años.",
            ]),
            p(
              "Cumplido el plazo, los datos se eliminan o se anonimizan de forma que ya no permitan identificar al titular. Puedes pedir la supresión antes de esos plazos y la atenderemos salvo que exista un deber legal o contractual de conservarlos.",
            ),
          ],
        },
        {
          titulo: "9. Encargados y transferencias",
          bloques: [
            p(
              "Para prestar el servicio usamos proveedores tecnológicos (alojamiento del sitio, base de datos, pasarela de pagos y correo transaccional) que actúan como encargados del tratamiento y que pueden operar servidores fuera de Colombia. En esos casos exigimos que apliquen estándares de protección equivalentes a los de la normativa colombiana.",
            ),
          ],
        },
        {
          titulo: "10. Vigencia",
          bloques: [
            p(
              `Esta política rige desde el ${LEGAL_ACTUALIZADO} y permanecerá vigente mientras desarrollemos nuestra actividad. Las bases de datos se conservarán por el tiempo necesario para cumplir las finalidades autorizadas.`,
            ),
          ],
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    /*
     * POLÍTICA DE CANCELACIÓN — reescrita con las reglas REALES del hotel
     * ------------------------------------------------------------------
     * La versión anterior proponía una escala de plazos (100 % / 50 % / 0 %)
     * que era razonable en el sector pero que NO era la del hotel: nos la
     * habíamos inventado a falta de dato. En septiembre de 2026 el cliente
     * confirmó la suya (§5 de `docs/DATOS_CLIENTE.md`) y es bastante más
     * estricta: sin reembolsos, un solo cambio de fecha y con tres días de
     * antelación.
     *
     * Publicar la propuesta en vez de la real habría sido peor que no publicar
     * nada: un huésped puede reclamar con el texto del sitio en la mano.
     *
     * ⚠ SIGUE SIENDO UN BORRADOR EN LO JURÍDICO: las reglas de negocio son las
     * del hotel, pero la redacción y el encaje con el Estatuto del Consumidor
     * los tiene que aprobar el cliente (Amapola) antes del lanzamiento.
     */
    cancelacion: {
      titulo: "Política de cancelación y reembolsos",
      entrada:
        "Qué pasa si necesitas cambiar tu reserva, y en qué casos no hay devolución.",
      descripcion:
        "Política de cancelación de La Finca Eco Hotel: cambios de fecha, no presentación y derecho de retracto.",
      ruta: "/legal/cancelacion",
      actualizado: LEGAL_ACTUALIZADO,
      secciones: [
        {
          titulo: "1. Antes de reservar",
          bloques: [
            p(
              "Somos un hotel pequeño: cada cancelación deja una cabaña vacía que difícilmente se vuelve a vender con poca antelación. Por eso nuestra política es estricta y te pedimos leerla antes de confirmar.",
            ),
            p(
              "Las condiciones aplicables son las vigentes al momento de confirmar tu reserva y quedan indicadas en el mensaje de confirmación.",
            ),
          ],
        },
        {
          titulo: "2. La reserva no es reembolsable",
          bloques: [
            p(
              "Una vez confirmada la reserva no hay reembolsos, ni totales ni parciales, del anticipo ni de ningún otro pago.",
            ),
            p(
              "Lo que sí ofrecemos es un cambio de fecha, en las condiciones del punto siguiente.",
            ),
          ],
        },
        {
          titulo: "3. Cambio de fecha",
          bloques: [
            lista([
              "Se solicita con mínimo tres (3) días calendario de anticipación a la fecha de llegada.",
              "Se permite un (1) solo cambio por reserva.",
              "Está sujeto a disponibilidad. Si la nueva fecha corresponde a una tarifa más alta, se cobra la diferencia; si es más baja, no se reembolsa la diferencia.",
              "La solicitud debe hacerse por escrito a nuestro canal de atención. La fecha que cuenta es la de recepción del mensaje.",
            ]),
          ],
        },
        {
          titulo: "4. No presentación y salida anticipada",
          bloques: [
            p(
              "Cancelar el mismo día de la llegada, o no presentarse, se considera un incumplimiento de la reserva: no da lugar a devolución ni a reprogramación.",
            ),
            p(
              "Si decides marcharte antes de terminar la estadía, tampoco se reembolsan las noches no utilizadas.",
            ),
          ],
        },
        {
          titulo: "5. Cancelación por parte del hotel",
          bloques: [
            p(
              "Si por una causa que nos sea imputable no pudiéramos prestarte el servicio, te ofreceremos una fecha alternativa o el reembolso íntegro de lo pagado, a tu elección.",
            ),
            p(
              "En casos de fuerza mayor o caso fortuito ajenos a las dos partes —cierre prolongado de la vía, emergencia climática, orden de autoridad— te ofreceremos el cambio de fecha sin costo o un saldo a favor por el valor pagado, válido durante doce (12) meses.",
            ),
          ],
        },
        {
          titulo: "6. Derecho de retracto",
          bloques: [
            p(
              "En las compras hechas a distancia se aplica el derecho de retracto del artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor): puedes retractarte dentro de los cinco (5) días hábiles siguientes a la compra y recibir el reembolso de lo pagado. Este derecho es de orden público y prevalece sobre el punto 2 de esta política.",
            ),
            p(
              "No aplica cuando la prestación del servicio comienza, de común acuerdo, antes de que venza ese plazo: es decir, cuando la fecha de llegada está dentro de esos cinco días hábiles.",
            ),
          ],
        },
        {
          titulo: "7. Cómo se hacen los reembolsos",
          bloques: [
            p(
              "Cuando corresponda un reembolso —por retracto, o por una cancelación nuestra—:",
            ),
            lista([
              "Se hace por el mismo medio de pago con el que se hizo la transacción.",
              "El tiempo de acreditación depende de la entidad financiera y de la pasarela de pagos; normalmente toma entre cinco (5) y quince (15) días hábiles.",
              "Los costos de la transacción que la pasarela no devuelva podrán descontarse del valor a reembolsar.",
            ]),
          ],
        },
        {
          titulo: "8. Cómo solicitarlo",
          bloques: [
            p(
              `Escríbenos por ${canal} indicando el nombre de la reserva, las fechas y el motivo. Te confirmaremos por el mismo canal el trámite y el valor que corresponda.`,
            ),
          ],
        },
      ],
    },
  };
}

/* ---------------------------------------------------------------------------
 * De la forma de redacción a la del CMS
 * ------------------------------------------------------------------------- */

/**
 * Aplana los bloques de una sección a `parrafos[]`.
 *
 * Una lista se convierte en UN párrafo cuyas líneas empiezan por «- »: es la
 * convención que el panel edita en una caja de texto y que el sitio vuelve a
 * pintar como viñetas. Ver `esLista()`.
 */
function aParrafosDeSeccion(bloques: BloqueFuente[]): string[] {
  return bloques.map((bloque) =>
    bloque.tipo === "parrafo"
      ? bloque.texto
      : bloque.items.map((item) => `- ${item}`).join("\n"),
  );
}

/**
 * Los cuatro documentos en la forma exacta que se guarda en el CMS.
 *
 * Es el respaldo de `src/lib/contenido.ts` y la fuente del seed
 * (`npm run seed:contenido`). Una función y no una constante para no ejecutar
 * nada al importar el módulo; el resultado se congela en `RESPALDO_LEGAL`.
 */
export function respaldosLegales(): Record<ClaveLegal, DocumentoLegal> {
  const fuente = documentosFuente();
  const salida = {} as Record<ClaveLegal, DocumentoLegal>;

  for (const clave of CLAVES_LEGALES) {
    const documento = fuente[clave];
    salida[clave] = {
      titulo: documento.titulo,
      entrada: documento.entrada,
      descripcion: documento.descripcion,
      actualizado: documento.actualizado,
      secciones: documento.secciones.map((seccion) => ({
        titulo: seccion.titulo,
        parrafos: aParrafosDeSeccion(seccion.bloques),
      })),
    };
  }

  return salida;
}

/** El respaldo ya calculado, para importarlo sin repetir el trabajo. */
export const RESPALDO_LEGAL: Record<ClaveLegal, DocumentoLegal> =
  respaldosLegales();

/**
 * Deja un documento del CMS en una forma que el componente pueda pintar.
 *
 * `fusionar()` reemplaza los arreglos ENTEROS sin mirar dentro, así que una
 * sección guardada sin título o con `parrafos` que no sean textos llegaría tal
 * cual a la página. Aquí se descarta lo que no encaja y, si no queda nada, se
 * devuelve el respaldo: un documento legal en blanco es peor que uno viejo.
 */
export function normalizarDocumentoLegal(
  clave: ClaveLegal,
  valor: DocumentoLegal,
): DocumentoLegal {
  const secciones = (Array.isArray(valor.secciones) ? valor.secciones : [])
    .flatMap((seccion): SeccionLegal[] => {
      if (!seccion || typeof seccion !== "object") return [];
      const titulo = typeof seccion.titulo === "string" ? seccion.titulo.trim() : "";
      const parrafos = (Array.isArray(seccion.parrafos) ? seccion.parrafos : [])
        .filter((parrafo): parrafo is string => typeof parrafo === "string")
        .map((parrafo) => parrafo.trim())
        .filter(Boolean);
      if (!titulo && parrafos.length === 0) return [];
      return [{ titulo, parrafos }];
    });

  return {
    ...valor,
    secciones:
      secciones.length > 0 ? secciones : RESPALDO_LEGAL[clave].secciones,
  };
}
