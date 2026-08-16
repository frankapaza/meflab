# MEFLAB — Decisiones de diseño resueltas

**Documento:** DD-01
**Versión:** 1.1 — añade D‑06 y D‑07 con las decisiones del sponsor del 16/08/2026
**Fecha:** 16/08/2026
**Estado:** D‑01 a D‑05 cerradas · D‑06 y D‑07 decididas el 16/08/2026
**Depende de:** `Analisis_Software_MEFLAB_v1.md` (§10 Decisiones requeridas)

Este documento cierra las decisiones bloqueantes del análisis y añade las mejoras estructurales que se desprenden de ellas. Cada decisión se toma en la opción que **maximiza el valor del producto y minimiza el reproceso**, con su justificación y su consecuencia técnica.

---

## D‑01 · Sujeto comercial: `Cliente` como entidad, doctor como contacto

**Decisión:** se crea la entidad **`cliente`**, que puede ser de dos tipos: `clinica` (persona jurídica, con RUC) o `doctor_independiente` (persona natural, con DNI o RUC). El **doctor** pasa a ser un contacto/solicitante que pertenece a un cliente, y un cliente puede tener N doctores.

**Por qué:** es la única forma de responder sin ambigüedad a quién se factura, a quién se le fija la línea de crédito y a quién se le cobra. Modelar clínica como texto (como hace el prototipo) rompe facturación, CxC, cobranza y score.

**Consecuencias:**
- La factura se emite **siempre al cliente**, nunca al doctor.
- La línea de crédito, los días de crédito y la lista de precios son atributos del **cliente**.
- El doctor conserva su ficha CRM (trabajos, preferencias, incidencias, retrabajos) porque es quien decide dónde manda el trabajo, pero no es sujeto de crédito.
- Un doctor independiente se modela como un cliente con un único doctor asociado. La UI oculta esa dualidad: al registrar un doctor sin clínica, el sistema crea el cliente automáticamente.
- Migración desde el prototipo: cada valor distinto del campo texto "clínica" se convierte en un cliente.

---

## D‑02 · La cuenta por cobrar nace del documento de venta

**Decisión:** `Documento (factura/boleta) → CuentaPorCobrar → Pago`. El saldo del trabajo **no es deuda**: es información operativa sobre anticipos recibidos.

**Por qué:** resuelve el hallazgo H‑01 (tres cifras distintas de deuda). Una sola tabla es la fuente de verdad y todos los indicadores leen de ella.

**Consecuencias:**
- Un trabajo entregado y no facturado **no genera deuda**; aparece en el reporte "Trabajos entregados pendientes de facturar" (RF‑145), que es un control operativo distinto.
- El dashboard, el CRM del doctor, cobranzas y facturación consultan `cuenta_cobrar`. Se prohíbe cualquier cálculo alterno de deuda.
- Los anticipos se registran como `saldo_a_favor` del cliente y se aplican a la factura cuando se emite (RF‑144).
- Una factura anulada elimina su CxC (RN‑013); una CxC saldada se cierra automáticamente (RN‑014).

**Regla de oro del proyecto:** *ningún indicador de deuda se calcula sumando saldos de trabajos.*

---

## D‑03 · Tributario: precios sin IGV, emisión electrónica en Fase 2

**Decisión:**
- Los precios del catálogo se almacenan **sin IGV** (valor de venta). El IGV (18 %, parametrizable) se calcula al emitir el documento.
- La UI muestra al usuario de recepción el **precio con IGV** ya calculado, para que la conversación con el doctor sea sobre el precio final.
- **Cada lista de precios declara si sus importes incluyen IGV** (`lista_precio.precios_incluyen_igv`). Al capturar un precio, el sistema normaliza a valor de venta antes de guardar. Lo que se almacena sigue siendo siempre sin IGV; lo que cambia es cómo se captura. *(Añadido el 16/08/2026 — ver D‑07.)*
- Cada servicio lleva su afectación tributaria (gravado / exonerado / inafecto).
- La **emisión electrónica SUNAT entra en la Fase 2**, pero el modelo de datos se construye desde el día 1 con todos los campos que exige el estándar (tipo y número de documento del adquiriente, código de tipo de comprobante, serie‑correlativo, importes desagregados, moneda, tipo de cambio). Así, integrar el PSE es sólo añadir el conector, sin migrar datos.

**Por qué:** almacenar precios con IGV incluido obliga a desagregar hacia atrás y produce diferencias de redondeo por línea. Diferir SUNAT sin preparar el modelo obliga a reemitir comprobantes.

**Consecuencias:**
- Redondeo: se calcula por línea a 2 decimales y se suma; el total no se redondea de nuevo.
- Moneda base S/; el modelo admite USD con tipo de cambio por documento (para insumos importados y clientes que lo pidan).
- Series y correlativos por tipo de comprobante y sede, con control de saltos (RF‑095).

---

## D‑04 · Producción: sí se miden etapas y tiempos — MEFLAB es ERP + MES ligero

**Decisión:** se separan dos conceptos que el prototipo mezcla:

| | `detalle_trabajo` | `tarea_produccion` |
|---|---|---|
| Qué es | Línea de venta | Etapa productiva |
| Ejemplo | "Prótesis Parcial Metálica, 1 × S/850" | "Colado", "Cerámica", "Acabado" |
| Datos | servicio, cantidad, precio, IGV | proceso, técnico, fecha programada, inicio, fin, tiempo estimado/real, estado |
| Alimenta | Facturación, precio, margen | Kanban, KPI de productividad, costo de mano de obra, capacidad |

El avance de la tarjeta kanban se calcula sobre `tarea_produccion`; el importe, sobre `detalle_trabajo`.

**Por qué:** sin etapas reales el Kanban es decorativo, el costo real (RF‑101) es incalculable y los KPI 02, 08 y 09 no existen. Es además el diferencial que separa a MEFLAB de una app de registro de trabajos (§42 del SRS).

**Consecuencias:**
- Cada `tipo_trabajo` tiene un **flujo productivo** preconfigurado (plantilla de etapas) que se instancia al crear la orden.
- El registro de tiempo pasa de "opcional" (RF‑056) a **obligatorio a nivel de etapa**: el técnico marca inicio y fin. El cronómetro fino (pausas) queda opcional.
- Se introduce el costo/hora por técnico o por proceso para calcular mano de obra.

---

## D‑05 · Multi‑tenant desde el día 1

**Decisión:** el esquema lleva `tenant_id` en todas las tablas de negocio y RLS activo desde la primera migración, aunque la gestión comercial multiempresa (alta de laboratorios, planes, facturación del SaaS) se habilite en Fase 4.

**Por qué:** el aislamiento por tenant es una decisión de esquema, no una funcionalidad. Añadirlo después obliga a migrar cada tabla, cada consulta y cada política de seguridad.

**Consecuencias:**
- Coste hoy: prácticamente cero (una columna y una política por tabla, generadas con plantilla).
- Coste si se difiere: reescritura completa del acceso a datos.
- Cada laboratorio ve exclusivamente sus datos, garantizado en la base de datos y no en el código de aplicación.

---

## D‑06 · Áreas productivas: en el esquema desde el día 1, en la interfaz cuando el laboratorio las defina

**Decisión:** el esquema lleva `area_id` en las seis tablas que lo requieren (AC‑01 §7.1) desde la primera migración, con un **área única `GENERAL`** sembrada. La interfaz de áreas —configuración, enrutamiento automático y Kanban filtrado— queda oculta tras un flag hasta que el laboratorio confirme cuántas áreas tiene y cuáles son.

**Por qué:** el sponsor no tiene claro el mapa de áreas (¿CAD‑CAM es propia o está dentro de Fija? ¿la prótesis total es PPR o aparte?) y no quiere que eso frene el arranque. Es un requisito legítimo, pero **el área es una decisión de esquema, no una funcionalidad** — exactamente el mismo razonamiento que D‑05 aplicó a multi‑tenant.

| | Coste hoy | Coste después de cargar datos |
|---|---|---|
| Columna `area_id` con default | una línea por tabla | migrar 6 tablas y reasignar cada registro a mano |

**Consecuencias:**
- El MVP no pide un área al usuario en ninguna pantalla. Nadie tiene que decidir nada para operar.
- El agrupador por área del Kanban ya está construido en el prototipo; se activa con configuración, no con desarrollo.
- Las cuatro historias que activan las áreas (A‑1 a A‑4, 16 pts) viven en un **backlog en espera** en `04-fases-y-mvp.md` §5.
- **Fecha límite real: la puesta en producción del MVP.** Definir las áreas después obliga a reasignar servicios, órdenes y tareas ya creados.

---

## D‑07 · El IGV incluido es un atributo de la lista de precios, no una decisión previa

**Decisión:** en lugar de averiguar de antemano si los precios actuales del laboratorio incluyen IGV, **cada lista de precios lo declara**. El sistema normaliza a valor de venta al guardar.

```sql
alter table lista_precio
  add column precios_incluyen_igv boolean not null default false;
```

**Por qué:** era un riesgo de probabilidad alta en el registro (`04-fases-y-mvp.md`) y bloqueaba la carga del seed. Convertirlo en un atributo administrable lo elimina: el usuario captura el precio como lo tiene en la cabeza y la base guarda lo que necesita la facturación. Además cubre el caso real de que **convivan** listas capturadas de una y otra forma.

**Consecuencias:**
- D‑03 queda intacto: lo almacenado sigue siendo siempre valor de venta sin IGV.
- La normalización se hace **una sola vez, al guardar**, nunca al leer. Un precio guardado ya está limpio.
- El cálculo es `valor_venta = precio_capturado / (1 + igv)` redondeado a 2 decimales, con el IGV vigente en la fecha de captura.
- Desaparece el riesgo "los precios actuales incluyen IGV y hay que reconvertirlos".

---

## Mejoras adicionales incorporadas

Más allá de las cinco decisiones, estas mejoras elevan el producto y se integran en el alcance:

### M‑01 · Estados del trabajo reconciliados
Se adopta el ciclo del SRS (RF‑045) eliminando el ambiguo "Laboratorio":

`Registrado → En planificación → En producción → Control de calidad → Listo para entrega → Entregado`
con las ramas `Observado`, `Retrabajo` y `Cancelado`.

Los estados son configurables por laboratorio, pero cada estado se mapea a una **fase canónica** del sistema (`inicial / productiva / control / final / anulada`) para que los KPIs sigan funcionando aunque el laboratorio renombre o añada estados.

### M‑02 · Score de pago con fórmula explícita (RF‑025A)

```
score_bruto = 0.40·puntualidad + 0.25·(1 − morosidad) + 0.15·frecuencia
            + 0.10·recencia + 0.10·volumen − 0.20·tasa_retrabajo_imputable

puntualidad = 1 − (promedio_dias_atraso / 30), acotado a [0,1]
morosidad   = deuda_vencida / deuda_total
frecuencia  = min(trabajos_ultimos_90d / 10, 1)
recencia    = 1 si pidió en los últimos 30 d; 0.5 hasta 90 d; 0 después
volumen     = percentil de facturación del cliente en el laboratorio
```

`score = round(1 + 4 · score_bruto)` → escala 1–5 estrellas.

**Segmentación derivada (parametrizable):**

| Segmento | Regla |
|---|---|
| Moroso | deuda vencida > 60 días **o** score ≤ 2 |
| Nuevo | antigüedad < 90 días |
| Premium | facturación 12 m en el decil superior **y** score ≥ 4 |
| Frecuente | ≥ 4 trabajos en los últimos 90 días |
| Inactivo | sin trabajos en 180 días |
| VIP | marcado manualmente por Gerencia |

Recálculo: al cierre diario y ante cada evento de pago, emisión o vencimiento. Los pesos viven en `configuracion`, no en el código.

### M‑03 · Estados separados para el documento
Se separa **estado documental** (`borrador / emitida / anulada`) de **estado de cobro** (`pendiente / parcial / pagada / vencida`). Hoy el prototipo los solapa en la misma columna. "Vencida" pasa a ser un estado derivado (`fecha_vencimiento < hoy AND saldo > 0`), nunca almacenado.

### M‑04 · Máquina de estados de la cuenta por cobrar (RF‑170/H‑09)

```
Vigente ──(vence)──> Vencida ──(gestión)──> En gestión ──(promesa)──> Comprometida
   │                                              ▲                        │
   └──────────(pago total)──> Cerrada <───────────┴──(promesa incumplida)──┘
```

Reglas: registrar una promesa la pasa a *Comprometida* y agenda la fecha; si llega la fecha sin pago, vuelve a *En gestión* y genera una acción en la agenda del día.

### M‑05 · Regla de caja explícita
Sólo los pagos con método `efectivo` generan movimiento de caja. Transferencia, Yape, Plin, tarjeta y depósito van a **bancos** (cuenta bancaria destino). El arqueo (RF‑153) compara el saldo teórico de efectivo con el conteo físico y exige justificar la diferencia.

### M‑06 · Trazabilidad como requisito de arquitectura, no de reporte
La cadena `Doctor → Trabajo → Servicio → Pieza → Material/Lote → Tareas → Técnico → Calidad → Entrega → Documento → Pago → Gestión` se garantiza con claves foráneas obligatorias, no con consultas de reconstrucción. Toda pantalla de detalle expone navegación en ambos sentidos.

### M‑07 · Auditoría por trigger, no por código
La bitácora (RF‑210) se implementa con un trigger genérico en Postgres sobre las tablas críticas. Así ninguna operación puede escapar de la auditoría por un olvido en el código de aplicación.

### M‑08 · Odontograma como control de entrada
La pieza dental se captura con un selector visual (notación FDI, 11‑48) en lugar de un campo de texto. Reduce errores de transcripción — la causa más común de retrabajo por "información incorrecta" (RF‑071).

### M‑09 · Escala de color como catálogo cerrado
Color y escala (VITA Classical, VITA 3D‑Master, Chromascop) se modelan como catálogo, no como texto libre. Es el segundo motivo de retrabajo más frecuente en laboratorios dentales.

### M‑10 · Portal del doctor adelantado a Fase 3
El SRS lo pone en Fase 3 como "actor externo futuro". Se mantiene en Fase 3 pero se diseña la API desde Fase 1 (todo endpoint del trabajo acepta un `scope` de cliente), porque es el mayor diferencial comercial del producto y el que más reduce las llamadas de "¿cómo va mi trabajo?" que hoy consumen a Recepción.

---

## Impacto de las decisiones sobre el SRS v2.0

| Sección del SRS | Cambio |
|---|---|
| §4.13 Doctor/Clínica | Se reemplaza por el modelo `Cliente ← Doctor` (D‑01) |
| RF‑040 | El código de orden se unifica en `OT-AAAA-NNNNNN`; se abandona `CONT-` |
| RF‑045 | Se elimina el estado "Laboratorio"; se añade el mapeo a fase canónica (M‑01) |
| RF‑052 | Se desdobla en `detalle_trabajo` y `tarea_produccion` (D‑04) |
| RF‑056 | El registro de tiempo por etapa deja de ser opcional |
| RF‑025 | Se sustituye por RF‑025A con fórmula (M‑02) |
| RF‑132 | Precios sin IGV; afectación por servicio (D‑03) |
| RF‑133 | Estados separados documental/cobro (M‑03) |
| RF‑160 | La CxC nace sólo del documento (D‑02) |
| §35 / §40 | Multi‑tenant pasa de Fase 3 a decisión de esquema inicial (D‑05) |
| RF‑052 / §4.13 | El área productiva se añade a nivel de línea y de tarea, con área única por defecto (D‑06) |
| RF‑132 | La lista de precios declara si sus importes incluyen IGV (D‑07) |
