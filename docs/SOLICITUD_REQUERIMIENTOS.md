# Qué necesitamos de La Finca para terminar el sitio

**Para:** Juan Camilo Mejía · **De:** Cesar Castaño — GOCAS Automations · **Fecha:** 8 de septiembre de 2026 · **Puesta al día:** 3 de octubre de 2026

Estamos armando la primera versión del sitio nuevo: es una **beta en construcción**.
Para seguir avanzando nos faltan los datos y accesos de abajo.

> **Lo que necesitamos de Juan Camilo:** decirnos a quién le pedimos cada cosa.
> Amapola (dueña) pidió delegar estos requerimientos entre los contactos que pasó:
> **Camilo** (accesos y Drive) y **Santiago** (marca).
> El **documento de identidad de marca lo envía Amapola directamente** — ese no se delega.

> **Lo más urgente el 8 de septiembre eran 3 puntos:** logo original (1.1), fotos en alta calidad (2.1)
> y precio de cada cabaña (5.1). **El precio ya llegó.** El logo y las fotos siguen pendientes, pero
> ya no frenan nada: el sitio está publicado. Lo que hoy frena el lanzamiento es, del lado del hotel:
> las **llaves de producción de Bold** (6.2), **compartir el calendario «la finca»** (7.6), los
> **nombres y correos del equipo** (3.5) y el **mínimo de noches en fines de semana y festivos** (5.3).
> El orden y el detalle están en `docs/PLAN_CIERRE.md`.

**Prioridad:** 🔴 sin esto no se puede publicar · 🟡 se necesita antes de entregar · 🟢 puede llegar después · ✅ **ya entregado** (con la fecha y el documento donde consta)

> **Documento oficial:** este archivo es la copia de trabajo del equipo. El que se envía al
> cliente es `EcoHotel - La Finca/Requerimientos_LaFinca.pdf` (`DOC-LF-2026-02`), generado
> desde `html/Requerimientos_LaFinca.html` con la identidad de GOCAS. Si cambia uno, actualizar el otro.
>
> **Numeración:** la sección N de este archivo es la sección N+2 del PDF (el PDF antepone «Cómo va
> el proyecto» y «Cómo leer la lista»). La §6 de aquí, «Pagos en línea», es la 08 del PDF, y está
> sincronizada con el PDF corregido el 3 de octubre de 2026.
>
> **Lo ya entregado** (✅) solo está marcado en esta copia: el PDF conserva esos puntos tal como se
> emitieron el 8 de septiembre. Cada ✅ cita de dónde sale el dato; lo que no se pudo confirmar sigue
> como pendiente. Además de los ✅, **no coinciden todavía con el PDF** el punto de Hostinger (§3) y la
> pregunta 6 de la §7 (el PDF pregunta por Airbnb y Booking, ya respondida): si se vuelve a generar
> el PDF, llevarlos también.

---

## 1. Marca

| | Qué necesitamos | Para qué | ¿Quién? |
|---|---|---|---|
| 🔴 | Logo oficial en vectorial (.ai, .svg o .pdf) | Hoy usamos el del sitio actual, a 513 px | |
| ✅ | Documento de identidad de marca | **Ya entregado:** el manual `IDENTIDAD DE MARCA - LA FINCA` está en el Drive `PAGINA WEB` (copia local `IV LA FINCA.pdf`) y es la fuente de la paleta, la tipografía y el tono (`DATOS_CLIENTE.md` §1) | **Amapola** |
| 🟢 | Licencia de la tipografía **Intro** | Es la del sitio actual y es comercial. Mientras tanto usamos una equivalente | |

## 2. Fotos y video

| | Qué necesitamos | Para qué | ¿Quién? |
|---|---|---|---|
| 🔴 | Acceso al Drive con las fotos originales | 10 de las 31 fotos de la galería salieron del sitio viejo a 225×300 px y se ven borrosas | |
| 🟡 | Fotos de cada cabaña, identificadas por número | Hoy las asignamos por lo que se ve en la imagen | |
| 🟢 | Video de la finca | Para el encabezado de la página principal | |

## 3. Accesos

| | Qué necesitamos | Para qué | ¿Quién? |
|---|---|---|---|
| 🟡 | Usuario y clave de **Hostinger** (el dominio y sus DNS) | **Ya no bloquea el lanzamiento:** el hosting viejo se canceló y el dominio apunta al sitio nuevo desde el 1 de octubre de 2026. Pero los DNS se siguen administrando ahí, así que el acceso hace falta para **renovar el dominio (vence el 4 de noviembre de 2026; si vence, el hotel se queda sin web)** y para el correo corporativo | **Amapola** (lo tiene) |
| ✅ | Correo del hotel | **Ya entregado** (30 de septiembre de 2026): el correo de contacto, `fincavillarrealcali@gmail.com`. A él llegan los avisos de reserva y a él contesta el huésped (`DATOS_CLIENTE.md` §7). **Sigue abierto, sin urgencia:** un buzón propio del dominio; hoy las confirmaciones salen de `reservas@lafincaecohotel.com`, que solo envía y no tiene buzón | |
| 🟡 | Acceso a **Google Business Profile** | Enlazar la ficha de Google al sitio nuevo | |
| 🟡 | Acceso a **Google Analytics**, si ya existe | No perder el histórico de visitas | |
| 🟡 | Nombres y correos de quienes usarán el panel | Crear sus cuentas. Hoy solo existen la cuenta del hotel y un usuario de pruebas nuestro | |

## 4. Datos legales

| | Qué necesitamos | Para qué | ¿Quién? |
|---|---|---|---|
| ✅ | Razón social y NIT | **Ya entregados** (30 de septiembre de 2026): Raquel Lenis García, persona natural, **NIT 66830269-5**. Ya van en el pie de página y en los documentos legales (`DATOS_CLIENTE.md` §7) | Raquel Lenis García |
| ✅ | Revisión de los 4 textos legales | **Aprobados por el hotel el 30 de septiembre de 2026** (privacidad, términos, tratamiento de datos y cancelación). Queda aparte, sin bloquear nada, una revisión jurídica por un abogado: se contrastaron con la Ley 1581 de 2012, pero no los vio uno | |

## 5. Tarifas y reglas de la casa

| | Qué necesitamos | Para qué | ¿Quién? |
|---|---|---|---|
| ✅ | Precio de cada cabaña en cada plan | **Ya entregados** (`DATOS_CLIENTE.md` §3): el precio cambia por plan, no por cabaña. Entre Semana $350.000 (2 personas) o $200.000 (1 persona), Estándar $480.000, Premium $680.000 y Día de Calma $250.000. Tarifas de temporada baja, IVA incluido. Los de antes ($350.000 / $450.000 / $650.000) eran provisionales y se corrigieron | |
| ✅ | Hora de entrada y de salida | **Ya entregadas** (`DATOS_CLIENTE.md` §5): entrega de la cabaña (check-in) a las 3:00 p. m., hora límite de llegada a las 7:00 p. m. y salida (check-out) a las 12:00 m.; desde la 1:00 p. m. se pueden usar restaurante, senderos, decks y zonas sociales. Actualizado el 2026-10-05: el check-out pasó de la 1:00 p. m. a las 12:00 m. y se fijó la hora límite de llegada | |
| 🔴 | Mínimo de noches · ¿mascotas? · ¿niños? | **Ya llegó:** no hay mínimo general de noches (se puede una sola) y las mascotas son bienvenidas (la segunda cuesta $50.000). **Falta:** saber si hay **mínimo en fines de semana y festivos** (hoy el motor permite una sola noche siempre) y que Amapola confirme la redacción exacta de la regla de **solo adultos** (hoy el sitio no admite menores) | |
| ✅ | Política de cancelación real | **Ya entregada** (`DATOS_CLIENTE.md` §5): una vez confirmada, no hay reembolsos; un solo cambio de fecha por reserva, con mínimo 3 días de anticipación; cancelar el mismo día o no presentarse no da devolución ni reprogramación. El texto quedó aprobado el 30 de septiembre de 2026. **Falta solo** la política del Día de Calma | |
| ✅ | Lista final de experiencias y adicionales con precio | **Ya entregada** (`DATOS_CLIENTE.md` §4): Aniversario con Amor $150.000, Cumpleaños con Amor $150.000, Fondue $25.000 y segunda mascota $50.000. «Picnic en el bosque» y «Velada romántica» se quitaron del sitio porque no existen en el material del hotel | |

---

## 6. Pagos en línea

> GOCAS nunca toca el dinero de La Finca. La pasarela es **Bold**, del Banco de Bogotá, donde el
> hotel ya tiene cuenta: el huésped paga en el sitio y el dinero llega directo a la cuenta del hotel,
> descontando solo la comisión de la pasarela. **No se le pide ningún documento al hotel** para abrir
> una cuenta de pasarela.

| | Qué necesitamos | Para qué | ¿Quién? |
|---|---|---|---|
| 🔴 | Cuenta que recibe los pagos | Es donde Bold consigna el dinero de las reservas, 1 a 3 días hábiles después de cada pago. La configuran ustedes dentro de Bold: solo necesitamos saber que ya está asociada | |
| 🔴 | Llaves de integración de Bold | En el panel de Bold (Integraciones → «+ Activar llaves»), **habilitar las llaves de integración y enviarnos las dos de producción** (la de identidad y la secreta). Son las que permiten cobrar en el sitio y verificar cada pago. Sin ellas la reserva se cierra por WhatsApp, pero no se cobra en línea | **Amapola** |
| ✅ | Anticipo — **decisión cerrada** | **Decidido por el hotel el 15 de septiembre de 2026** (`DATOS_CLIENTE.md` §3 y §5). El huésped elige con un deslizante cuánto adelanta: del **50 %** —el mínimo que confirma la reserva— al **100 %**. El saldo se cobra **por link de pago antes de la llegada**: en la finca no hay datáfono ni se maneja efectivo | — |

## 7. Seis preguntas rápidas

Dudas que salieron del sitio actual y que no podemos resolver por nuestra cuenta:

1. **¿Son 5 o 6 cabañas?** El FAQ del sitio actual dice 6; el catálogo muestra 5.
   ✅ **Respondida: son cinco** (`DATOS_CLIENTE.md` §2; el «seis» del FAQ viejo era un error).
2. **¿Cuáles tienen jacuzzi privado?** Provisionalmente pusimos la 01 y la 02.
   ✅ **Respondida** (`DATOS_CLIENTE.md` §2): jacuzzi privado en la 01, la 02 y la 05; la 03 y la 04
   lo usan por turnos, que se reservan con el anfitrión.
3. **En varias fotos las toallas dicen "Finca Villarreal".** ¿Es un nombre anterior u otra propiedad? ¿Podemos usar esas fotos?
4. **Las descripciones de las cabañas las escribimos mirando las fotos.** ¿Quién las valida?
5. **¿Quién aprueba los textos del sitio** antes de publicar?
6. **Google Calendar «la finca»:** es el calendario donde el equipo anota hoy a mano lo que llega por WhatsApp, y de ahí saldrá la disponibilidad real del sitio. **Ya no hace falta decirnos quién lo administra ni su identificación (ID):** basta con que el hotel lo **comparta** con la cuenta
   `lafinca-calendario@project-bdfd1411-9189-442d-84d.iam.gserviceaccount.com` con el permiso **«Hacer cambios en eventos»** (con «Ver todos los detalles» no basta: sin escritura, las reservas del panel no se apuntan). El ID aparece solo en cuanto lo compartan. **Todavía no lo han compartido.** (Respondido: La Finca **no publica en Airbnb ni en Booking**.)

---

*Cualquier cosa que no esté aquí y creas que hace falta, dímela.*
