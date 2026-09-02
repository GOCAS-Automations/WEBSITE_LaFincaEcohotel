/**
 * Documentos legales del sitio.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VIVEN EN CÓDIGO Y NO EN EL CMS
 * ---------------------------------------------------------------------------
 * Son documentos jurídicos, no contenido de marketing: se revisan enteros y se
 * versionan con el repositorio, con fecha de revisión explícita
 * (`LEGAL_ACTUALIZADO` en `src/lib/sitio.ts`). Editarlos desde un panel, sin
 * historial y sin control de cambios, sería un problema el día que alguien
 * discuta una cancelación.
 *
 * ⚠ SON BORRADORES. Están redactados para que el sitio pueda publicarse y para
 * que la pasarela de pagos (Wompi exige política de datos, términos y política
 * de cancelación publicadas) encuentre lo que pide. **Deben ser aprobados por
 * el cliente antes del lanzamiento**, y las cifras de la política de
 * cancelación son una propuesta, no una decisión suya. El pendiente está
 * anotado en `docs/MEMORIA.md`.
 *
 * Datos que faltan y hay que completar cuando el cliente los entregue:
 * razón social y NIT, correo de notificaciones y decisión sobre anticipo.
 */
import type { ContactoSitio } from "./contenido";
import { LEGAL_ACTUALIZADO, SITIO } from "./sitio";

export type BloqueLegal =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; items: string[] };

export type SeccionLegal = {
  titulo: string;
  bloques: BloqueLegal[];
};

export type DocumentoLegal = {
  titulo: string;
  /** Frase de entrada que resume de qué trata el documento. */
  entrada: string;
  /** Descripción para los metadatos. */
  descripcion: string;
  ruta: string;
  actualizado: string;
  secciones: SeccionLegal[];
};

export type ClaveLegal =
  | "privacidad"
  | "terminos"
  | "datos"
  | "cancelacion";

const p = (texto: string): BloqueLegal => ({ tipo: "parrafo", texto });
const lista = (items: string[]): BloqueLegal => ({ tipo: "lista", items });

/**
 * Los cuatro documentos, ya resueltos con los datos de contacto vigentes.
 *
 * Reciben `contacto` en vez de leerlo por su cuenta para que el número de
 * WhatsApp y la dirección que aparecen en el texto legal sean EXACTAMENTE los
 * mismos que muestra el pie: dos direcciones distintas en el mismo sitio son
 * un problema real si alguien reclama.
 */
export function documentosLegales(
  contacto: ContactoSitio,
): Record<ClaveLegal, DocumentoLegal> {
  const canal = `WhatsApp ${contacto.whatsapp_visible}`;
  const domicilio = contacto.direccion_completa;
  const responsable = `${SITIO.nombre} (RNT ${contacto.rnt})`;

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
            p(`Para ejercerlos, escríbenos por ${canal}.`),
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
              "La tarifa corresponde al plan elegido (Entre Semana, Estándar o Premium) por noche y para dos personas.",
              "Las experiencias y servicios adicionales se cobran aparte de la tarifa de alojamiento.",
              "Los pagos en línea se procesan a través de una pasarela autorizada. No almacenamos los datos de tu medio de pago.",
            ]),
          ],
        },
        {
          titulo: "5. Llegada, salida y estadía",
          bloques: [
            p(
              `El horario de entrada es a partir de las ${SITIO.estadia.checkIn} y el de salida hasta las ${SITIO.estadia.checkOut}. Los cambios de horario dependen de la disponibilidad y deben acordarse previamente.`,
            ),
            p(
              "El restaurante atiende todos los días en el horario publicado en el sitio. El desayuno está incluido en los tres planes.",
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
              "Las mascotas son bienvenidas en todas las áreas, bajo la responsabilidad y el cuidado permanente de sus acompañantes.",
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
              "El uso de la piscina, el jacuzzi, el turco y los senderos es bajo tu propia responsabilidad. Los menores de edad deben estar siempre acompañados por un adulto.",
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
              "Nota: la razón social y el NIT se incorporarán a este documento una vez se confirmen; hasta entonces, el prestador se identifica con su Registro Nacional de Turismo.",
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
              "La autorización se obtiene antes o al momento de recolectar los datos, por el medio a través del cual te comunicas con nosotros: al enviarnos una solicitud de reserva por WhatsApp o al completar una reserva en el sitio, aceptas esta política.",
            ),
            p(
              "Conservamos prueba de la autorización otorgada, en los términos del artículo 2.2.2.25.2.4 del Decreto 1074 de 2015.",
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
              `Toda consulta o reclamo puede presentarse por ${canal}, indicando tu nombre, tu documento, la descripción de los hechos y los datos de contacto para responderte.`,
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
              "Los datos se conservan durante el tiempo necesario para cumplir las finalidades descritas y los plazos de conservación legales y contables aplicables.",
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
    cancelacion: {
      titulo: "Política de cancelación y reembolsos",
      entrada:
        "Qué pasa si necesitas cambiar o cancelar tu reserva, y cómo funcionan los reembolsos.",
      descripcion:
        "Política de cancelación y reembolsos de La Finca Eco Hotel: plazos, cambios de fecha, no presentación y derecho de retracto.",
      ruta: "/legal/cancelacion",
      actualizado: LEGAL_ACTUALIZADO,
      secciones: [
        {
          titulo: "1. Antes de reservar",
          bloques: [
            p(
              "Somos un hotel pequeño: cada cancelación deja una cabaña vacía que difícilmente se vuelve a vender con poca antelación. Por eso los plazos de esta política son claros y se aplican por igual a todos los huéspedes.",
            ),
            p(
              "Las condiciones aplicables son las vigentes al momento de confirmar tu reserva y quedan indicadas en el mensaje de confirmación.",
            ),
          ],
        },
        {
          titulo: "2. Cancelación por parte del huésped",
          bloques: [
            lista([
              "Con más de quince (15) días calendario de antelación a la fecha de llegada: se reembolsa el 100 % de lo pagado.",
              "Entre quince (15) y siete (7) días calendario antes de la llegada: se reembolsa el 50 % de lo pagado, o se conserva el 100 % como saldo a favor para una nueva fecha dentro de los seis (6) meses siguientes.",
              "Con menos de siete (7) días calendario de antelación: no hay reembolso. Podemos ofrecer un cambio de fecha según disponibilidad.",
            ]),
            p(
              "La solicitud de cancelación debe hacerse por escrito a nuestro canal de atención. La fecha que cuenta es la de recepción del mensaje.",
            ),
          ],
        },
        {
          titulo: "3. Cambios de fecha",
          bloques: [
            p(
              "Un cambio de fecha solicitado con más de siete (7) días calendario de antelación no tiene costo y está sujeto a disponibilidad. Si la nueva fecha corresponde a una temporada de tarifa más alta, se cobra la diferencia; si es de tarifa más baja, no se reembolsa la diferencia.",
            ),
          ],
        },
        {
          titulo: "4. No presentación y salida anticipada",
          bloques: [
            p(
              "Si no llegas el día de tu reserva y no nos avisas, se considera una no presentación y no hay lugar a reembolso. Si decides marcharte antes de terminar la estadía, tampoco se reembolsan las noches no utilizadas.",
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
              "En las compras hechas a distancia se aplica el derecho de retracto del artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor): puedes retractarte dentro de los cinco (5) días hábiles siguientes a la compra y recibir el reembolso de lo pagado.",
            ),
            p(
              "Este derecho no aplica cuando la prestación del servicio comienza, de común acuerdo, antes de que venza ese plazo: es decir, cuando la fecha de llegada está dentro de esos cinco días hábiles.",
            ),
          ],
        },
        {
          titulo: "7. Cómo se hacen los reembolsos",
          bloques: [
            lista([
              "El reembolso se hace por el mismo medio de pago con el que se hizo la transacción.",
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
