# MEFLAB — Fases, MVP y backlog

**Documento:** FA‑01
**Versión:** 2.1 — reemplaza a la v1.0 del 15/08/2026 (archivada en `_superseded/`)
**Fecha:** 16/08/2026
**Motivo de la revisión:** aplicar los cambios que `05-actores-y-permisos.md` §7.4 dejó marcados como *pendientes*, incorporar el alcance que el prototipo de diseño dejó cerrado, y **desbloquear la Fase 1 con las decisiones del sponsor del 16/08** (§9).

---

## 1. Qué cambia respecto de la v1.0

La v1.0 estimaba **116 puntos y 8 semanas** para el MVP. No contemplaba las áreas productivas, que se descubrieron después al levantar la estructura real del laboratorio.

| # | Cambio | Origen | Impacto |
|---|---|---|---|
| C‑01 | **Áreas productivas** como entidad: configuración, enrutamiento y Kanban filtrado | AC‑01 §3 y §7.4 *(pendiente declarado)* | +8 pts, historia nueva |
| C‑02 | **Un usuario, varios roles** con ámbito por área (relación N:M) | AC‑01 §4 y §7.2 | +3 pts sobre la historia 1 |
| C‑03 | **CRUD completo de doctores** con lista, alta y ficha 360° enlazada | Prototipo · faltaba la lista | +5 pts sobre la historia 3 |
| C‑04 | **Dashboard por rol con gráficos** (6 gráficos, sparklines, ventana día/mes) | Prototipo | +5 pts sobre la historia 16 |
| C‑05 | **Área obligatoria por servicio** — sin ella la orden no se puede enrutar | AC‑01 §3.2.1 | +2 pts sobre la historia 5 |
| C‑06 | **Sistema de diseño v2** como entregable explícito de Fase 0 | Prototipo | Fase 0: 2 → 3 semanas |
| C‑07 | **Las áreas salen de la interfaz del MVP** y quedan como área única por defecto. El esquema las lleva desde la primera migración | Decisión del sponsor, 16/08 | −9 pts |
| C‑08 | **El IGV incluido pasa a ser un atributo administrable de la lista de precios**, en vez de una decisión previa a la carga | Decisión del sponsor, 16/08 | Elimina un riesgo alto |

**Resultado:** MVP de **127 puntos**. Fase 0 pasa de 2 a 3 semanas y Fase 1 de 8 a 9. El MVP entra en producción en la **semana 12**, no en la 10.

**Lo que no cambió:** el criterio de fasificación, el orden de las fases y las definiciones de terminado. La v1.0 acertó en la estructura; le faltaba información del laboratorio.

---

## 2. Lo que el prototipo ya deja resuelto

Antes de estimar nada, conviene saber qué **no** hay que volver a decidir. En `docs/prototipo/` hay un prototipo navegable con 26 pantallas, dos temas y tres densidades.

| Ya decidido | Dónde verlo |
|---|---|
| Sistema de diseño: tokens de color (claro y oscuro, contrastes verificados AA), escala tipográfica de 8 pasos, espaciado, 3 radios, elevación | Pantalla *Sistema de diseño* |
| Los 10 estados de trabajo con glifo propio, legibles en gris y con daltonismo | Pantalla *Sistema de diseño* y *Tablero* |
| Los 12 componentes de dominio con sus estados | Pantalla *Sistema de diseño* |
| Layout de las 26 pantallas, navegación por rol y estados vacío / carga / error | Todo el prototipo |
| Paleta de gráficos validada (separación bajo daltonismo verificada con script) | Dashboard |
| Pantalla del técnico con objetivos táctiles ≥ 44 px | Pantalla *Mis tareas* |

**Consecuencia sobre el equipo:** la v1.0 asumía *"1 diseñador a tiempo parcial"* durante los 9 meses. Con esto cerrado, ese perfil solo hace falta en Fase 0 (traducir el sistema a Tailwind + shadcn) y puntualmente después. **No reduce el calendario, reduce el coste.**

**Consecuencia sobre el riesgo:** el riesgo de reproceso por churn de diseño baja de forma real. El riesgo de estimación no: construir 26 pantallas sigue costando lo que cuesta.

---

## 3. Criterio de fasificación

Sin cambios respecto de la v1.0:

1. **Cada fase termina en algo que el laboratorio puede usar en producción**, no en un conjunto de pantallas.
2. **Los módulos que comparten modelo de datos van juntos.** Separar facturación de cobranza es exactamente lo que produce el hallazgo H‑01.
3. **Lo que no bloquea la operación diaria, se difiere.** Inventario, calidad y compras son importantes, pero un laboratorio opera sin ellos; sin registro de trabajos, no.

---

## 4. Mapa de fases

| Fase | Nombre | Duración | Criterio de cierre |
|---|---|---|---|
| **0** | Fundaciones + sistema de diseño | **3 semanas** | Login funciona, un usuario ve sólo su laboratorio, y existen los primitivos de UI |
| **1** | Núcleo operativo — **MVP** | **9 semanas** | El laboratorio deja de usar su registro manual de trabajos |
| **2** | Ciclo del dinero | 8 semanas | Una sola cifra de deuda en todo el sistema |
| **3** | Control y calidad | 8 semanas | El laboratorio sabe cuánto le cuesta y cuánto gana cada trabajo |
| **4** | Ecosistema | 10 semanas | El doctor consulta su trabajo sin llamar |

**Total: ~38 semanas (9 meses)** con 2 desarrolladores. El MVP entrega valor real en la **semana 12**.

---

## Fase 0 · Fundaciones y sistema de diseño *(3 semanas)*

Sin pantallas de negocio. Es la base sobre la que todo lo demás se apoya.

| # | Entregable |
|---|---|
| 0.1 | Repositorio, **Next.js 16**, Tailwind v4, shadcn/ui, CI en Vercel |
| 0.2 | Base local con Docker y migraciones `0001_core` + `0002_operacion` aplicadas y probadas. *(`0003_finanzas` es Fase 2 y `0004_calidad_inventario` Fase 3: las migraciones siguen las fases.)* Proyectos Supabase dev y prod cuando toque desplegar |
| 0.3 | Auth: login, recuperación de contraseña, custom claims (`tenant_id`, **roles[]**, `area_id`) |
| 0.4 | **`proxy.ts`** de sesión y guardas de ruta por **conjunto** de roles *(en Next 16 el middleware se llama proxy y corre en nodejs)* |
| 0.5 | **Tokens del sistema de diseño en Tailwind v4**: color claro/oscuro, tipografía, espaciado, radios, elevación, 3 densidades |
| 0.6 | **Primitivos de shadcn tematizados** con los tokens: botón, campo, tabla, badge, modal, chip, medidor |
| 0.7 | **Layout**: barra lateral por rol, cabecera, buscador global, conmutador de tema y densidad, responsive |
| 0.8a | **Cabeceras de seguridad**: `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, sin `X-Powered-By`. HSTS activo sólo en producción |
| 0.8b | Dominio propio + TLS · **requiere cuenta Vercel** |
| 0.9a | Seed de catálogos y **tipos TypeScript generados del esquema** (`npm run db:types`) |
| 0.9b | Sentry · **requiere cuenta** |
| 0.10 | **Área única por defecto**: `area('GENERAL')` sembrada, `area_id` con default en las 6 tablas que la llevan, y la UI de áreas oculta tras un flag |

**Definición de terminado:** dos usuarios de laboratorios distintos entran y no ven ni un registro del otro, **verificado en base de datos**; y una pantalla de muestra renderiza correctamente en tema claro, oscuro y las tres densidades.

> **Nada de la Fase 0 exige cuentas en la nube.** Todo se desarrolla y se prueba en local: Supabase corre en Docker (`npm run db:start`) con Postgres, Auth, Storage y Studio, y Next en `npm run dev`.
>
> Sólo **0.8b** (dominio y TLS) y **0.9b** (Sentry) necesitan cuentas, y ninguno de los dos bloquea construir. Lo que se pierde mientras tanto es concreto y acotado:
> - No hay URL de preview para enseñarle el avance al laboratorio.
> - No hay captura de errores de usuarios reales.
> - No se puede probar en un móvil de verdad, sólo en el emulador.
>
> Ninguna de las tres impide escribir la Fase 1. Cuando existan las cuentas es `supabase link` + `db push` y conectar el repositorio a Vercel: las migraciones y el seed ya están probados.

> **Por qué el área entra en el esquema aunque no se use todavía.** Es el mismo razonamiento de D‑05 con multi‑tenant: el área es una **decisión de esquema, no una funcionalidad**. Hoy cuesta una columna con valor por defecto. Después de cargar datos obliga a migrar `servicio`, `detalle_trabajo`, `tarea_produccion`, `proceso`, `flujo_produccion` y `usuario`, y a reasignar a mano cada registro existente.
>
> La migración `0004_areas_y_roles.sql` (AC‑01 §7.1‑7.3) entra aquí, no después — igual que `usuario_rol`, que además hace falta desde el día 1 porque el sponsor ejerce de Gerente y Administrador a la vez (§9.4).

---

## Fase 1 · Núcleo operativo — MVP *(10 semanas)*

Lo mínimo para que el laboratorio abandone el Excel y el cuaderno.

| # | Módulo | Alcance |
|---|---|---|
| 1.1 | **Clientes y doctores** | ABM de cliente (clínica o doctor independiente); **CRUD de doctores con lista, alta, edición y ficha 360°**; contactos y condiciones comerciales |
| 1.2 | **Pacientes** | ABM con paciente simplificado (RN‑002) e historial de trabajos |
| 1.3 | **Catálogo y tarifas** | Servicios, categorías, listas de precio por cliente, historial de precios. **Cada lista declara si sus precios incluyen IGV; el sistema normaliza a valor de venta al guardar** |
| 1.4 | **Orden de trabajo** | Alta completa: cliente, doctor, paciente, servicios, **pieza dental con odontograma**, arcada, material, color, prioridad, fechas, tipo de recepción, indicaciones, **adjuntos** |
| 1.5 | **Kanban y estados** | Tablero por estado configurable, filtros por doctor/técnico/prioridad, semáforo de fechas, cambio de estado con historial. *El agrupador por área ya está construido en el prototipo y se activa cuando se definan las áreas* |
| 1.6 | **Producción** | Flujos por tipo de trabajo, instanciación automática de etapas, asignación a técnicos, vista "Mis tareas", inicio/fin de etapa, carga por técnico |
| 1.7 | **Entregas** | Registro de entrega con receptor, método y evidencia |
| 1.8 | **Dashboard operativo** | **Configurable por rol, con gráficos**: KPIs con tendencia, embudo de producción, carga vs capacidad, entregas próximas, alertas |
| 1.9 | **Usuarios y permisos** | ABM de usuarios, **varios roles por usuario** con ámbito por área, matriz de permisos por módulo |

### Fuera de la Fase 1 (y por qué)

- **Inventario** — el laboratorio ya controla materiales a ojo; puede seguir un trimestre más.
- **Facturación y cobranza** — entran juntas en Fase 2 por el modelo de datos compartido.
- **Calidad y retrabajos** — requieren que primero existan las etapas de producción registrándose de forma fiable.
- **Competencias de técnicos y asignación sugerida** (AC‑01 §8) — se difiere a Fase 3. El algoritmo necesita historial real de tiempos y retrabajos para sugerir bien; con datos inventados sugiere mal y el líder deja de confiar en él en una semana.
- **Interfaz de áreas productivas** — el esquema está listo desde Fase 0 con un área única. La configuración, el enrutamiento y el kanban por área entran cuando el laboratorio defina sus áreas (§9.1).

**Definición de terminado:** durante dos semanas consecutivas, el 100 % de las órdenes nuevas se registran en MEFLAB y el responsable de producción asigna las etapas desde el sistema.

---

## Fase 2 · Ciclo del dinero *(8 semanas)*

| # | Módulo | Alcance |
|---|---|---|
| 2.1 | **Facturación** | Factura y boleta con series y correlativos, IGV por línea, emisión desde una o varias órdenes, notas de crédito y débito, anulación, PDF |
| 2.2 | **Cuentas por cobrar** | CxC generada en la emisión (D‑02), aging por tramos, línea de crédito, advertencia y bloqueo comercial con autorización |
| 2.3 | **Pagos** | Registro con medio y referencia, **aplicación a documentos**, pagos parciales y múltiples, anticipos y saldo a favor, adjunto de voucher |
| 2.4 | **Caja** | Apertura, movimientos por categoría, cierre con arqueo (teórico vs físico vs diferencia), sólo efectivo |
| 2.5 | **Cobranza** | Cartera priorizada, gestión con guion por tramo de mora, resultados, promesas, agenda del día, seguimiento automático de promesas incumplidas |
| 2.6 | **Estado de cuenta** | Documento por cliente con detalle, aging y compromisos; imprimible y enviable |
| 2.7 | **Score y segmentación** | Implementación de la fórmula M‑02, recálculo por job |
| 2.8 | **Dashboard financiero** | Facturado, cobrado, por cobrar, vencido, caja disponible, aging y top deudores |
| 2.9 | **Integraciones** | Facturación electrónica vía PSE, email transaccional (Resend), WhatsApp Business |

**Definición de terminado:** el dashboard, el CRM del cliente, cobranzas y facturación muestran **la misma cifra de deuda**, leída de `v_cartera`. Es la prueba de que H‑01 quedó cerrado.

> Prueba concreta, aprendida construyendo el prototipo: la suma de los tramos del aging debe cuadrar **al céntimo** con el KPI "Por cobrar". Si no cuadra, hay dos cifras de deuda y el hallazgo sigue abierto.

---

## Fase 3 · Control y calidad *(8 semanas)*

| # | Módulo | Alcance |
|---|---|---|
| 3.1 | **Control de calidad** | Checklist configurable por servicio, inspección con resultado, evidencia fotográfica, no conformidades con causa y responsable |
| 3.2 | **Retrabajos y garantías** | Retrabajo ligado a la orden original, tipificación de causa, política de garantía (cubierto / parcial / facturable), costo generado, KPI de retrabajo |
| 3.3 | **Competencias y asignación sugerida** | Matriz competencia × técnico con nivel 1‑3, algoritmo de sugerencia por competencia y carga, alerta de competencia sin respaldo (AC‑01 §8) |
| 3.4 | **Inventario** | Materiales, lotes con vencimiento, ubicación, movimientos, consumo por trabajo, umbral bajo y crítico, inventario físico con ajuste aprobado, trazabilidad |
| 3.5 | **Costos y rentabilidad** | Costo estimado vs real (materiales + mano de obra por etapa + procesos externos), margen y rentabilidad por trabajo, doctor, servicio y periodo |
| 3.6 | **Reportes y KPIs** | Los 9 KPIs del SRS §26, reportes productivos, comerciales, financieros y de inventario, con exportación a Excel/PDF |
| 3.7 | **Notificaciones** | Motor de eventos con canales sistema/email/WhatsApp y preferencias por usuario |
| 3.8 | **Auditoría** | Consulta de la bitácora con filtros por usuario, módulo, entidad y rango de fechas |
| 3.9 | **Configuración** | Pantalla única para todos los catálogos y parámetros del laboratorio |

**Definición de terminado:** Gerencia responde con el sistema las 16 preguntas del §44 del SRS.

---

## Fase 4 · Ecosistema *(10 semanas)*

| # | Módulo | Alcance |
|---|---|---|
| 4.1 | **Portal del doctor** | Consulta de trabajos y estados, descarga de facturas, deuda, envío de archivos, registro de comprobantes de pago, solicitud de nuevo trabajo |
| 4.2 | **Compras y proveedores** | Solicitud de compra, órdenes con estados, recepción que actualiza inventario, sugerencia de reposición |
| 4.3 | **Multiempresa y multisede** | Alta de laboratorios, gestión de sedes, consolidado gerencial |
| 4.4 | **Capacidad productiva** | Planificación por técnico/proceso/día/semana, utilización, simulación de fecha de entrega |
| 4.5 | **Business Intelligence** | Tableros analíticos, flujo de caja proyectado, cohortes de clientes |
| 4.6 | **Aplicación móvil** | PWA para técnicos (mis tareas, tiempos, fotos) y para el gestor de cobranza |
| 4.7 | **Funciones de IA** | Predicción de retraso, fecha probable de entrega, priorización, predicción de morosidad, recomendación de cobranza, detección de anomalías |

---

## 5. Backlog priorizado de la Fase 1 (MVP)

Orden de construcción. Cada ítem es entregable y demostrable por separado.

| # | Historia | Pts | Depende de | Estado |
|---|---|---|---|---|
| 1 | Como Administrador, creo usuarios y les asigno **uno o varios roles** | 8 | Fase 0 | ■ hecha |
| 2 | Como Recepción, registro un cliente (clínica o doctor independiente) con sus condiciones comerciales | 8 | 1 | ■ hecha |
| 3 | Como Recepción, **gestiono los doctores**: lista con filtros, alta, edición y baja | 8 | 2 | ■ hecha |
| 4 | Como Recepción, registro un paciente completo o simplificado | 3 | 3 | ■ hecha |
| 5 | Como Administrador, mantengo el catálogo de servicios, **declarando si los precios de cada lista incluyen IGV** | 7 | 1 | ■ hecha |
| 6 | Como Administrador, defino listas de precio y asigno una a cada cliente | 5 | 5 | ■ hecha |
| 7 | Como Administrador, configuro procesos y flujos por tipo de trabajo | 8 | 5 | ■ hecha |
| 8 | Como Recepción, registro una orden con servicios, pieza (odontograma), color, material y fechas | 13 | 4, 6 | ■ hecha |
| 9 | Como Recepción, adjunto fotos, STL y prescripciones a la orden | 8 | 8 | ■ hecha |
| 10 | Como sistema, genero el número de orden e instancio las etapas del flujo | 5 | 7, 8 | ■ hecha · dentro de `registrar_orden` |
| 11 | Como responsable de producción, veo el kanban con semáforo de fechas y filtros | 8 | 10 | ■ hecha |
| 12 | Como responsable de producción, asigno etapas a los técnicos según su carga | 8 | 11 | ■ hecha |
| 13 | Como Técnico, veo mis tareas y registro inicio y fin | 5 | 12 | ■ hecha |
| 14 | Como responsable de producción, cambio el estado de la orden y queda historial | 5 | 11 | ■ hecha |
| 15 | Como Recepción, registro la entrega con receptor y evidencia | 5 | 14 | ■ hecha |
| 16 | Como cualquier usuario, veo **mi dashboard con gráficos**: KPIs con tendencia, embudo, carga y alertas | 13 | 13, 14 | ■ hecha |
| 17 | Como Recepción, busco cualquier orden, doctor o paciente desde el buscador global | 5 | 8 | ■ hecha |
| 18 | Como Recepción, abro la **vista 360°** de un doctor desde su ficha en la lista | 5 | 3, 8 | ■ hecha |

**Total: 127 puntos.** A 15 puntos/semana con 2 desarrolladores → **≈9 semanas**.

**Avance al 16/08/2026: las 18 historias están construidas**, verificadas en
el navegador y cubiertas por pruebas. 148 pruebas unitarias y 33
comprobaciones SQL que atacan la base directamente.

Decisiones tomadas al construir que conviene tener a mano:

| Decisión | Dónde vive |
|---|---|
| Los adjuntos aceptan **100 MiB** y no los 50 de fábrica: un STL de arcada completa sin comprimir pesa 40–80 MB | `supabase/config.toml` y el bucket en `0003_almacenamiento.sql` |
| Formatos admitidos: fotos (JPG, PNG, HEIC, WEBP), escaneos (STL, PLY, OBJ, DCM, ZIP) y PDF | `lib/validaciones/archivo.ts` y el bucket |
| El aislamiento entre laboratorios en Storage se apoya en la **ruta**, no en una columna: `{tenant_id}/{orden_id}/{uuid}-{nombre}` | `0003_almacenamiento.sql`, prueba 2 |
| El precio de una orden lo resuelve la base, nunca el navegador | `precio_para_cliente()` |
| Lo que se guarda es el precio **tecleado**; el valor de venta se deriva. Es lo que hace que guardar dos veces no vuelva a dividir | `servicio.precio_capturado`, prueba 12a |

**Lo que queda para producción no es código:**

- Cuentas de Vercel y Sentry (0.8b y 0.9b de la Fase 0).
- Proyectos Supabase `meflab-dev` y `meflab-prod` en São Paulo. Subir es
  `supabase link` + `db push`: migraciones y seed están probados.
- Las cuatro decisiones abiertas del §8, dos de ellas con límite en la
  semana 12.

### Backlog en espera — se activa cuando se definan las áreas

No bloquea nada del MVP. El esquema ya lo soporta desde Fase 0; esto es interfaz y configuración.

| # | Historia | Pts |
|---|---|---|
| A‑1 | Como Administrador, configuro las áreas productivas con su código, color y líder, y asigno los técnicos de cada una | 5 |
| A‑2 | Como Administrador, asigno un área a cada servicio del catálogo y el sistema enruta la orden sola | 3 |
| A‑3 | Como Líder de Área, veo el kanban de **mi área** y no veo el trabajo de las demás (RLS por área) | 5 |
| A‑4 | Como Líder de Laboratorio, comparo la carga entre áreas con el selector de área | 3 |

**Total en espera: 16 puntos ≈ 1 semana.**

**Coste de esperar: cero, si se responde antes de cargar datos reales.** Si se responde después de la puesta en producción, hay que reasignar a mano cada servicio, cada orden y cada tarea ya creados — el coste sube a 16 pts más la migración de datos y el riesgo de reasignar mal.

### Cómo leer las dependencias

La cadena crítica es **1 → 2 → 3 → 4 → 8 → 10 → 11 → 12 → 13**: usuarios, cliente, doctor, paciente, orden, etapas, kanban, asignación y registro de tiempos. Todo lo demás cuelga de ahí. Las historias 5, 6 y 7 (catálogo y flujos) pueden ir en paralelo desde la semana 1 con el segundo desarrollador.

---

## 6. Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| **Las áreas se definen tarde, con datos ya cargados.** Es el riesgo que sustituye al de la v2.0 | **Alta** | El esquema ya las lleva (entregable 0.10), así que no hay migración estructural. Pero **hay una fecha límite real: la puesta en producción de la semana 12.** Responder después obliga a reasignar a mano servicios, órdenes y tareas existentes |
| El laboratorio no tiene definidos sus flujos productivos por tipo de trabajo | Alta | Levantarlos en la semana 1 de la Fase 1, con el responsable de producción presente |
| ~~Los precios actuales incluyen IGV y hay que reconvertirlos~~ | — | **Cerrado.** Cada lista de precios declara si incluye IGV y el sistema normaliza al guardar (§9.3) |
| Datos históricos en Excel con calidad heterogénea | Alta | RF‑220: cargador con validación y bitácora de errores; migrar sólo clientes y saldos abiertos, no el histórico completo |
| **Un solo Administrador, que además es el Gerente** | Media | Funciona con dos roles sobre una cuenta, pero rompe la separación de funciones de AC‑01 §2.2 y deja la operación sin respaldo. **Nombrar un segundo Administrador antes de la puesta en producción** |
| Resistencia de los técnicos a registrar tiempos | Media | La pantalla del técnico ya está diseñada a dos toques y ≥44 px. **Medir adopción semanal desde la semana 1 de uso**, no al final |
| Homologación con el PSE se alarga | Media | Iniciar el trámite en la semana 1 de la Fase 2, no al final |
| El dashboard por rol se convierte en un sumidero de tiempo | Media | Los 6 gráficos están cerrados y prototipados. Cualquier gráfico nuevo va a backlog de Fase 3, no al MVP |

---

## 7. Calendario de demos

| Semana | Demo |
|---|---|
| 3 | Login, roles múltiples, aislamiento entre laboratorios, sistema de diseño en claro y oscuro |
| 5 | Usuarios con varios roles, clientes y catálogo con listas de precio |
| 7 | CRUD de doctores con 360°, pacientes, procesos y flujos |
| 9 | Orden de trabajo completa con odontograma y adjuntos; instanciación de etapas |
| 11 | Kanban con semáforo y asignación a técnicos |
| 12 | Técnico registrando tiempos, entregas, dashboard con gráficos |
| **12** | **Puesta en producción del MVP** |
| 16 | Facturación con IGV y series |
| 20 | Pagos, caja con arqueo, CxC con aging |
| **20** | **Puesta en producción del ciclo financiero** |

---

## 8. Decisiones que siguen abiertas

Ninguna bloquea el arranque. Todas tienen fecha límite.

| Decisión | Bloquea | Límite real |
|---|---|---|
| **¿Cuántas áreas productivas hay?** ¿CAD‑CAM es propia o está dentro de Fija? ¿La prótesis total es PPR o aparte? (AC‑01 §3.3) | El backlog en espera A‑1 a A‑4 | **Semana 12** — antes de cargar datos reales |
| **¿Quién hace el control de calidad?** ¿El líder de área o el de laboratorio? | Fase 3, módulo 3.1 | Semana 21 |
| **¿Cuántos técnicos hay por área y qué sabe hacer cada uno?** | Fase 3, módulo 3.3 (competencias) | Semana 21 |
| **¿Quién es el segundo Administrador?** | Nada técnico, pero deja la operación sin respaldo | **Semana 12** — antes de producción |

---

## 9. Decisiones del sponsor · 16/08/2026

### 9.1 · Se trabaja sin áreas productivas por ahora

**Decisión:** el laboratorio aún no tiene claro cuántas áreas hay. Se arranca sin ellas.

**Cómo se implementa:** el esquema lleva `area_id` desde la primera migración, con un área única `GENERAL` sembrada y la interfaz oculta tras un flag. Nada en el MVP pide un área al usuario.

**Por qué así y no quitándolas del todo:** es la misma lógica que D‑05 aplicó a multi‑tenant. El área es una **decisión de esquema**, no una funcionalidad. Ponerla hoy cuesta una columna con valor por defecto; ponerla después de cargar datos obliga a migrar seis tablas y a reasignar cada registro a mano.

**Consecuencia:** −9 puntos del MVP, +16 puntos en el backlog en espera. La Fase 1 baja de 10 a 9 semanas.

### 9.2 · El control de calidad se decide más adelante

No bloquea nada: el módulo de calidad es **Fase 3**. La v2.0 lo listaba como bloqueante del MVP y era un error de clasificación — queda corregido.

### 9.3 · El IGV pasa a ser administrable

**Decisión:** en lugar de averiguar de antemano si los precios actuales incluyen IGV, cada **lista de precios** declara si sus importes lo incluyen.

**Cómo se implementa:** `lista_precio.precios_incluyen_igv boolean not null default false`. Al guardar un precio, el sistema normaliza siempre a **valor de venta sin IGV**, que es lo único que se almacena (D‑03 sigue intacto). El usuario ve el precio como lo tiene en su cabeza; la base guarda lo que necesita la facturación.

**Consecuencia:** elimina un riesgo de probabilidad alta y quita una decisión previa a la carga de datos. +2 puntos sobre la historia 5.

### 9.4 · El Administrador es el sponsor

**Decisión:** por ahora, la cuenta del sponsor ejerce de Gerente General y de Administrador.

**Cómo se implementa:** dos roles sobre una sola cuenta. El modelo N:M de AC‑01 §7.2 lo soporta sin inventar un rol compuesto — es exactamente el caso para el que se diseñó. **MFA obligatorio desde el primer login.**

**Lo que hay que aceptar:** AC‑01 §2.2 argumenta que Administrador y Gerente deberían ser cuentas distintas, por dos motivos que siguen siendo ciertos:

1. **Auditoría.** Con una sola cuenta, la bitácora no distingue si un cambio de precio fue una decisión gerencial o un mantenimiento. Se pierde el "por qué".
2. **Continuidad.** Si el sponsor no está disponible, nadie puede dar de alta un usuario ni corregir un catálogo.

**Mitigación acordada:** funciona para arrancar. **Nombrar un segundo Administrador antes de la puesta en producción de la semana 12** — puede ser la persona de Recepción de confianza, que es el patrón habitual en laboratorios de este tamaño.
