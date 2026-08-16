# MEFLAB — Brief de diseño

**Para:** Claude Design / equipo de diseño de producto
**De:** Equipo MEFLAB
**Versión:** 2.0 — el encargo está **entregado**; §8 a §10 recogen qué se recibió y qué queda abierto
**Fecha:** 16/08/2026
**Documento autocontenido:** puede leerse sin ningún otro archivo del proyecto.

> **Estado:** las secciones §1 a §7 son el encargo original y siguen siendo válidas como declaración de intenciones. El resultado está en **`docs/prototipo/`** — 26 pantallas navegables, dos temas y tres densidades. Antes de pedir cualquier diseño nuevo, abre el prototipo: es probable que ya esté.

---

## 1. Qué es MEFLAB

Un ERP + CRM web para **laboratorios dentales**: los talleres que fabrican coronas, puentes, prótesis y carillas por encargo de odontólogos y clínicas.

El laboratorio recibe una orden de un doctor (con una impresión física o un archivo STL), la fabrica pasando por varias etapas técnicas, controla la calidad, la entrega, la factura y la cobra. Hoy todo eso vive en cuadernos, WhatsApp y Excel.

MEFLAB debe ser **la pantalla que el laboratorio deja abierta todo el día**.

---

## 2. A quién le diseñamos

Cinco personas reales, con necesidades opuestas. Diseñar "una interfaz" para todas es el error a evitar.

### Marisol — Recepción · *la que más usa el sistema*
Está en el mostrador. Suena el teléfono: *"Doctor Ramírez, ¿cómo va mi puente?"*. Tiene que responder en menos de 10 segundos con alguien esperando en la línea y otro doctor entregando una impresión en la mano.
**Necesita:** buscador que encuentre por número de orden, doctor o paciente en un solo campo; estado visible sin abrir nada; agenda del día como pantalla de inicio.
**No necesita:** cifras financieras.

### Iván — Jefe de Producción
Abre el tablero a las 8:00. Quiere ver de un vistazo qué está atrasado, qué vence hoy y quién está libre. Reasigna arrastrando.
**Necesita:** densidad alta, semáforo de fechas legible a un metro de distancia, arrastrar y soltar.
**No necesita:** formularios largos.

### Carlos — Técnico Dental · *el usuario de mayor riesgo*
Trabaja con las manos ocupadas, guantes puestos, en una mesa con polvo de cerámica. Consulta desde una tablet compartida en el taller.
**Necesita:** tres cosas — qué me toca, empezar, terminar. Botones grandes. Cero texto pequeño.
**Regla dura:** si registrar una etapa toma más de dos toques, no lo va a hacer, y todo el módulo de producción queda vacío.

### Rosa — Cobranza
Trabaja por lista priorizada. Llama, registra, pasa al siguiente. Hace 30 gestiones en una mañana.
**Necesita:** el guion delante, el histórico de la última conversación visible, y registrar el resultado sin salir de la fila.

### Sr. Vera — Gerente / dueño
Entra una o dos veces por semana, casi siempre desde el celular. Quiere cinco números y ninguna explicación.
**Necesita:** cuánto facturé, cuánto me deben, qué está atrasado, cuánto gané, quién produce más.

---

## 3. Objetivos de diseño

1. **Que el técnico registre sus tiempos.** Es el requisito del que dependen la mitad de los indicadores del producto y el único que puede fallar por diseño.
2. **Diez segundos para responder "¿cómo va mi trabajo?".** Desde cualquier pantalla, sin más de dos clics.
3. **Una sola cifra de deuda.** El sistema tiene un problema histórico de mostrar tres números distintos para lo mismo. El diseño debe reforzar la unicidad: mismo formato, mismo color, misma etiqueta, en todas partes.
4. **Densidad sin agobio.** Es un ERP: hay muchos datos. Pero un ERP feo y apretado es la razón por la que la gente vuelve al Excel.
5. **Que se vea moderno sin ser una app de consumo.** Es una herramienta de trabajo profesional; la seriedad transmite confianza cuando se manejan facturas y deuda.

---

## 4. Dirección visual

### Tono
Clínico, preciso y cálido. Referencias de tono: **Linear** (densidad y jerarquía), **Stripe Dashboard** (tratamiento de datos financieros), **Height** (tableros). Lo que **no** queremos: la estética de ERP corporativo de 2010 (gris, bordes duros, tablas sin aire) ni un dashboard de startup lleno de degradados.

### Modos
**Tema oscuro y claro, ambos de primera clase.** El prototipo actual es oscuro y funciona bien en el taller (menos fatiga con luz baja); recepción y gerencia probablemente prefieran claro. No puede haber un modo que se sienta el "secundario".

### Paleta base propuesta *(a validar y refinar)*

| Rol | Uso |
|---|---|
| Primario | Verde‑teal profesional. Acciones principales, elementos activos. Evoca salud sin caer en el azul genérico de software médico |
| Superficies | Neutros fríos con contraste suave entre fondo, tarjeta y elevación |
| Semánticos | Éxito, advertencia, error e informativo, cada uno con variante de fondo suave para badges |
| **Estados de trabajo** | Cada estado del kanban necesita su color, distinguible entre sí **y también en escala de grises** (hay usuarios con daltonismo y el tablero se imprime) |
| **Semáforo de fechas** | A tiempo / por vencer (≤2 días) / vencido. Debe leerse a distancia y **no depender sólo del color** — combinar con icono o forma |

### Tipografía
- Interfaz: sans‑serif geométrica legible en tamaños pequeños (Inter, Geist o similar).
- **Números tabulares obligatorios** en toda cifra monetaria y en las tablas. Sin esto, las columnas de dinero se ven torcidas y el producto pierde credibilidad instantáneamente.
- Códigos de orden (`OT-2026-000184`) en fuente monoespaciada.

### Densidad
Tres niveles según contexto: **compacto** (tablas y kanban), **normal** (formularios y fichas), **amplio** (pantalla del técnico en tablet, con objetivos táctiles ≥ 44 px).

---

## 5. Pantallas a diseñar, por prioridad

### Prioridad 1 — definen el producto

**P1.1 · Tablero Kanban de producción**
Columnas por estado (6 a 10, configurables). Tarjeta con: número de orden, tipo de trabajo, doctor, paciente, fecha comprometida con semáforo, avance de etapas, técnico asignado, prioridad. Arrastrar entre columnas. Filtros por doctor, técnico, prioridad y rango de fechas. Debe funcionar con 200 tarjetas sin volverse ilegible.
*Reto de diseño:* qué se muestra y qué se esconde en una tarjeta de 250 px.

**P1.2 · Ficha de orden de trabajo**
La pantalla más densa del sistema. Debe contener, sin abrumar: datos del cliente/doctor/paciente, servicios contratados con pieza dental y color, etapas de producción con su técnico y estado, materiales consumidos, archivos adjuntos (fotos y STL), historial de estados, control de calidad, entrega y situación de facturación.
*Reto de diseño:* organizar ~8 bloques de información sin recurrir a un laberinto de pestañas.

**P1.3 · Registro de nueva orden**
Formulario largo que debe sentirse corto. Incluye un **selector de pieza dental (odontograma)**: un diagrama de las 32 piezas con notación FDI donde se marcan las piezas involucradas. Es el componente más específico del dominio y el que más reduce errores.
*Reto de diseño:* progresión que no asuste — lo obligatorio primero, lo opcional después.

**P1.4 · Pantalla del técnico (tablet)**
Lista de "mis tareas" ordenada por prioridad y fecha. Cada tarea: un botón grande *Iniciar* / *Terminar*. Al terminar, opción de adjuntar foto y registrar consumo de material.
*Reto de diseño:* dos toques máximo por acción. Usable con guantes.

### Prioridad 2 — el ciclo del dinero

**P2.1 · Cartera de cobranza** — Lista priorizada por monto y días de mora. Cada fila: cliente, saldo, días vencidos, estado, última gestión, próxima acción, y botones de acción rápida (llamar, WhatsApp, email).

**P2.2 · Modal de gestión de cobranza** — Guion sugerido según el tramo de mora, resultado, notas, próximo seguimiento y fecha de compromiso. Debe abrirse y cerrarse sin perder la posición en la lista.

**P2.3 · Emisión de comprobante** — Selección de una o varias órdenes pendientes de facturar, desglose de IGV visible y claro, previsualización antes de emitir.

**P2.4 · Caja diaria** — Apertura, movimientos, cierre con arqueo (saldo teórico vs conteo físico vs diferencia). La diferencia debe ser imposible de pasar por alto.

### Prioridad 3

**P3.1 · Dashboard** — Configurable por rol. Marisol, Iván y el Sr. Vera **no ven lo mismo**.
**P3.2 · Vista 360° del doctor** — Datos, trabajos, facturación, pagos, deuda, gestiones, retrabajos.
**P3.3 · Inventario** — Tabla con niveles de stock y alertas.
**P3.4 · Reportes** — Plantilla común para ~15 reportes con filtros, gráfico y exportación.

---

## 6. Componentes de dominio a diseñar

Además de los primitivos (botones, campos, tablas, modales), MEFLAB necesita componentes propios que no existen en ninguna librería:

| Componente | Descripción |
|---|---|
| **OdontogramaPicker** | Selector visual de piezas dentales, notación FDI 11‑48, con arcada superior/inferior. Modo lectura y modo edición |
| **SelectorColor** | Muestrario de escalas dentales (VITA Classical A1‑D4, VITA 3D‑Master) con la muestra de color real, no sólo el código |
| **TarjetaKanban** | Densa, arrastrable, con semáforo y avance |
| **SemaforoEntrega** | Indicador de fecha: a tiempo / por vencer / vencido. Con icono además de color |
| **LineaDeTiempoOT** | Historial de estados y etapas en formato vertical |
| **BadgeEstado** | Sistema coherente de badges: estados de trabajo, de documento, de cobro, de tarea |
| **CifraMonetaria** | Un solo componente para todo importe: símbolo, tabulares, signo, color según contexto |
| **AvanceEtapas** | Barra segmentada que muestra en qué etapa va la orden |
| **TarjetaDeuda** | Saldo + días de mora + tramo de aging, coherente en toda la aplicación |
| **VisorArchivos** | Miniaturas de fotos y marcador para STL (previsualización 3D en fase posterior) |

---

## 7. Restricciones técnicas

- **Next.js 15 + React 19 + Tailwind CSS v4 + shadcn/ui sobre Radix.** Los diseños deben ser construibles con esa base; si un componente requiere salirse de ella, indicarlo explícitamente.
- **Responsive obligatorio** en: kanban (desktop y tablet), pantalla del técnico (tablet vertical), cobranza (móvil), dashboard (móvil, para gerencia). El resto puede ser desktop‑first.
- **Accesibilidad WCAG 2.1 AA**: contraste mínimo 4.5:1 en texto, navegación completa por teclado, foco visible, ninguna información transmitida sólo por color.
- Idioma: **español (Perú)**. Moneda `S/`, fechas `dd/mm/aaaa`, primer día de la semana lunes.

---

## 8. Qué se pidió y qué se recibió

| # | Encargo | Estado |
|---|---|---|
| 1 | Sistema de diseño: tokens de color (claro y oscuro), escala tipográfica, espaciado, radios, sombras, estados de interacción | ✅ Pantalla *Sistema de diseño* del prototipo. Escala de 8 pasos, 3 densidades, 3 radios, contrastes verificados AA |
| 2 | Los 4 diseños de prioridad 1, en desktop y tablet | ✅ Y 22 pantallas más |
| 3 | Los 10 componentes de dominio con sus variantes y estados | ✅ 12 componentes (se añadieron `VisorArchivos` y el medidor) |
| 4 | Estados vacíos y de error para las pantallas principales | ✅ 24 estados vacíos redactados uno a uno, más esqueleto de carga |
| 5 | Especificación de entrega con medidas, tokens y comportamiento responsive | ✅ Los tokens **son** el CSS del prototipo; responsive en 640 / 900 / 1180 px |

**Extras no pedidos que conviene conocer:**

- **Paleta de gráficos aparte de la de interfaz.** El verde‑teal de marca (`#0f766e`) tiene croma 0,086: como marca de un gráfico se lee gris. Los gráficos usan un jade más saturado, validado para daltonismo con script.
- **Ventana Hoy / Mes** en el dashboard, con sparkline y variación en cada KPI.
- **Selector de rol, tema y densidad** en la barra superior del prototipo, para poder demostrar los seis recorridos sin recompilar.

---

## 9. Contexto de partida

> **Esta sección describía el prototipo Next.js original de 9 pantallas. Ya no aplica.** Se conserva la lista de defectos porque documenta *por qué* el rediseño era necesario, con su estado actual.

El punto de partida era un prototipo en Next.js con tema oscuro y 9 pantallas. Su dirección visual —tarjetas con bordes suaves, acento verde‑teal, tipografía sans— se conservó; el resto se rehízo.

| Defecto del prototipo original | Estado |
|---|---|
| El kanban usaba 6 estados que no coincidían con el proceso real | ✅ 10 estados de M‑01, cada uno con glifo propio |
| No existía la pantalla del técnico, la más crítica | ✅ Densidad amplia, objetivos ≥ 44 px, dos toques por acción |
| No había odontograma ni selector de color | ✅ FDI 11‑48 interactivo y muestrario VITA Classical |
| No había tema claro | ✅ Claro y oscuro, ambos de primera clase |
| Los importes no usaban números tabulares | ✅ Componente `CifraMonetaria` único |
| No había estados vacíos ni de carga | ✅ 24 vacíos + esqueleto |
| El semáforo de fechas no existía | ✅ Glifo ● ▲ ■ **además** del color |

**Lo que el rediseño encontró y el brief no anticipaba:** el token de texto terciario daba 2,7:1 de contraste (el brief exigía 4,5:1) y se usaba justo para las etiquetas de 9 px; no había ni una regla `@media` pese a que el responsive era obligatorio; y la escala tipográfica tenía ~30 tamaños distintos entre 8,5 y 28 px. Los tres están corregidos.

---

## 10. Preguntas abiertas — resueltas en el prototipo

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿El kanban soporta agrupación alternativa o sólo por estado? | **Cuatro agrupadores**: estado, área, técnico y doctor. El de área queda inactivo hasta que se definan las áreas (D‑06) |
| 2 | ¿La ficha de orden va con pestañas, scroll o dos columnas? | **Dos columnas.** Contenido denso apilado a la izquierda, estado y acciones fijos a la derecha. Sin pestañas: nada queda escondido |
| 3 | ¿La pantalla del técnico es una vista o una PWA aparte? | **Vista dentro de la app** con densidad amplia forzada. La PWA se difiere a Fase 4 (módulo 4.6): un instalable exige offline, y offline con registro de tiempos exige resolución de conflictos |
| 4 | ¿Cuántos estados hay que soportar visualmente en el peor caso? | **10**, con columna de 268 px y scroll horizontal con anclaje. Probado con 12 tarjetas; el diseño aguanta 200 |
| 5 | ¿El dashboard se arma con widgets arrastrables o plantillas por rol? | **Plantillas fijas por rol.** Arrastrable suena mejor de lo que funciona: el Sr. Vera entra dos veces por semana desde el celular y no va a configurar nada. Los seis gráficos están repartidos por rol |

### Lo que sigue abierto

1. **Las áreas productivas.** El diseño ya las soporta (agrupador, código de color, badge). Falta que el laboratorio diga cuántas son — ver `04-fases-y-mvp.md` §8.
2. **Cuatro gráficos descartados** que quedan disponibles si hacen falta: mapa de calor semana × técnico, facturado vs cobrado acumulado, retrabajos por causa y ticket promedio.
3. **Vista de impresión del kanban.** El brief menciona que el tablero se imprime; hay `@media print`, pero no se ha validado en papel.
