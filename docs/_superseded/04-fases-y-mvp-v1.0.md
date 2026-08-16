# MEFLAB — Fases, MVP y backlog

**Documento:** FA-01
**Fecha:** 15/08/2026

---

## 1. Criterio de fasificación

El SRS v2.0 declara un MVP de 16 módulos (§40). Es inviable como primera entrega y retrasa el valor entre 6 y 9 meses. Aquí se reordena con tres criterios:

1. **Cada fase termina en algo que el laboratorio puede usar en producción**, no en un conjunto de pantallas.
2. **Los módulos que comparten modelo de datos van juntos.** Separar facturación de cobranza es exactamente lo que produce el hallazgo H‑01 (tres cifras de deuda).
3. **Lo que no bloquea la operación diaria, se difiere.** Inventario, calidad y compras son importantes, pero un laboratorio opera sin ellos; sin registro de trabajos, no.

---

## 2. Mapa de fases

| Fase | Nombre | Duración estimada | Criterio de cierre |
|---|---|---|---|
| **0** | Fundaciones | 2 semanas | Login funciona, un usuario ve sólo su laboratorio |
| **1** | Núcleo operativo — **MVP** | 8 semanas | El laboratorio deja de usar su registro manual de trabajos |
| **2** | Ciclo del dinero | 8 semanas | Una sola cifra de deuda en todo el sistema |
| **3** | Control y calidad | 8 semanas | El laboratorio sabe cuánto le cuesta y cuánto gana cada trabajo |
| **4** | Ecosistema | 10 semanas | El doctor consulta su trabajo sin llamar |

**Total: ~36 semanas (9 meses)** con un equipo de 2 desarrolladores + 1 diseñador a tiempo parcial. La Fase 1 sola entrega valor real al mes 2,5.

---

## Fase 0 · Fundaciones *(2 semanas)*

Sin pantallas de negocio. Es la base sobre la que todo lo demás se apoya.

| # | Entregable |
|---|---|
| 0.1 | Repositorio, Next.js 15, Tailwind v4, shadcn/ui, CI en Vercel |
| 0.2 | Proyectos Supabase dev y prod; migraciones `0001`‑`0003` aplicadas |
| 0.3 | Auth: login, recuperación de contraseña, custom claims (`tenant_id`, `rol`) |
| 0.4 | Middleware de sesión y guardas de ruta por rol |
| 0.5 | Layout: barra lateral, cabecera, buscador global, tema claro/oscuro |
| 0.6 | Dominio propio + TLS + cabeceras de seguridad + HSTS |
| 0.7 | Sentry, seed de catálogos, tipos generados |

**Definición de terminado:** dos usuarios de laboratorios distintos entran y no ven ni un registro del otro, verificado en base de datos.

---

## Fase 1 · Núcleo operativo — MVP *(8 semanas)*

Lo mínimo para que el laboratorio abandone el Excel y el cuaderno.

### Módulos

| # | Módulo | Alcance |
|---|---|---|
| 1.1 | **Clientes y doctores** | ABM de cliente (clínica o doctor independiente), doctores por cliente, contactos, condiciones comerciales, vista 360° básica |
| 1.2 | **Pacientes** | ABM con paciente simplificado (RN‑002) e historial de trabajos |
| 1.3 | **Catálogo y tarifas** | Servicios, categorías, precios sin IGV, listas de precio por cliente, historial de precios |
| 1.4 | **Orden de trabajo** | Alta completa: cliente, doctor, paciente, servicios, **pieza dental con odontograma**, arcada, material, color, prioridad, fechas, tipo de recepción, indicaciones, **adjuntos** |
| 1.5 | **Kanban y estados** | Tablero por estado configurable, filtros por doctor/técnico/prioridad, semáforo de fechas (a tiempo / por vencer / vencido), cambio de estado con historial |
| 1.6 | **Producción** | Flujos por tipo de trabajo, instanciación automática de etapas, asignación a técnicos, vista "Mis tareas", inicio/fin de etapa, carga por técnico |
| 1.7 | **Entregas** | Registro de entrega con receptor, método y evidencia |
| 1.8 | **Dashboard operativo** | Trabajos por estado, atrasados, entregas de hoy y mañana, carga por técnico, alertas |
| 1.9 | **Usuarios y permisos** | ABM de usuarios, asignación de rol, matriz de permisos por módulo |

### Fuera de la Fase 1 (y por qué)

- **Inventario** — el laboratorio ya controla materiales a ojo; puede seguir un trimestre más.
- **Facturación y cobranza** — entran juntas en Fase 2 por el modelo de datos compartido.
- **Calidad y retrabajos** — requieren que primero existan las etapas de producción registrándose de forma fiable.

**Definición de terminado:** durante dos semanas consecutivas, el 100 % de las órdenes nuevas se registran en MEFLAB y el jefe de producción asigna desde el sistema.

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
| 2.8 | **Dashboard financiero** | Facturado, cobrado, por cobrar, vencido, caja disponible, top deudores |
| 2.9 | **Integraciones** | Facturación electrónica vía PSE, email transaccional (Resend), WhatsApp Business |

**Definición de terminado:** el dashboard, el CRM del cliente, cobranzas y facturación muestran **la misma cifra de deuda**, leída de `v_cartera`. Es la prueba de que H‑01 quedó cerrado.

---

## Fase 3 · Control y calidad *(8 semanas)*

| # | Módulo | Alcance |
|---|---|---|
| 3.1 | **Control de calidad** | Checklist configurable por servicio, inspección con resultado, evidencia fotográfica, no conformidades con causa y responsable |
| 3.2 | **Retrabajos y garantías** | Retrabajo ligado a la orden original, tipificación de causa, política de garantía (cubierto / parcial / facturable), costo generado, KPI de retrabajo |
| 3.3 | **Inventario** | Materiales, lotes con vencimiento, ubicación, movimientos, consumo por trabajo, umbral bajo y crítico, inventario físico con ajuste aprobado, trazabilidad material→lote→trabajo→cliente |
| 3.4 | **Costos y rentabilidad** | Costo estimado vs real (materiales + mano de obra por etapa + procesos externos), margen y rentabilidad por trabajo, doctor, servicio y periodo |
| 3.5 | **Reportes y KPIs** | Los 9 KPIs del SRS §26, reportes productivos, comerciales, financieros y de inventario, con exportación a Excel/PDF |
| 3.6 | **Notificaciones** | Motor de eventos con canales sistema/email/WhatsApp y preferencias por usuario |
| 3.7 | **Auditoría** | Consulta de la bitácora con filtros por usuario, módulo, entidad y rango de fechas |
| 3.8 | **Configuración** | Pantalla única para todos los catálogos y parámetros del laboratorio |

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
| 4.7 | **Funciones de IA** | Predicción de retraso, fecha probable de entrega, priorización, predicción de morosidad, recomendación de cobranza, detección de anomalías (§41 del SRS) |

---

## 3. Backlog priorizado de la Fase 1 (MVP)

Orden de construcción sugerido. Cada ítem es entregable y demostrable.

| # | Historia | Puntos | Depende de |
|---|---|---|---|
| 1 | Como Administrador, creo usuarios y les asigno rol | 5 | Fase 0 |
| 2 | Como Recepción, registro un cliente (clínica o doctor independiente) con sus condiciones comerciales | 8 | 1 |
| 3 | Como Recepción, registro doctores dentro de un cliente | 3 | 2 |
| 4 | Como Recepción, registro un paciente completo o simplificado | 3 | 3 |
| 5 | Como Administrador, mantengo el catálogo de servicios con precios sin IGV | 5 | 1 |
| 6 | Como Administrador, defino listas de precio y asigno una a cada cliente | 5 | 5 |
| 7 | Como Administrador, configuro procesos y flujos por tipo de trabajo | 8 | 5 |
| 8 | Como Recepción, registro una orden con servicios, pieza (odontograma), color, material y fechas | 13 | 4, 6 |
| 9 | Como Recepción, adjunto fotos, STL y prescripciones a la orden | 8 | 8 |
| 10 | Como sistema, genero el número de orden e instancio las etapas del flujo | 5 | 7, 8 |
| 11 | Como Jefe de Producción, veo el kanban con semáforo de fechas y filtros | 8 | 10 |
| 12 | Como Jefe de Producción, asigno etapas a técnicos según carga y especialidad | 8 | 11 |
| 13 | Como Técnico, veo mis tareas y registro inicio y fin | 5 | 12 |
| 14 | Como Jefe de Producción, cambio el estado de la orden y queda historial | 5 | 11 |
| 15 | Como Recepción, registro la entrega con receptor y evidencia | 5 | 14 |
| 16 | Como cualquier usuario, veo el dashboard operativo con alertas | 8 | 13, 14 |
| 17 | Como Recepción, busco cualquier orden, doctor o paciente desde el buscador global | 5 | 8 |
| 18 | Como Administrador, consulto la vista 360° del doctor | 5 | 8 |

**Total: 116 puntos.** A una velocidad de 15 puntos/semana con 2 desarrolladores → ≈8 semanas.

---

## 4. Riesgos de calendario

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El laboratorio no tiene definidos sus flujos productivos por tipo de trabajo | Alta | Levantarlos en la semana 1 de la Fase 1, con el jefe de producción presente |
| Los precios actuales incluyen IGV y hay que reconvertirlos | Alta | Decidir en D‑03 antes de cargar el seed |
| Resistencia de los técnicos a registrar tiempos | Media | Interfaz de un solo toque; medir adopción semanal; empezar por inicio/fin sin pausas |
| Homologación con el PSE se alarga | Media | Iniciar el trámite en la semana 1 de la Fase 2, no al final |
| Datos históricos en Excel con calidad heterogénea | Alta | RF‑220: cargador con validación y bitácora de errores; migrar sólo clientes y saldos abiertos, no el histórico completo |

---

## 5. Qué se entrega en cada demo

| Semana | Demo |
|---|---|
| 2 | Login, roles, aislamiento entre laboratorios |
| 4 | Alta de clientes, doctores, pacientes y catálogo |
| 6 | Orden de trabajo completa con odontograma y adjuntos |
| 8 | Kanban con asignación y semáforo |
| 10 | Técnico registrando tiempos, dashboard operativo |
| **10** | **Puesta en producción del MVP** |
| 14 | Facturación con IGV y series |
| 18 | Pagos, caja con arqueo, CxC con aging |
| **18** | **Puesta en producción del ciclo financiero** |
