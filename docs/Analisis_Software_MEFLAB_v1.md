# MEFLAB — Análisis de Software y Consolidación de Requerimientos

**Producto:** MEFLAB ERP + CRM para laboratorios dentales
**Documento:** Análisis de software (AS-01) sobre el SRS v2.0 y el prototipo funcional
**Fecha de análisis:** 15/08/2026
**Fuente analizada:** prototipo desplegado en `v0-dental-erp-n30d3ljmq-frankapazas-projects.vercel.app` (recorrido completo de los 11 ítems de menú, formularios y modales)
**Estado:** para validación del sponsor

---

## 1. Método y alcance del análisis

Se ejecutaron tres actividades:

1. **Ingeniería inversa del prototipo**: recorrido de las 11 rutas del menú, apertura de todos los formularios y modales accesibles, y extracción de la estructura de datos visible (campos, catálogos, estados, cálculos mostrados).
2. **Trazabilidad SRS ↔ prototipo**: contraste de cada macroproceso del SRS v2.0 contra lo realmente implementado, clasificando la cobertura.
3. **Análisis de consistencia**: detección de contradicciones internas del SRS, ambigüedades no resolubles por el desarrollador, y conflictos entre el modelo mental del prototipo y el del SRS.

**Fuera de alcance:** pruebas de rendimiento, seguridad o accesibilidad (el prototipo no tiene backend real ni autenticación); estimación económica.

---

## 2. Qué es realmente el prototipo hoy

El prototipo es una **maqueta de alta fidelidad, sin backend, sin autenticación y con datos fijos** (mock). Todo lo que muestra es coherente visualmente pero no persiste ni recalcula.

### 2.1 Inventario funcional observado

| Ruta | Contenido real observado |
|---|---|
| `/` Dashboard | 6 tarjetas KPI (stock bajo, facturas pendientes, ingresos del mes, pagos pendientes, trabajos activos, doctores activos), gráfico Ingresos vs Gastos (5 meses), distribución de estado de trabajos, "Entregas Urgentes", "Trabajos Recientes", "Top Doctores", "Resumen de Caja - Hoy" |
| `/trabajos` | Kanban con 6 columnas: **Pendiente, En Proceso, Laboratorio, Listo, Entregado, Cancelado**, con contador y monto por columna. Tarjeta: código `CONT-2024-00X`, tipo, descripción, paciente, doctor, fecha de entrega, avance de tareas (n/m), pagado/total, pendiente, técnico (avatar). Filtro por doctor. Toggle tarjetas/lista. Modal de detalle con checklist de tareas valorizadas e "Información de Pago" + acciones *Registrar Pago / Cambiar Estado / Generar Factura* |
| `/doctores` | Fichas de doctor con clínica (texto), segmento (Premium/Frecuente/Nuevo/Moroso), nº trabajos, ticket promedio, **Score de Pago (estrellas)**, deuda pendiente, teléfono, email. Modal con pestañas *Información / Trabajos / Pagos / Estadísticas* y acciones *Llamar / WhatsApp / Nuevo Trabajo* |
| `/pacientes` | Maestro con nombre, DNI, teléfono, email, doctor asignado, nº trabajos, fecha de alta |
| `/cobranzas` | Cartera por doctor: estado (Pendiente / En Gestión / Comprometido), prioridad (Alta/Media/Baja), días vencidos, saldo, fecha de vencimiento, nº de gestiones y última gestión. Modal de gestión con **guion de llamada, resultado, notas, próximo seguimiento y fecha de compromiso de pago**. Top deudores, resumen por estado, acciones del día |
| `/pagos` | KPIs (total recibido, pendiente, hoy, nº transacciones), distribución por método (Transferencia/Efectivo/Yape/Plin), historial de pagos y trabajos con pago pendiente. Modal *Registrar Pago*: **Contrato, Monto, Método, Referencia** |
| `/caja` | Caja chica diaria: ingresos, egresos, balance, estado "Caja Abierta desde 8:00 AM", botón Cerrar Caja, egresos por categoría, movimientos agrupados por día con categoría y método |
| `/inventario` | 15 materiales (código, nombre, marca, categoría, stock actual/máximo, estado Normal/Bajo/Crítico, costo unitario, valor). Pestaña **Movimientos** (fecha, tipo Entrada/Salida, material, cantidad, motivo → `Trabajo CONT-XXXX`). Alerta de stock bajo |
| `/facturas` | Comprobantes con serie‑correlativo (`F001-00001`, `B001-00001`), tipo Factura/Boleta, doctor/cliente, emisión, vencimiento (con marca "Vencida"), total y estado (Pagada/Pendiente/Emitida). Modal *Nueva Factura*: tipo de comprobante, doctor, detalle (desde trabajos o manual), notas |
| `/notificaciones` | **404 — enlace en el menú sin página** |
| `/configuracion` | **404 — enlace en el menú sin página** |

### 2.2 Catálogo de servicios embebido (extraído del formulario de trabajo)

El prototipo ya contiene una lista de precios operativa, no documentada en el SRS:

Corona de Porcelana S/450 · Corona de Zirconio S/550 · Corona Metal‑Porcelana S/380 · Carilla de Porcelana S/350 · Carilla de Resina S/180 · Incrustación Inlay S/280 · Incrustación Onlay S/320 · Prótesis Parcial Acrílica S/450 · Prótesis Parcial Metálica S/850 · Prótesis Total S/650 · Puente Fijo (por pieza) S/420 · Implante sobre Corona S/520 (lista truncada en pantalla).

> Este catálogo debe formalizarse como el maestro de **Servicios/Tarifas** (RF‑090 a RF‑093) y es el punto de partida para el cálculo automático de precio del CU‑005.

---

## 3. Matriz de cobertura SRS v2.0 ↔ prototipo

Leyenda: **I** implementado (visual, con lógica esperable) · **P** parcial · **S** simulado (existe la UI pero no la regla) · **A** ausente

| # | Macroproceso SRS | Cobertura | Observación |
|---|---|---|---|
| 1 | Administración y seguridad (RF‑001..004) | **A** | No hay login. La app abre directo con usuario fijo "Juan Martínez / Administrador". Sin roles, sin permisos, sin la matriz del §5 |
| 2 | CRM doctores y clínicas (RF‑020..025) | **P** | Doctor sí; **Clínica no existe como entidad** (es un texto del doctor). Segmento y score se muestran pero sin fórmula. Sin condiciones comerciales (RF‑023). Vista 360° parcial (4 pestañas) |
| 3 | Pacientes (RF‑030..032) | **P** | Maestro correcto, pero en el alta de trabajo el paciente es **texto libre**, no una referencia |
| 4 | Órdenes y trabajos (RF‑040..047) | **P** | Existe el trabajo con código, estados y kanban. **Faltan**: clínica, prioridad, fecha de ingreso/solicitada, pieza dental, arcada, material, color, tipo de recepción, adjuntos, historial de estados |
| 5 | Producción (RF‑050..057) | **S** | Hay un checklist de "tareas" y un técnico por tarjeta, pero **no es un flujo productivo**: sin etapas configurables, sin asignación por tarea, sin fechas, sin tiempos, sin cronómetro, sin capacidad |
| 6 | Control de calidad (RF‑060..063) | **A** | No existe |
| 7 | Entregas y logística (RF‑080..083) | **A** | Sólo el estado "Entregado". Sin registro de entrega, receptor ni evidencia |
| 8 | Retrabajos y garantías (RF‑070..073) | **A** | No existe |
| 9 | Catálogo y tarifas (RF‑090..093) | **P** | Catálogo con precios embebido en el formulario; sin ABM, sin listas por cliente, sin vigencia ni historial |
| 10 | Inventarios (RF‑110..116) | **P** | Materiales + movimientos + alerta de stock. **Faltan**: lotes, vencimientos, ubicación, inventario físico, reservas, valorización contra el trabajo |
| 11 | Compras y proveedores (RF‑120..123) | **A** | No existe |
| 12 | Facturación (RF‑130..134) | **P** | Factura y boleta con series. **Sin IGV, sin notas de crédito/débito, sin integración SUNAT** |
| 13 | Pagos (RF‑140..143) | **P** | Registro con método y referencia, pero **aplicado al trabajo, no a la factura**. Sin adjunto de voucher |
| 14 | Caja (RF‑150..152) | **P** | Apertura/cierre y movimientos. **Sin arqueo** (saldo teórico vs físico vs diferencia) |
| 15 | Cuentas por cobrar (RF‑160..163) | **S** | La deuda se deriva del saldo del trabajo, no de la factura. Sin aging por tramos, sin línea de crédito, sin bloqueo comercial |
| 16 | Cobranza (RF‑170..176) | **P** | El módulo mejor logrado: cartera, prioridad, gestión con guion, resultado, seguimiento y compromiso. Falta canal como dato, historial navegable, agenda y plantillas con variables |
| 17 | Reportes y BI (RF‑190..193) | **A** | No hay módulo de reportes |
| 18 | Notificaciones (RF‑180..181) | **A** | Enlace roto (404) |
| 19 | Gestión documental (RF‑200) | **A** | No hay adjuntos en ninguna pantalla |
| 20 | Auditoría (RF‑210..211) | **A** | No existe |
| 21 | Configuración (§29) | **A** | Enlace roto (404) |
| 22 | Integraciones (§36) | **A** | "Llamar" y "WhatsApp" abren un formulario de registro manual, no integran nada |

**Cobertura global estimada del MVP declarado en §40:** ≈ 35 % de la superficie funcional y ≈ 10 % de la lógica de negocio.

---

## 4. Hallazgos críticos

Ordenados por impacto sobre el diseño. Los cinco primeros **bloquean el desarrollo** hasta que se decidan.

### H‑01 · Tres cifras distintas de deuda para el mismo negocio *(crítico)*

| Pantalla | Deuda reportada | Cómo se compone |
|---|---|---|
| `/doctores` | **S/ 7 150** | Suma de "deuda pendiente" por ficha de doctor (1200 + 4500 + 800 + 650) |
| `/cobranzas` | **S/ 4 230** | Suma de saldos pendientes **de trabajos** (1630 + 640 + 420 + 400 + 1140) |
| `/facturas` | **S/ 4 970** | Suma de facturas no cobradas (2630 + 2340) |

Hay tres fuentes de verdad para "cuánto me deben". La causa raíz es que el prototipo permite que la deuda nazca del **trabajo** y también de la **factura**, sin conciliación entre ambos.

**Decisión requerida:** la cuenta por cobrar nace **exclusivamente del documento de venta** (RF‑160). El saldo del trabajo es un dato operativo (anticipos recibidos), no una CxC. Todo indicador de deuda debe leer de la misma tabla.

### H‑02 · "Tarea" tiene dos significados incompatibles *(crítico)*

En el prototipo, una tarea es una **línea de venta valorizada** (Prótesis Parcial Metálica 1 × S/850, Modelo de Trabajo 2 × S/120 → Total S/1240) que se marca con un checkbox.
En el SRS (RF‑052), una tarea es una **etapa de producción** con técnico, fechas programada/inicio/fin, tiempo estimado y real, y costo.

Son dos entidades distintas usando la misma palabra. Mezclarlas hace imposible calcular costo real (RF‑101), productividad (KPI‑08) y utilización (KPI‑09).

**Decisión requerida:** separar en `DetalleTrabajo` (qué se vende y a cuánto) y `TareaProduccion` (qué se hace, quién y cuándo). El avance de la tarjeta kanban se calcula sobre `TareaProduccion`, no sobre las líneas de venta.

### H‑03 · La clínica no existe como entidad *(crítico)*

El SRS exige clínica con RUC, contactos, condición de pago y línea de crédito, y una relación 1→N con doctores (RF‑021, RF‑023). El prototipo la trata como un string dentro del doctor.

Esto deja sin resolver la pregunta central del negocio: **¿a quién se factura, a quién se le fija la línea de crédito y a quién se le cobra?** De la respuesta dependen facturación, CxC, cobranza y el score.

**Decisión requerida:** definir el *sujeto comercial* (quien contrata, factura y paga) y permitir que el doctor sea un contacto/solicitante dentro de él.

### H‑04 · No hay IGV ni definición tributaria *(crítico)*

Ninguna factura del prototipo muestra desglose de impuestos: la factura de S/650 es exactamente el precio del catálogo. El SRS pide calcular valor de venta, IGV y total (RF‑132) pero **no define si los precios del catálogo son con o sin IGV**, ni si el laboratorio emite boleta a doctores independientes y factura a clínicas.

**Decisión requerida:** política de precios (afectos/inafectos, precios con o sin IGV), y si la emisión electrónica SUNAT entra al MVP o a la fase 2. Reprocesar comprobantes ya emitidos es caro; conviene decidirlo antes de la primera línea de código de facturación.

### H‑05 · El pago se aplica al trabajo, no al documento *(crítico)*

`Registrar Pago` pide **Contrato**, no factura (contradice RF‑142 y RF‑160). Además, el módulo Caja registra ingresos "Pago Dr. X - Corona" que **no cuadran con el historial de Pagos** (Caja 15/01: +S/650 de Dr. Mendoza; Pagos: 05/01 S/400 transferencia + 12/01 S/250 efectivo para el mismo trabajo).

**Decisión requerida:** modelo canónico `Factura → CuentaPorCobrar → Pago`, con **anticipos** como saldo a favor aplicable a facturas posteriores. Regla de caja: sólo los pagos en efectivo generan movimiento de caja; los electrónicos van a bancos. Hoy el prototipo los mezcla.

### H‑06 · Estados: el kanban no refleja el ciclo del SRS

Kanban actual (6): Pendiente · En Proceso · Laboratorio · Listo · Entregado · Cancelado.
SRS RF‑045 (10): Registrado · Pendiente · En planificación · En producción · Control de calidad · Listo para entrega · Entregado · Observado · Retrabajo · Cancelado.

"Laboratorio" no existe en el SRS y su significado es ambiguo (todo ocurre en el laboratorio). Faltan los estados que sostienen calidad y retrabajo, que son justamente los diferenciales del §42.

### H‑07 · Segmento y "Score de Pago" sin fórmula

La UI muestra Premium/Frecuente/Nuevo/Moroso y 5/5 estrellas "Excelente pagador". RF‑022 y RF‑025 enumeran variables pero no dan pesos, umbrales ni periodicidad de recálculo. **Un requerimiento no verificable no es programable.** Ver §6, RF‑025A.

### H‑08 · Días de crédito fijos

Todas las facturas vencen a **emisión + 15 días**, uniforme, mientras RF‑023 exige días de crédito por cliente. Además `/cobranzas` muestra "923 días vencido" con "Vence: 04/02/2024" — el cálculo de días vencidos no está anclado a una regla explícita.

**Regla a fijar:** `dias_vencidos = max(0, hoy − fecha_vencimiento)`; una cuenta sólo es "vencida" si `fecha_vencimiento < hoy`; `fecha_vencimiento = fecha_emision + dias_credito_del_cliente`.

### H‑09 · Estados de la CxC no documentados

El prototipo usa Pendiente / En Gestión / Comprometido para la cuenta; el SRS sólo define *resultados de gestión* (RF‑172). Falta la máquina de estados de la cuenta por cobrar y la regla que la mueve (p. ej., registrar una promesa la pasa a "Comprometido"; incumplir la promesa la devuelve a "En Gestión").

### H‑10 · Doble umbral de stock

El inventario muestra tres estados (Normal / Bajo / **Crítico**) pero el SRS sólo define stock mínimo (RF‑115). Falta el umbral crítico y su regla. Propuesta: `Crítico ≤ 50 % del stock mínimo`, ambos parametrizables por material.

### H‑11 · Defectos menores del prototipo (corregir en el rediseño)

- `/notificaciones` y `/configuracion` están en el menú y devuelven **404**.
- En Movimientos de inventario, las **salidas se muestran con signo "+"** (`Salida · +2 unidad`).
- "Entregas Urgentes" lista trabajos con fecha ya pasada (18/01) sin marcarlos como atrasados → falta el semáforo de RF‑055.
- El estado "Vencida" aparece como texto en la columna de fecha mientras la columna Estado dice "Pendiente"/"Emitida": dos estados solapados en la misma fila. Conviene separar **estado documental** (Borrador/Emitida/Anulada) de **estado de cobro** (Pendiente/Parcial/Pagada/Vencida).
- El "Tipo de Trabajo" en el alta es texto libre; debe ser catálogo, porque de él dependen el flujo productivo (RF‑050) y el checklist de calidad (RF‑061).

---

## 5. Hallazgos sobre el SRS v2.0

El SRS es completo en amplitud pero tiene puntos que impiden construir sin volver a preguntar:

| Ref. | Problema | Efecto |
|---|---|---|
| RF‑040 | El código de orden se define como `OT-2026-000184`, el prototipo usa `CONT-2024-005` | Nomenclatura contradictoria; además "CONT" (contrato) sugiere una semántica comercial distinta a "OT" (orden de trabajo) |
| RF‑025 / RF‑022 | Score y segmentación sin fórmula ni umbrales | No verificable, no estimable |
| RF‑132 | Cálculo tributario sin base imponible definida | Ver H‑04 |
| RF‑163 | "Advertir o bloquear" — no se define cuál aplica ni el umbral | Ambigüedad de comportamiento |
| RF‑072 | Garantía: "cubierto / parcialmente facturable / facturable" sin criterio de decisión | Falta la política de garantía (plazo, causales, quién autoriza) |
| RF‑056 | Cronómetro "opcional" | Si es opcional, KPI‑02 y KPI‑09 no son calculables de forma fiable. Debe ser obligatorio al menos por etapa |
| §40 MVP | El MVP incluye 16 módulos (de usuarios a cobranza) | Irrealizable como primera entrega; ver §8 |
| RNF‑007/008 | 3 s / 99,5 % sin definir método de medición ni percentil | No auditable; proponer p95 y ventana mensual excluyendo mantenimiento |
| §35 SaaS | Multiempresa "a contemplar desde el diseño" pero está en Fase 3 | Contradicción: el aislamiento por tenant es una decisión de esquema, no una funcionalidad posterior |

---

## 6. Requerimientos nuevos derivados del análisis

Estos requerimientos existen en el prototipo o son necesarios para cerrar las brechas, y **no están en el SRS v2.0**:

| ID | Requerimiento | Origen |
|---|---|---|
| **RF‑025A** | El sistema calculará el score de pago con fórmula parametrizable: `score = w1·puntualidad + w2·(1−morosidad) + w3·frecuencia + w4·recencia − w5·retrabajos`, normalizado a 1–5, recalculado al cierre de cada mes y ante cada pago o vencimiento. Los pesos y umbrales de segmento serán configurables | H‑07 |
| **RF‑095** | Series y correlativos por tipo de documento y sede (`F001`, `B001`, …), con control de saltos y bloqueo de reutilización | Prototipo `/facturas` |
| **RF‑144** | Registro de **anticipos** al crear el trabajo (campo "Anticipo" ya existente) y su aplicación posterior a facturas; saldo a favor del cliente | Prototipo, formulario Nuevo Trabajo |
| **RF‑145** | Conciliación trabajo ↔ factura: facturación parcial de trabajos, listado de trabajos entregados sin facturar, y bloqueo de doble facturación del mismo trabajo | H‑01 |
| **RF‑177** | Estado de cuenta del cliente: documento con detalle de documentos, saldos, aging y compromisos, imprimible y enviable por email/WhatsApp | Prototipo, "Estados de cuenta por email" |
| **RF‑178** | Guiones de gestión por canal y por tramo de mora, editables, mostrados al gestor al abrir la gestión | Prototipo, modal Llamada |
| **RF‑117** | Umbral de stock crítico independiente del stock mínimo, por material | H‑10 |
| **RF‑153** | Arqueo de caja al cierre: saldo teórico, saldo físico contado, diferencia y justificación obligatoria si difiere | H‑11 / RF‑152 |
| **RF‑220** | Carga inicial y migración de datos (doctores, catálogo, materiales, saldos de apertura) desde archivos, con validación y bitácora de errores | Puesta en marcha |
| **RF‑221** | Exportación a Excel/PDF e impresión de todas las grillas y del cierre de caja | Prototipo `/caja` |
| **RNF‑014** | Localización: zona horaria `America/Lima`, formato `dd/mm/aaaa`, moneda S/ con 2 decimales, política de redondeo definida | Transversal |
| **RNF‑015** | Aislamiento de datos por empresa (`tenant_id`) en el esquema desde el día 1, aunque la gestión multiempresa se habilite en fase posterior | §35 vs §40 |

---

## 7. Modelo de datos: correcciones estructurales

Sobre el §32 del SRS, los cambios que se desprenden del análisis:

```
Cliente (sujeto comercial)  ─┬─ 1:N ─> Doctor (contacto/solicitante)
                             ├─ 1:1 ─> CondicionComercial (dias_credito, linea_credito, lista_precios, moneda)
                             └─ 1:N ─> Documento

OrdenTrabajo ─┬─ 1:N ─> DetalleTrabajo   (servicio, cantidad, precio)   ← qué se vende
              ├─ 1:N ─> TareaProduccion  (proceso, técnico, tiempos)    ← qué se hace
              ├─ 1:N ─> ConsumoMaterial  (material, lote, cantidad, costo)
              ├─ 1:N ─> HistorialEstado
              ├─ 1:N ─> Archivo
              └─ 0:N ─> ControlCalidad ─ 0:N ─> Retrabajo

Documento (Factura/Boleta/NC/ND) ─ 1:1 ─> CuentaPorCobrar ─ 1:N ─> Pago
                                                           ├─ 1:N ─> GestionCobranza
                                                           └─ 1:N ─> PromesaPago

Pago ─ (si método = efectivo) ─> MovimientoCaja
Anticipo ─> SaldoAFavor ─> aplicable a Documento
```

Puntos clave:

1. **`Cliente` sustituye a la dualidad doctor/clínica** como titular de crédito y de la deuda (H‑03).
2. **La CxC cuelga del documento**, nunca del trabajo (H‑01).
3. **`DetalleTrabajo` ≠ `TareaProduccion`** (H‑02).
4. Todas las tablas transaccionales llevan `tenant_id`, `created_by`, `created_at` y son auditables (RF‑210).

---

## 8. Priorización revisada

El MVP del §40 abarca 16 módulos; entregarlo completo como primera versión es inviable y retrasa el valor. Propuesta de reordenamiento manteniendo el alcance total del SRS:

### Fase 1 — Núcleo operativo (lo que reemplaza el Excel del laboratorio)
Seguridad y roles · Clientes/doctores/pacientes · Catálogo y tarifas · Orden de trabajo completa (con pieza, material, color, prioridad, adjuntos) · Kanban y estados · Producción con etapas y técnicos · Dashboard operativo.

*Criterio de cierre: el laboratorio puede dejar de usar su registro manual de trabajos.*

### Fase 2 — Ciclo del dinero
Facturación con IGV y series · Pagos aplicados a documento · Anticipos · Caja con arqueo · Cuentas por cobrar con aging y línea de crédito · Cobranza con gestiones, promesas y agenda · Estado de cuenta.

*Criterio de cierre: una sola cifra de deuda en todo el sistema.*

### Fase 3 — Control y calidad
Control de calidad y checklists · Retrabajos y garantías · Entregas con evidencia · Inventario con lotes y consumo valorizado · Costo real y rentabilidad · Reportes y KPIs · Auditoría · Notificaciones.

### Fase 4 — Ecosistema
Compras y proveedores · SUNAT · WhatsApp Business · Portal del odontólogo · Multiempresa/multisede · BI y funciones de IA (§41).

**Cambio respecto del SRS:** inventario, calidad y retrabajos salen del MVP (no bloquean la operación diaria) y entra producción con etapas reales (sin ella el kanban es decorativo). Facturación y cobranza se agrupan en una sola fase porque comparten el modelo de datos y separarlas produce el descuadre H‑01.

---

## 9. Criterios de aceptación de los casos de uso críticos

Formato Given/When/Then, listos para pruebas.

**CU‑005 · Registrar trabajo dental**
- *Dado* un cliente con línea de crédito excedida, *cuando* el usuario intenta crear un trabajo, *entonces* el sistema muestra la advertencia y sólo permite continuar con autorización de un usuario con permiso de excepción, dejando registro en auditoría. (RF‑163)
- *Dado* un tipo de trabajo del catálogo, *cuando* se selecciona, *entonces* el sistema propone el flujo productivo configurado y calcula el precio según la lista del cliente. (RF‑050, RF‑092)
- *Dado* una fecha de entrega anterior a la fecha de recepción, *cuando* se guarda, *entonces* el sistema rechaza la operación con mensaje explícito. (RN‑007)
- *Cuando* se confirma, *entonces* se genera un número correlativo único e irrepetible y el estado inicial "Registrado". (RN‑003, RF‑045)

**CU‑015 · Registrar pago**
- *Dado* un documento con saldo S/ 640, *cuando* se registra un pago de S/ 700, *entonces* el sistema lo rechaza salvo autorización, y de autorizarse genera saldo a favor. (RN‑012, RF‑144)
- *Dado* un pago en efectivo, *cuando* se confirma, *entonces* se crea automáticamente el movimiento de caja del día. (H‑05)
- *Cuando* la suma de pagos iguala el total del documento, *entonces* la CxC se cierra automáticamente y el documento pasa a "Pagada". (RN‑014)

**CU‑016 · Registrar gestión de cobranza**
- *Dado* un resultado "Promesa de pago", *cuando* se guarda, *entonces* la fecha de compromiso es obligatoria y la cuenta pasa a "Comprometido". (H‑09, RF‑173)
- *Dado* una promesa vencida sin pago, *cuando* transcurre la fecha comprometida, *entonces* la cuenta vuelve a "En Gestión" y se genera una acción en la agenda del día. (RF‑174, RF‑175)

**CU‑011 · Control de calidad**
- *Dado* un trabajo con control de calidad rechazado, *cuando* se intenta pasarlo a "Entregado", *entonces* el sistema lo impide. (RN‑006)
- *Dado* un trabajo con tareas obligatorias pendientes, *cuando* se intenta cerrarlo, *entonces* el sistema lo impide. (RN‑005)

---

## 10. Decisiones que se requieren del sponsor

Sin estas cinco respuestas el diseño no puede cerrarse:

1. **Sujeto comercial:** ¿se factura y se cobra al doctor o a la clínica? ¿Puede haber ambos?
2. **Origen de la deuda:** ¿se confirma que la CxC nace sólo de la factura/boleta emitida?
3. **Tributario:** ¿los precios del catálogo incluyen IGV? ¿La emisión electrónica SUNAT entra desde la fase 2 o se difiere?
4. **Producción:** ¿el laboratorio quiere realmente medir etapas y tiempos por técnico, o le basta el avance por línea de servicio como hoy? (Define si MEFLAB es un ERP o un ERP+MES.)
5. **SaaS:** ¿MEFLAB se venderá a otros laboratorios? Si la respuesta es sí, `tenant_id` entra en el esquema desde ahora.

---

## 11. Riesgos identificados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Coexistencia de deuda por trabajo y por factura | Descuadres contables, pérdida de confianza del usuario | Cerrar H‑01 antes de construir facturación |
| Precios sin definición de IGV | Reemisión de comprobantes, contingencia tributaria | Cerrar H‑04 antes del módulo de facturación |
| MVP de 16 módulos | Entrega tardía, alcance no controlado | Adoptar la priorización del §8 |
| Score y segmento sin fórmula | Reproceso y expectativas incumplidas | Aprobar RF‑025A antes de programar el CRM |
| Multiempresa diferida a fase 3 | Migración de esquema costosa | Incluir `tenant_id` desde el día 1 (RNF‑015) |
| Prototipo sin backend interpretado como avance | Subestimación del esfuerzo real | Comunicar la cobertura del §3 (≈10 % de lógica de negocio) |

---

*Documento generado a partir del recorrido funcional del prototipo desplegado y del SRS MEFLAB v2.0.*
