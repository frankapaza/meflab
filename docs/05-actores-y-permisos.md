# MEFLAB — Actores, roles, permisos y competencias

**Documento:** AC-01
**Versión:** 2.1 — recoge las decisiones del sponsor del 16/08/2026 (§2.2 y §3.3) y marca §7.4 como aplicado
**Fecha:** 16/08/2026

---

## 1. Estructura organizativa real

El laboratorio informa la siguiente estructura. Es distinta del catálogo genérico de 13 roles del SRS v2.0, y es la que manda.

```
                    Gerente General
                          │
          ┌───────────────┼───────────────┐
          │                               │
   Administrador                 Líder de Laboratorio
   (rol propuesto)                        │
                     ┌──────────────┬─────┴────────────┐
                     │              │                  │
              Área de          Líder de Área      Líder de Área
              Recepción            FIJA               PPR
                                    │                  │
                             Técnicos de apoyo   Técnicos de apoyo
```

**El hallazgo estructural:** el laboratorio se organiza **por áreas productivas especializadas**, cada una con su líder. Esto no estaba contemplado ni en el SRS ni en el prototipo, y tiene consecuencias directas sobre el modelo de datos, el enrutamiento de las órdenes, el tablero Kanban y los permisos. Se desarrolla en §5.

---

## 2. Actores confirmados

### 2.1 Usuarios internos del sistema

| # | Actor real | Rol en el sistema | Ámbito | Responsabilidad | Fase |
|---|---|---|---|---|---|
| 1 | **Gerente General** | `gerencia` | Todo el laboratorio | Dirección, indicadores, rentabilidad, decisiones comerciales y de excepción | 1 |
| 2 | **Administrador** *(propuesto)* | `administrador` | Todo el laboratorio | Usuarios, permisos, catálogos, parámetros, integraciones, auditoría | 0 |
| 3 | **Líder de Laboratorio** | `lider_laboratorio` | Toda la producción | Supervisa ambas áreas, prioridades globales, capacidad, calidad, incidencias | 1 |
| 4 | **Recepción** | `recepcion` | Comercial y atención | Doctores, órdenes, fechas comprometidas, entregas, información al cliente | 1 |
| 5 | **Líder de Área Fija** | `lider_area` | Área Fija | Planifica y asigna dentro de su área, controla avance y calidad de sus trabajos | 1 |
| 6 | **Líder de Área PPR** | `lider_area` | Área PPR | Ídem, en prótesis removible | 1 |
| 7 | **Técnico de apoyo** | `tecnico` | Su área | Ejecuta etapas, registra tiempos y consumos, reporta incidencias | 1 |

Siete roles, no trece. El resto de funciones del SRS (calidad, almacén, compras, finanzas, caja, cobranza) **existen como responsabilidades pero no como puestos** — las absorben las personas de arriba. Ver §4.

### 2.2 Sobre tu observación del Administrador — confirmada

**Sí, hace falta, y debe ser un rol distinto del Gerente General.** Razones:

1. **Separación de funciones.** El Administrador *configura* el sistema (crea usuarios, cambia precios, define permisos). El Gerente *consulta y decide*. Que la misma cuenta haga ambas cosas rompe la auditoría: cuando alguien modifique un precio o un permiso, hay que poder distinguir si fue una decisión gerencial o un mantenimiento.
2. **Continuidad operativa.** El Gerente no está siempre disponible. Si el alta de un usuario o la corrección de un catálogo depende de él, la operación se traba.
3. **Riesgo.** El Administrador es el rol con más poder técnico del sistema. Debe existir explícitamente, con MFA obligatorio y toda su actividad auditada, en lugar de esconderse dentro del rol del Gerente.

**En la práctica:** en un laboratorio de este tamaño, la persona que ejerce de Administrador suele ser el Líder de Laboratorio o alguien de Recepción con confianza. Eso es perfectamente válido — se le asignan **dos roles a la misma cuenta** (ver §4), no se mezclan los permisos en uno solo.

> **Decisión del sponsor · 16/08/2026.** Por ahora el Administrador es el propio sponsor, que además es el Gerente General. Se implementa con **dos roles sobre una sola cuenta**, que es exactamente el caso para el que se diseñó el modelo N:M de §7.2. **MFA obligatorio desde el primer login.**
>
> Se acepta a sabiendas de que rompe los puntos 1 y 2 de arriba: la bitácora no podrá distinguir una decisión gerencial de un mantenimiento, y la operación queda sin respaldo si el sponsor no está disponible. **Mitigación acordada: nombrar un segundo Administrador antes de la puesta en producción del MVP** (semana 12).

### 2.3 Sobre los doctores — sí, deben estar

Los doctores son actores del negocio desde el día 1, pero **no son usuarios del sistema hasta la Fase 4**. La distinción importa:

| | Fase 1–3 | Fase 4 |
|---|---|---|
| Qué son | **Dato maestro.** Viven en el CRM: ficha, historial, condiciones comerciales, deuda, score. No tienen cuenta ni contraseña | **Usuario externo** con cuenta propia en el portal |
| Quién los representa | Recepción actúa por ellos: registra la orden, responde sus consultas por teléfono | Ellos mismos |
| Rol en el sistema | — | `portal_cliente` |
| Qué pueden hacer | — | Consultar sus trabajos y estados, descargar facturas, ver su deuda, enviar archivos, registrar comprobantes de pago, solicitar un trabajo nuevo |

**Recomendación:** mantenerlos fuera del sistema en el MVP. Dar acceso externo antes de que los datos internos sean confiables expone errores al cliente. El portal es el mayor diferencial comercial del producto, pero se abre cuando el laboratorio ya confía en su propia información.

Ojo con la distinción de D‑01: el **doctor** es quien pide el trabajo; el **cliente** (clínica o doctor independiente) es a quien se factura y se cobra. Un doctor de una clínica con 5 odontólogos consultaría solo sus trabajos; el administrador de la clínica vería los de los cinco y la deuda total.

### 2.4 Actores externos no humanos

PSE de facturación electrónica (SUNAT), WhatsApp Business Cloud API, servicio de email, pasarela de pagos, almacenamiento documental, sistemas CAD/CAM.

---

## 3. Las áreas productivas: Fija y PPR

### 3.1 Qué implica

Cada área es una **unidad organizativa con su propio líder, sus técnicos, sus procesos y su cola de trabajo**. Un trabajo de corona de zirconio y uno de prótesis parcial removible no comparten ni personas, ni etapas, ni equipos, ni tiempos.

| | **Área FIJA** | **Área PPR** |
|---|---|---|
| Qué produce | Coronas, puentes, carillas, incrustaciones, coronas sobre implante | Prótesis parcial removible, prótesis total, acrílicos, reparaciones |
| Servicios del catálogo | Corona de Porcelana, Corona de Zirconio, Corona Metal‑Porcelana, Carilla de Porcelana, Carilla de Resina, Inlay, Onlay, Puente Fijo, Implante sobre Corona | Prótesis Parcial Acrílica, Prótesis Parcial Metálica, Prótesis Total |
| Procesos típicos | Modelo · Encerado · Colado o Fresado · Cerámica · Glaseado · Acabado · CAD/CAM | Modelo · Diseño de esqueleto · Colado Cr‑Co · Montaje de dientes · Prueba en cera · Acrilizado · Pulido |
| Competencias | CAD, CAM, Cerámica, Metal, Encerado, Implantes | Acrílico, Metal, Modelos, Montaje |
| Materiales | Zirconio, porcelana feldespática, Cr‑Co, Ni‑Cr, discos, fresas | Acrílico termocurable, dientes acrílicos, Cr‑Co, ceras |

*(La asignación de servicios a cada área es una propuesta a partir del catálogo del prototipo; requiere validación del laboratorio.)*

### 3.2 Cómo se comporta el sistema

1. **Enrutamiento automático.** Cada servicio del catálogo pertenece a un área. Al registrar la orden, el sistema la enruta al área correspondiente sin que Recepción tenga que decidirlo.
2. **Órdenes mixtas.** Una misma orden puede llevar servicios de ambas áreas (p. ej. una prótesis total superior + una corona inferior). El sistema debe soportarlo: la orden es una, pero sus tareas se agrupan y se asignan **por área**, y cada líder ve solo lo suyo. Esta es la razón principal por la que el área debe modelarse a nivel de línea y de tarea, no de orden.
3. **Kanban por área.** El Líder de Fija abre el tablero y ve sus trabajos; el de PPR, los suyos. El Líder de Laboratorio y Gerencia ven ambos, con un selector de área.
4. **Capacidad y KPIs por área.** Carga, productividad, cumplimiento de fechas y retrabajos se miden por área además de por técnico. Es lo que permite responder "¿dónde se está atracando la producción?".
5. **Un técnico puede apoyar en otra área** — de ahí el nombre "técnicos de apoyo". El modelo permite asignar un técnico a un área principal y habilitarlo en otras.

### 3.3 Preguntas para el laboratorio

> **Estado · 16/08/2026:** el sponsor todavía no puede responderlas. Se acordó **arrancar sin áreas en la interfaz**, con el esquema ya preparado y un área única `GENERAL` por defecto (D‑06). Todo lo descrito en §3.1 y §3.2 sigue siendo el diseño objetivo; lo que se difiere es su activación, no su modelo.
>
> **La fecha límite es la puesta en producción del MVP (semana 12).** Responder después obliga a reasignar a mano cada servicio, orden y tarea ya creados.

1. ¿Existe un área **Digital / CAD‑CAM** separada, o el escaneo, diseño y fresado están dentro de Fija?
2. La **Prótesis Total**, ¿pertenece a PPR o es un área aparte?
3. ¿Hay trabajos de **ortodoncia** (placas, retenedores, alineadores)?
4. ¿Los **modelos y el vaciado de yeso** los hace cada área o hay una persona que los hace para ambas?
5. ¿El **control de calidad** lo hace el líder de cada área o el Líder de Laboratorio?
6. ¿Cuántos técnicos de apoyo hay por área?

---

## 4. Acumulación de roles: cómo se cubren las funciones sin puesto

El SRS asume un laboratorio con 13 puestos. Este tiene 7. Las funciones restantes se reparten así:

| Función del SRS | Sin puesto propio — la asume | Nota |
|---|---|---|
| Control de Calidad | Líder de cada área, con supervisión del Líder de Laboratorio | Pendiente de confirmar (§3.3 pregunta 5) |
| Almacén | Líder de Laboratorio o un técnico designado por área | El consumo lo registra el propio técnico al ejecutar la etapa |
| Compras | Líder de Laboratorio, con aprobación del Gerente | Fase 4 |
| Facturación / Finanzas | Recepción o Administrador | |
| Caja / Tesorería | Recepción | |
| Cobranza | Recepción, con seguimiento del Gerente | Es la función más frecuentemente descuidada por falta de dueño |

### Cambio necesario en el modelo: un usuario, varios roles

El esquema documentado hasta ahora asume **un rol por usuario** (`usuario.rol`). La estructura real lo desmiente: Recepción hace facturación, caja y cobranza; el Líder de Laboratorio puede ser también Administrador y Almacén.

**Se corrige a una relación N:M:** un usuario tiene uno o más roles, y sus permisos son la **unión** de los permisos de todos ellos. Ver §7.

Esto es preferible a crear roles compuestos ("Recepción‑Finanzas‑Caja") por tres razones: no se multiplican las combinaciones, la matriz de permisos sigue siendo legible, y cuando el laboratorio crezca y contrate un cajero dedicado basta con quitarle el rol a Recepción.

---

## 5. Matriz de permisos

Leyenda: **T** total (ver, crear, editar, eliminar) · **E** editar (ver, crear, editar) · **C** consulta · **A** solo su área · **P** solo lo propio · **—** sin acceso

| Módulo | Gerente General | Administrador | Líder de Laboratorio | Recepción | Líder de Área | Técnico |
|---|---|---|---|---|---|---|
| Dashboard | T | T | T | C | A | P |
| Clientes | C | T | C | E | — | — |
| Doctores | C | T | C | E | C | C |
| Pacientes | C | T | C | E | A | P |
| Órdenes de trabajo | C | T | E | E | A | P |
| Producción | C | T | T | C | **A** (total en su área) | P |
| Asignación de tareas | C | T | T | — | **A** | — |
| Calidad | C | T | E | C | **A** | C |
| Retrabajos | E | T | E | C | A | C |
| Entregas | C | T | E | E | A | — |
| Catálogo y tarifas | E | T | C | C | C | — |
| Inventario | C | T | E | C | A | P (consumo) |
| Compras | E | T | E | — | C | — |
| Facturación | C | T | — | E | — | — |
| Pagos | C | T | — | E | — | — |
| Caja | C | T | — | E | — | — |
| Cuentas por cobrar | C | T | — | E | — | — |
| Cobranza | E | T | — | E | — | — |
| Reportes | T | T | E | C | A | P |
| Auditoría | C | T | — | — | — | — |
| Configuración | C | T | — | — | — | — |
| Usuarios y permisos | C | T | — | — | — | — |

**Lectura de la matriz:** el Administrador tiene acceso total porque es quien mantiene el sistema; el Gerente General tiene consulta amplia y edición solo donde decide (precios, retrabajos con cargo, cobranza). El Líder de Área es total **dentro de su área** y ciego fuera de ella.

### Permisos de aprobación

| Acción | Quién puede |
|---|---|
| Autorizar venta sobre línea de crédito excedida | Gerente General, Administrador |
| Anular un documento emitido | Gerente General, Administrador |
| Autorizar retrabajo con cargo al doctor | Gerente General, Líder de Laboratorio |
| Aprobar ajuste de inventario | Administrador, Líder de Laboratorio |
| Autorizar diferencia de arqueo de caja | Gerente General, Administrador |
| Modificar precios del catálogo | Gerente General, Administrador |
| Reasignar tarea ya iniciada | Líder de Área (en su área), Líder de Laboratorio |
| Mover un trabajo entre áreas | Líder de Laboratorio |
| Crear o desactivar usuarios | Administrador |

### Restricciones de datos aplicadas en la base (RLS), no en la interfaz

| Regla |
|---|
| Nadie ve datos de otro laboratorio (`tenant_id`) |
| El Técnico solo ve las tareas que tiene asignadas |
| El Líder de Área solo ve órdenes y tareas de su área |
| Los datos de paciente se restringen por rol (RNF‑006) — ver nota abajo |
| La bitácora de auditoría es de solo lectura, y solo para Administrador y Gerente |
| El portal del doctor (Fase 4) solo ve las órdenes de su propio cliente |

> **RNF‑006, cómo está implementado.** El paciente es la única persona del
> sistema que no es cliente nuestro y que no consintió nada: llega en la
> orden de su odontólogo. RLS filtra filas, no columnas, así que la tabla
> `paciente` **no es legible** más que para Recepción, Administrador y
> Gerencia. Todos los demás leen de la vista `v_paciente`, que enseña el
> nombre y tapa el documento, la fecha de nacimiento y la edad.
>
> No basta con tapar las columnas en la vista: el token del técnico es el
> mismo que usa el navegador contra PostgREST, y con la tabla abierta
> bastaría con pedir `/rest/v1/paciente` para saltársela. Por eso se cierra
> la tabla y la vista queda como única puerta. Como la vista se ejecuta
> saltando RLS, filtra el laboratorio ella misma.
>
> Las pantallas de producción y entregas leen el paciente **de la vista**,
> nunca de la tabla.

---

## 6. Recorridos por actor

**Gerente General** — Entra una o dos veces por semana, casi siempre desde el celular. Cinco números: cuánto facturé, cuánto me deben, qué está atrasado, cuánto gané, cómo va cada área. Autoriza excepciones de crédito y retrabajos con cargo.

**Administrador** — Uso esporádico pero crítico: alta de usuarios, cambios de precio, ajuste de catálogos, revisión de auditoría. Su pantalla es Configuración.

**Líder de Laboratorio** — Vista consolidada de ambas áreas. Compara carga entre Fija y PPR, mueve trabajos, resuelve incidencias, decide prioridades cuando las dos áreas compiten por la misma fecha de entrega. Es quien más necesita el comparativo entre áreas.

**Recepción** — La que más usa el sistema. Su día: entregas de hoy, llamadas de doctores ("¿cómo va mi puente?"), registro de órdenes, entregas, y —según el reparto de funciones— facturación, cobros y caja. Su pantalla de inicio es la agenda del día, no el dashboard financiero.

**Líder de Área (Fija / PPR)** — Abre su Kanban a las 8:00, ve qué vence hoy y qué está atrasado en **su** área, asigna a sus técnicos, revisa el trabajo terminado antes de pasarlo. No le interesa ni le distrae lo que ocurre en la otra área.

**Técnico de apoyo** — Tres cosas: qué me toca, empezar, terminar. Desde una tablet en el taller, con guantes puestos. Es el rol con mayor riesgo de rechazo: si registrar una etapa toma más de dos toques, no lo hará y todo el módulo de producción queda vacío.

---

## 7. Impacto en el modelo de datos

Esta estructura obliga a tres cambios sobre el esquema documentado en el anexo (`supabase/migrations/`). **Pendientes de aplicar** al anexo SQL; ya aplicados a la planificación (ver §7.4).

### 7.1 Nueva entidad: área productiva

```sql
create table area (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  codigo    text not null,              -- FIJA | PPR | DIGITAL
  nombre    text not null,
  lider_id  uuid references usuario(id),
  color     text,                       -- para el Kanban
  activo    boolean not null default true,
  unique (tenant_id, codigo)
);

-- Enrutamiento automático de la orden
alter table servicio         add column area_id uuid references area(id);
-- El área se fija a nivel de línea y de tarea (soporta órdenes mixtas)
alter table detalle_trabajo  add column area_id uuid references area(id);
alter table tarea_produccion add column area_id uuid references area(id);
-- Procesos y flujos pertenecen a un área
alter table proceso          add column area_id uuid references area(id);
alter table flujo_produccion add column area_id uuid references area(id);

-- Área principal del técnico y áreas en las que puede apoyar
alter table usuario add column area_id uuid references area(id);

create table usuario_area_apoyo (
  usuario_id uuid references usuario(id) on delete cascade,
  area_id    uuid references area(id) on delete cascade,
  primary key (usuario_id, area_id)
);
```

### 7.2 Un usuario, varios roles

```sql
-- Sustituye a la columna usuario.rol
create table usuario_rol (
  tenant_id  uuid not null references tenant(id) on delete cascade,
  usuario_id uuid not null references usuario(id) on delete cascade,
  rol        rol_sistema not null,
  area_id    uuid references area(id),   -- ámbito: null = todo el laboratorio
  primary key (usuario_id, rol)
);
```

El enum `rol_sistema` se reduce a los roles reales:
`administrador · gerencia · lider_laboratorio · recepcion · lider_area · tecnico · portal_cliente`

Las funciones `current_rol()` y `tiene_permiso()` pasan a evaluar **el conjunto** de roles del usuario: el permiso se concede si **algún** rol lo otorga.

### 7.3 Ámbito por área en RLS

```sql
-- Un líder de área solo ve las tareas de su área
create policy tarea_por_area on tarea_produccion
for select using (
  tenant_id = current_tenant_id()
  and (
    tiene_rol('administrador','gerencia','lider_laboratorio')
    or (tiene_rol('lider_area') and area_id = any(areas_del_usuario()))
    or (tiene_rol('tecnico')    and tecnico_id = auth.uid())
  )
);
```

### 7.4 Consecuencias en el resto de la documentación

| Documento | Cambio | Estado |
|---|---|---|
| `04-fases-y-mvp.md` | El backlog del MVP suma dos historias: configuración de áreas, y Kanban filtrado por área. +8 puntos | ✅ **Aplicado** en la v2.0. Se aplicó también el rol N:M (+3 pts) y el área obligatoria por servicio (+2 pts) |
| `06-brief-claude-design.md` | El Kanban necesita selector y código de color por área; la pantalla del Líder de Área es una vista distinta de la del Líder de Laboratorio | ✅ **Resuelto** en el prototipo (`docs/prototipo/`): el Kanban agrupa por área y el rol cambia la navegación y el dashboard |
| Anexo SQL | Aplicar 7.1, 7.2 y 7.3 en una migración `0004_areas_y_roles.sql` | ⏳ Pendiente. Programado en el entregable 0.2 de la Fase 0 |

---

## 8. Competencias (skills) de los técnicos

Distinto de los permisos: un técnico puede tener acceso a una etapa sin estar capacitado para ella. Las competencias alimentan la asignación sugerida por el Líder de Área.

| Código | Competencia | Área | Procesos que habilita |
|---|---|---|---|
| `MODELOS` | Modelos y yesos | Ambas | Vaciado, zocalado, articulado |
| `ENCERADO` | Encerado | Fija | Encerado diagnóstico y de estructura |
| `CAD` | Diseño digital | Fija | Diseño CAD, escaneo, preparación de STL |
| `CAM` | Manufactura digital | Fija | Fresado, impresión 3D, sinterizado |
| `CERAMICA` | Ceramista | Fija | Estratificación, caracterización, glaseado |
| `METAL` | Metalurgia | Ambas | Colado, soldadura, ajuste de estructura |
| `IMPLANTES` | Implantología | Fija | Estructuras sobre implante, pilares |
| `ESQUELETICO` | Diseño de esqueleto | PPR | Diseño y colado de estructura Cr‑Co |
| `MONTAJE` | Montaje de dientes | PPR | Enfilado, prueba en cera, articulado |
| `ACRILICO` | Acrílicos | PPR | Acrilizado, removible, reparaciones |
| `ACABADO` | Acabado y pulido | Ambas | Pulido, brillo, control dimensional |

Cada competencia se registra con nivel **1** (aprendiz), **2** (autónomo) o **3** (referente).

```sql
create table competencia (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  codigo text not null, nombre text not null,
  area_id uuid references area(id),
  unique (tenant_id, codigo)
);

create table competencia_proceso (
  competencia_id uuid references competencia(id) on delete cascade,
  proceso_id     uuid references proceso(id) on delete cascade,
  primary key (competencia_id, proceso_id)
);

create table competencia_tecnico (
  tenant_id      uuid not null references tenant(id) on delete cascade,
  usuario_id     uuid references usuario(id) on delete cascade,
  competencia_id uuid references competencia(id) on delete cascade,
  nivel          smallint not null check (nivel between 1 and 3),
  certificado_en date,
  primary key (usuario_id, competencia_id)
);
```

**Para qué sirve:**
- **Sugerir asignación** — el sistema propone al técnico con la competencia requerida, nivel suficiente y menor carga.
- **Alertar, no bloquear** — asignar a un técnico sin la competencia genera una advertencia; el Líder de Área puede tener sus motivos.
- **Analizar retrabajos** — cruzar no conformidades con la competencia y el nivel del técnico revela dónde falta capacitación.
- **Planificar respaldo** — identifica competencias con un solo técnico capacitado: si falta esa persona, el área se detiene.

**Algoritmo de asignación sugerida:**

```
candidatos = técnicos activos del área (o habilitados como apoyo)
  con la competencia que exige el proceso
  y nivel >= nivel mínimo del servicio

ordenar por:  1. menor carga pendiente (horas asignadas)
              2. mayor nivel en la competencia
              3. menor desvío histórico (horas reales vs estimadas)
              4. menor tasa de retrabajo imputable

devolver los 3 primeros; el Líder de Área decide
```

El sistema **sugiere, no impone**. Un algoritmo que asigna solo y se equivoca pierde la confianza del líder en una semana.

---

## 9. Trazabilidad actor ↔ caso de uso

| Caso de uso | Actor principal | Actores secundarios |
|---|---|---|
| CU‑001 Iniciar sesión | Todos | — |
| CU‑002/003 Registrar cliente y doctor | Recepción | Administrador (condiciones comerciales) |
| CU‑004 Registrar paciente | Recepción | — |
| CU‑005 Registrar trabajo dental | Recepción | Gerente (autorización de crédito) |
| CU‑006 Adjuntar archivos | Recepción | Técnico |
| CU‑007 Asignar técnico | **Líder de Área** | Líder de Laboratorio |
| CU‑008 Cambiar estado | Líder de Área | Recepción |
| CU‑009 Completar tarea | Técnico | Líder de Área |
| CU‑010 Consumir material | Técnico | Líder de Laboratorio |
| CU‑011 Control de calidad | Líder de Área | Líder de Laboratorio |
| CU‑012 Registrar retrabajo | Líder de Área | Líder de Laboratorio, Gerente |
| CU‑013 Registrar entrega | Recepción | — |
| CU‑014 Generar factura | Recepción | Administrador |
| CU‑015 Registrar pago | Recepción | Administrador |
| CU‑016 Registrar gestión de cobranza | Recepción | Gerente |
| CU‑017 Registrar promesa | Recepción | — |
| CU‑018/019 Compras | Líder de Laboratorio | Gerente (aprobación) |
| CU‑020 Consultar dashboard | Gerente General | Todos |
| **CU‑021 Configurar áreas y flujos** *(nuevo)* | Administrador | Líder de Laboratorio |
| **CU‑022 Mover trabajo entre áreas** *(nuevo)* | Líder de Laboratorio | — |
