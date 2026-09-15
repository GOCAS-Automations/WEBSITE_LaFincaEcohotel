# Pendientes de la próxima ronda (quedaron sin ejecutar)

> Creado el 2026-09-15. La ronda se lanzó pero el agente se detuvo por límite de sesión
> **antes de modificar nada**: el repositorio quedó limpio y sincronizado. Retomar tal cual.
> **Regla nueva:** verificar siempre contra `localhost`, **nunca** contra el sitio publicado
> (auditar producción con Chrome headless hizo que el firewall de Vercel bloqueara la IP de Cesar).

## Cambios pedidos por Cesar

1. **Quitar la onda del pie** en la unión con la sección anterior, en todas las páginas: transición
   recta y limpia. Los demás cortes orgánicos se conservan.
2. **Espaciado del pie:** las columnas están mal repartidas (la segunda parece más cerca de la
   primera que de la tercera). Reequilibrar rejilla, `gap` y alineación superior. Verificar a
   1440, 1024 y 390 px.
3. **Día de Calma en el motor:** elegir **una sola fecha, sin salida** ⇒ Plan Día de Calma
   preseleccionado y explicado (10:00 a.m.–5:00 p.m., $250.000 para dos, sin hospedaje; nunca
   «pasadía»). No ocupa cabaña ni noche, así que no bloquea el calendario. Lo que falte por
   confirmar queda `TODO` (ver preguntas abajo), sin inventar texto en la interfaz.
4. **Dropdown de cabañas del hero:** sigue viéndose anticuado porque la lista desplegada es la
   nativa del sistema operativo. Sustituir por un **combobox propio accesible** (patrón listbox:
   `button` + lista, teclado ↑↓/Home/End/Esc/Enter, `aria-expanded`, `aria-activedescendant`,
   roles combobox/listbox/option, cierre al clic fuera), con radios, borde y alto iguales a los
   campos de fecha, hover/selección en verde de marca, check en el seleccionado, ítems ≥ 44 px en
   móvil y valor en `input hidden`.
5. **Calendario en escritorio:** debe poder abrirse **hacia arriba** cuando no hay espacio abajo,
   como ya ocurre en móvil (medir con `getBoundingClientRect`, recalcular al abrir y al
   hacer scroll/resize).
6. **Fotos de instalaciones:** en **Salón**, poner la foto que hoy está en **Restaurante**,
   encuadrada para que se vea **más la parte inferior** (no el techo). En **Restaurante**, poner
   **la foto del hero de la portada**. Respetar la regla del sello y borrar del bucket lo que
   deje de usarse (regla 11 de `CLAUDE.md`).
7. **URL del reel de Instagram editable desde el panel** (verificar si ya existe el campo; si no,
   añadirlo al bloque de Instagram, validado con `direccionEmbebido()`), documentar la clave en
   `docs/CMS_CLAVES.md` y probar guardando con sesión, restaurando el valor original.
8. **Conócenos, «Sobre nosotros»:** redondeo asimétrico mayor — esquina **superior izquierda** de
   la imagen de arriba y **inferior derecha** de la de abajo — conservando la alineación con la
   columna de texto y la regla del sello.

Al terminar: `tsc`, `eslint`, `build` y tests; capturas contra localhost a 1440 y 390; commits
pequeños en español; **`git push`**; actualizar `docs/MEMORIA.md` y `docs/CMS_CLAVES.md`.

## Preguntas abiertas que bloquean parte de lo anterior

Ver también §9 de `docs/DATOS_CLIENTE.md`. Para el **Día de Calma** falta saber:
aforo máximo por día · si se puede cualquier día del año o hay excepciones · precio por persona
adicional (la tarifa publicada es para dos) · si aplica el anticipo del 50 % · qué política de
cancelación tiene · si incluye jacuzzi o solo piscina, turco, decks y salón · hora límite de
llegada · si aplican las mismas reglas de mascotas y de solo adultos.
