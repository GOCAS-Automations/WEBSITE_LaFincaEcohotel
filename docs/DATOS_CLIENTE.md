# Datos confirmados por el cliente — fuente de verdad del contenido

> Consolidado el 2026-09-11 a partir de: `0.Respuestas_Requerimientos_La_Finca.docx`,
> `0.Puntos_Pendientes_La_Finca.docx`, el documento de configuración del bot de ventas
> (Whatsfy, junio 2026) y el manual `IDENTIDAD DE MARCA - LA FINCA` (PDF, copia local en
> `EcoHotel - La Finca/IV LA FINCA.pdf`). Todos compartidos por Juan Camilo Mejía en el Drive
> `PAGINA WEB`.
>
> **Regla:** lo que diga este archivo manda sobre el seed provisional y sobre el sitio viejo.
> Lo que no esté aquí ni en `CONTENIDO_ACTUAL.md` **no se publica**: se marca `TODO` y se pregunta.

## 1. Identidad de marca (manual oficial)

- **Símbolo:** un **colibrí en vuelo** — libertad, energía, armonía con la naturaleza. Tipografía
  geométrica y espaciada. El logo no se altera (proporciones, colores, rotaciones).
- **Paleta oficial (solo tres colores):**
  - Petróleo — PANTONE 3272 C — `RGB 2,117,112` → `#027570`
  - Oliva — PANTONE 7763 C — `RGB 94,96,51` → `#5E6033`
  - Verde claro — `RGB 232,244,217` → `#E8F4D9` (fondo/acento claro)
  - **No hay dorado en la paleta oficial.** El `#9F6301` que usamos salió del sitio viejo; queda
    como acento muy secundario o se retira.
- **Tipografía:** familia **Intro Alt** (Thin, Light, Book, Book Italic, Bold, Bold Italic, Black).
  Licencia pendiente (Santiago). Sustituto vigente: Manrope (titulares) + Inter (cuerpo).
- **Tono y frases oficiales (usables tal cual):**
  - «Vive despacio. Respira profundo. Estás en La Finca.»
  - «La Finca Eco Hotel: un suspiro del bosque convertido en descanso.»
  - «Te invitamos a respirar más despacio, a escuchar lo que el bosque quiere contarte y a dejar
    que la neblina te devuelva la calma.»
  - «Un lugar donde el lujo no brilla: se siente. Donde la belleza no se muestra: se respira.»
  - Misión: crear espacios donde el descanso se vuelva un ritual natural, donde el confort moderno
    se mezcle con la tierra húmeda y la neblina que abraza las montañas.
  - Visión: ser un refugio de bienestar y sostenibilidad, símbolo del **eco-lujo consciente**.
- Sensaciones que transmite la paleta: paz, frescura, renovación, sostenibilidad, naturalidad, equilibrio.

## 2. Las cabañas — son **cinco** (el «seis» del FAQ viejo era un error)

Todas: capacidad máx. 2 personas (pensadas para parejas), cama doble, baño privado, vista a la
montaña/bosque de niebla, estación de café y aromáticas ilimitadas, WiFi, toallas, batas y
cobijas térmicas, mininevera, agua caliente, secador, amenities de baño, botiquín. **Sin TV**
(desconexión a propósito). Jacuzzis climatizados, con burbujas y luces, en zona exterior.

| Cabaña | Rasgo distintivo | Jacuzzi | Cocina | Balcón/terraza | Planes |
|---|---|---|---|---|---|
| 01 | Dos niveles: arriba habitación; abajo sala, cocina, comedor y balcón con hamaca | Privado, exterior, con vista a las montañas | Sí | Sí | Entre Semana, Estándar, Premium |
| 02 | Terraza con hamaca; jacuzzi privado **bajo un árbol** | Privado | **No** | Sí | **Solo Estándar** |
| 03 | Balcón con hamaca y **comedor en el balcón** | Uso privado **por turnos** (se reserva con el anfitrión Nicolás); comparte zona social con la 04 | Sí | Sí | Entre Semana, Estándar, Premium |
| 04 | Balcón con hamaca y comedor en el balcón | Por turnos (con Nicolás); comparte zona social con la 03 | Sí | Sí | Entre Semana, Estándar, Premium |
| 05 | **Única con chimenea**; vista panorámica; sala, comedor y cocina. **No tiene balcón** | Privado, exterior | Sí | No | Entre Semana, Estándar, Premium |

Fotos oficiales: carpeta Drive `ACTUALIZADAS IMG` (una subcarpeta por cabaña + Zonas Comunes);
el archivo «0. PORTADA …» de cada carpeta es una ficha gráfica con lo que incluye.

## 3. Planes y precios (el precio cambia por plan, **no por cabaña**)

Tarifas referenciales de temporada baja; pueden variar en festivos y alta demanda. IVA incluido.

| Plan | Precio | Días | Incluye |
|---|---|---|---|
| **Entre Semana** | **$350.000** (2 pers.) · **$200.000** (1 pers.) | Lunes a jueves | Hospedaje, 45 min de jacuzzi privado, 45 min de turco, bebida de bienvenida, fogata con masmelos, desayuno, WiFi, zonas sociales (piscina, decks, senderos) |
| **Estándar** | **$480.000** (2 pers.) | Viernes a domingo y festivos | Hospedaje con jacuzzi, turco, estación de café y aromáticas ilimitadas, desayuno, WiFi, uso libre de todas las zonas sociales |
| **Premium** | **$680.000** (2 pers.) | Viernes a domingo y festivos | Todo lo del Estándar + alimentación a la carta (cena de llegada, desayuno y almuerzo de salida), 1 botella de vino, 2 sodas naturales, fogata con pinchos de masmelos. Con Premium la cena se sirve en la cabaña si hay experiencia |
| **Día de Calma** | **$250.000** (2 pers.) | 10:00 a.m.–5:00 p.m. | Almuerzo a la carta, refrigerio (chocolate/aguapanela/café con queso), acceso a piscina, turco, decks, senderos y salón. **Sin hospedaje.** No usar la palabra «pasadía» |

Correcciones sobre el seed provisional: Premium era $650.000 → **$680.000**; Estándar $450.000 →
**$480.000**; falta la tarifa de 1 persona en Entre Semana y el plan Día de Calma.

**Regla plan ↔ noches (para el calendario del motor de reservas):**
- Una noche se identifica por la fecha de su check-in. Noche «entre semana» = lunes a jueves.
  Noche «fin de semana o festivo» = viernes, sábado, domingo, cualquier **festivo de Colombia**
  (Ley 51 de 1983 / «Ley Emiliani»: fijos, móviles según Pascua y traslado a lunes) y `TODO` la
  **víspera** de un festivo entre semana (por confirmar con el cliente).
- **El plan es una consecuencia de la noche, no una elección libre** (modelo decidido con Cesar el
  2026-09-14, coherente con «los planes se cobran por noche» del cliente): cada noche se cobra con la
  tarifa que le corresponde a su fecha. Noche entre semana → Plan Entre Semana (único). Noche de fin
  de semana o festivo → el huésped elige **Estándar o Premium** (esa elección aplica a todas las
  noches de fin de semana de la estancia).
- **Estancias mixtas se permiten** y se desglosan por noche: jueves→sábado = 1 noche Entre Semana
  ($350.000) + 2 noches Estándar ($480.000 × 2) o Premium. El motor muestra el desglose noche por
  noche antes de continuar. `TODO` confirmar con Amapola que el hotel cobra así las mixtas (y cómo
  aplica lo incluido, p. ej. jacuzzi 45 min vs. ilimitado, en cada noche).
- Reglas de interfaz: cambiar de fechas recalcula el desglose; cambiar entre Estándar y Premium
  conserva las fechas; una cabaña solo está disponible si tiene tarifa para **todas** las noches de
  la estancia (la 02, solo Estándar, no se ofrece para noches entre semana). Elegir «Entre Semana» o
  «Estándar/Premium» desde la portada es una preferencia que prefiltra el calendario, nunca un bloqueo.
- Día de Calma no ocupa cabaña ni noche (10 a.m.–5 p.m.); su venta en línea se modela en la Fase 3.

**Día de Calma: cupo de 10 personas por día** (dato nuevo del cliente, 2026-09-15). El límite es de
toda la finca y se cuenta sumando el número de personas de **todas** las reservas de día de esa
fecha. Está implementado en tres capas: el trigger `reservas_cupo_dia_de_calma` de la base
(migración 009, que es quien decide), la comprobación previa del panel —que avisa antes y explica
con cuántos cupos se topa— y el motor público, que enseña «Quedan N cupos para ese día» y solo
ofrece elegir hasta ese número de personas. **Si el hotel cambia el cupo hay que tocar dos sitios**:
la constante del trigger y `CUPO_DIA_DE_CALMA` en `src/lib/reserva/dia-de-calma.ts`.

Lo que el Día de Calma **todavía no tiene confirmado** (y por eso no aparece con cifras en el sitio):
el valor por persona adicional a partir de la tercera, si pide anticipo y de cuánto, su política de
cancelación, y si se puede añadir jacuzzi y a qué precio. Mientras tanto el sitio dice «te lo
confirmamos por WhatsApp».

**Experiencias por noche.** Las experiencias (Aniversario con Amor, Cumpleaños con Amor, Fondue) se
preparan para una noche concreta, así que desde 2026-09-15 se eligen **noche por noche**: una estadía
de tres noches puede llevar fondue el viernes y aniversario el sábado. Los adicionales que no
pertenecen a una noche —la segunda mascota— se apuntan «para toda la estadía». En la base, cada línea
de `reserva_extras` lleva su `noche` (o `null`).

**Anticipo: 50 % o 100 %.** El motor deja elegir cuánto se paga al reservar. El 50 % es lo que pide el
hotel para confirmar; el resto se cobra **por link de pago enviado antes de la llegada** (en la finca
no hay datáfono ni se maneja efectivo). Quien prefiera llegar sin nada pendiente puede pagar el 100 %.
Se guarda el porcentaje y el monto congelado (`reservas.porcentaje_anticipo`, `monto_anticipo`).

**Google Calendar («la finca»).** Hoy el equipo anota a mano en un Google Calendar las reservas que
llegan por WhatsApp/Whatsfy. La sincronización con el sitio es una fase futura: **no está
implementada**. El modelo ya la espera —`reservas.origen` admite `google_calendar` y
`reservas.referencia_externa` guarda el id del evento, con índice único para que una sincronización
repetida actualice en vez de duplicar—, así que cuando se haga no habrá que migrar nada.

**Nombre de la página «El lugar»:** se renombra a **«Conócenos»** (`/conocenos`, con redirección desde
`/el-lugar`). Alternativas consideradas: «Nuestro bosque», «El refugio», «Descubre La Finca».

## 4. Experiencias y adicionales (valor por estadía, adicional al plan)

| Nombre | Precio | Detalle |
|---|---|---|
| Aniversario con Amor | $150.000 | Torta para 2, topper, vela, botella de vino, 3 fotos instantáneas y arreglo floral o fondue de frutas |
| Cumpleaños con Amor | $150.000 | Igual, con topper de cumpleaños |
| Fondue | $25.000 | Fondue de frutas y chocolate para dos |
| Segunda mascota | $50.000 | La primera mascota no tiene costo |

**Quitar del sitio:** «Picnic en el bosque» y «Velada romántica» (no existen en el material del hotel).

## 5. Políticas y reglas de la casa

- **Llegada:** desde la **1:00 p.m.** se pueden usar restaurante, senderos, decks y zonas sociales.
  **Entrega de la cabaña (check-in): 3:00 p.m.** · **Check-out: 1:00 p.m.**
- **Reserva y pago:** anticipo del **50 %** para confirmar; el 50 % restante el día de la llegada por
  link de pago enviado con anticipación. En la finca **no hay datáfono ni se maneja efectivo**.
  Nunca se piden datos de tarjeta por WhatsApp.
- **Cancelación:** una vez confirmada, **no hay reembolsos**. **Cambio de fecha** con mínimo **3 días**
  de anticipación, **un solo cambio** por reserva. Cancelar el mismo día o no presentarse =
  incumplimiento, sin devolución ni reprogramación.
- **Mínimo de noches:** no hay (se puede una sola noche). `TODO` confirmar si aplica mínimo en
  fines de semana o festivos.
- **Mascotas:** bienvenidas en todas las áreas, con cuidado responsable. Segunda mascota $50.000.
- **Menores de edad: NO se permiten en la finca, en ninguna cabaña** (indicación directa de Cesar,
  2026-09-14; manda sobre el documento del bot, que hablaba de bebés hasta 10 meses). Experiencia
  exclusiva para adultos. `TODO` confirmar con Amapola la redacción exacta para FAQ y términos.
- **Vehículos:** parqueadero externo vigilado 24 h en la entrada; los vehículos **no ingresan** a la
  reserva natural. Vía sin pavimentar pero apta para cualquier carro.
- **Movilidad reducida:** terreno no plano; no recomendado.

## 6. Horarios y servicios

- Restaurante: **9:00 a.m. – 8:00 p.m.** todos los días, exclusivo para huéspedes (el sitio viejo decía
  8:00–23:00; usar el nuevo). Desayuno desde las 9:00 a.m. Opciones vegetarianas, veganas y sin gluten.
- Jacuzzi: 3:00 p.m. – 12:00 a.m., se solicita con anticipación para alistarlo.
- Fogata con masmelos: 9:00 p.m., incluida en todos los planes de hospedaje.
- Piscina de agua fría con chorrera (hidroterapia con el jacuzzi caliente); turco por turnos.
- Salón multifuncional hasta **30 personas** (retiros, cumpleaños, reuniones). Talleres de yoga o
  meditación desde 10 personas.
- Zonas comunes: salón social, zona de hidroterapia (jacuzzi, turco, piscina), decks de inmersión,
  avistamiento de aves, espacio «4 elementos», senderos y miradores. No se permite senderismo dentro
  del bosque (conservación); sí caminatas por los alrededores.
- Anfitrión en sitio: **Nicolás** (recibe, coordina turnos de jacuzzi/turco y detalles operativos).
  Atención humana: L–V 8:30–12:30 y 2:30–6:30; sábados 9:00–1:00.
- Energía con respaldo de paneles solares; cámaras de seguridad; señal de todos los operadores.
- Reconocimiento **COP16** en alianza con la Cámara de Comercio de Cali.

## 7. Ubicación y contacto

- Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca. 45 minutos al oeste de Cali.
  Bosque de niebla, temperaturas desde 18 °C. Hospital más cercano: Felidia.
- WhatsApp: **+57 316 047 6671**. Instagram `@lafinca_cali`. RNT **114565**.
- Nombre oficial: **La Finca Eco Hotel** (nunca «Finca Villarreal», que aparece en toallas viejas).
- El pin exacto y el video de llegada se envían solo tras confirmar el pago.

## 8. Quién es quién en el cliente

| Persona | Rol |
|---|---|
| **Amapola** | Dueña, clienta directa de GOCAS. Envía identidad de marca, accesos (Hostinger, correo, Google Business, Analytics), cuenta bancaria y documentos de Wompi; aprueba textos y legales |
| **Juan Camilo Mejía** | Arquitecto; creó el Drive y reparte los requerimientos; revisa descripciones y textos con Amapola |
| **Camilo** | Accesos y Drive |
| **Santiago** | Diseñador: logo vectorial, identidad de marca, licencia de Intro |
| **Raquel Lenis** | Razón social y NIT |
| **Nicolás** | Anfitrión en la finca |
| Caroline | Administradora del bot de WhatsApp (mismo número del hotel) |

## 9. Pendientes que siguen abiertos (no inventar)

- [ ] Logo vectorial (Santiago) — mientras tanto, el de `public/marca/` y el del manual.
- [ ] Licencia Intro (Santiago).
- [ ] Clave Hostinger, correo del hotel, Google Business, Analytics (Amapola).
- [ ] Razón social y NIT (Raquel Lenis).
- [ ] Aprobación de textos legales (Amapola) — ahora con la política de cancelación real.
- [ ] Cuenta bancaria y documentos Wompi (Amapola).
- [ ] Video: definir con Juan Camilo; sugieren embeber links de Instagram.
- [ ] ¿Mínimo de noches en fines de semana/festivos?
- [ ] **Día de Calma**: valor por persona adicional (a partir de la tercera), anticipo, política de
      cancelación y si se puede añadir jacuzzi. Hoy el sitio no muestra ninguna cifra de esto.
- [ ] Sincronización con el Google Calendar del hotel: quién lo administra y con qué cuenta.
- [ ] ¿Publican en Airbnb/Booking? (Amapola).
- [ ] Usuarios del panel: el cliente preguntó «¿a qué se refiere con el panel?» — explicar que es el
      administrador del sitio donde cambian textos, fotos, precios y reservas.
