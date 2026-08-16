-- ═══════════════════════════════════════════════════════════════════════
-- MEFLAB · 0002_operacion
-- Lo que necesita el MVP (Fase 1): comercial, catálogo, producción y
-- entregas. Calidad, retrabajos, inventario y compras son Fase 3 y viven
-- en 0004 — no se escribe hoy un esquema que no se usará en seis meses.
--
-- Decisiones que este archivo implementa:
--   D-01  cliente es el sujeto comercial; el doctor es su contacto
--   D-03  el catálogo almacena valor de venta SIN IGV
--   D-04  detalle_trabajo (venta) y tarea_produccion (producción) separados
--   D-06  area_id con el área por defecto del laboratorio
--   D-07  cada lista declara si captura con IGV; se normaliza al guardar
--   M-01  estados configurables mapeados a una fase canónica
--   M-08  la pieza dental es notación FDI validada, no texto libre
--   M-09  el color es catálogo cerrado, no texto libre
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · TIPOS ─────────────────────────────────────────────────────────

create type tipo_cliente as enum ('clinica', 'doctor_independiente');

create type afectacion_tributaria as enum ('gravado', 'exonerado', 'inafecto');

-- M-01: el laboratorio puede renombrar o añadir estados, pero cada uno se
-- mapea a una fase canónica para que los KPI sigan funcionando.
create type fase_canonica as enum ('inicial', 'productiva', 'control', 'final', 'anulada');

create type prioridad_trabajo as enum ('normal', 'urgente');

create type estado_tarea as enum ('sin_asignar', 'asignada', 'en_curso', 'completa', 'anulada');

create type tipo_recepcion as enum ('impresion_fisica', 'archivo_stl', 'modelo', 'otro');

-- ── 2 · FUNCIÓN AUXILIAR: área por defecto ────────────────────────────
-- D-06. Mientras el laboratorio no defina sus áreas, todo cae en GENERAL.

create or replace function public.area_default(p_tenant uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select id from public.area
   where tenant_id = p_tenant and es_default
   limit 1;
$$;

-- ── 3 · COMERCIAL ─────────────────────────────────────────────────────
-- D-01: se factura y se cobra al CLIENTE. El doctor pide el trabajo pero
-- nunca es sujeto de crédito. Un doctor independiente es un cliente con un
-- único doctor asociado; la UI oculta esa dualidad.

create table public.cliente (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  tipo              tipo_cliente not null,
  razon_social      text not null,
  tipo_documento    text not null default 'RUC',
  numero_documento  text not null,
  direccion         text,
  email             text,
  telefono          text,
  dias_credito      integer not null default 0,
  linea_credito     numeric(12,2),
  lista_precio_id   uuid,
  bloqueado         boolean not null default false,
  motivo_bloqueo    text,
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  created_by        uuid,
  updated_at        timestamptz not null default now(),
  updated_by        uuid,
  unique (tenant_id, tipo_documento, numero_documento),
  constraint cliente_dias_credito_no_negativo check (dias_credito >= 0),
  constraint cliente_linea_no_negativa check (linea_credito is null or linea_credito >= 0)
);

comment on table public.cliente is
  'A quién se factura y se cobra (D-01). NO tiene columna de deuda: la deuda se lee de v_cartera.';

create table public.doctor (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  cliente_id     uuid not null references public.cliente(id) on delete restrict,
  nombre         text not null,
  colegiatura    text,
  especialidad   text,
  email          text,
  telefono       text,
  sede_entrega   text,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);

create index doctor_cliente_idx on public.doctor (cliente_id);

comment on column public.doctor.cliente_id is
  'Obligatorio (D-01). Un doctor siempre pertenece a un cliente, aunque sea uno creado automáticamente para él.';

-- RN-002: paciente simplificado, sólo nombre, para no frenar el registro
-- de la orden en el mostrador.
create table public.paciente (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  nombre            text not null,
  tipo_documento    text,
  numero_documento  text,
  fecha_nacimiento  date,
  simplificado      boolean not null default false,
  created_at        timestamptz not null default now(),
  created_by        uuid,
  updated_at        timestamptz not null default now(),
  updated_by        uuid,
  -- Un paciente completo trae documento; el simplificado, sólo el nombre.
  -- Y el número sin el tipo no sirve para nada: no se sabe qué validar ni
  -- qué imprimir en el comprobante.
  constraint paciente_completo_tiene_documento
    check (simplificado or (tipo_documento is not null and numero_documento is not null)),
  constraint paciente_documento_completo
    check (num_nulls(tipo_documento, numero_documento) <> 1)
);

-- ── 4 · CATÁLOGO Y TARIFAS ────────────────────────────────────────────

create table public.categoria_servicio (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenant(id) on delete cascade,
  nombre     text not null,
  orden      integer not null default 0,
  activo     boolean not null default true,
  unique (tenant_id, nombre)
);

create table public.servicio (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  categoria_id  uuid references public.categoria_servicio(id),
  area_id       uuid not null references public.area(id),
  codigo        text not null,
  nombre        text not null,
  -- Lo que se TECLEÓ, en el modo de captura de la lista por defecto. Es el
  -- dato que el laboratorio reconoce como suyo, y el que se le vuelve a
  -- enseñar al editar.
  precio_capturado numeric(12,2) not null,
  -- D-03: SIEMPRE valor de venta sin IGV. DERIVADO del anterior por
  -- `tg_normalizar_precio`; escribirlo a mano no sirve de nada, el trigger
  -- lo recalcula. Que sea derivado es lo que hace que guardar dos veces no
  -- vuelva a dividir.
  precio_base   numeric(12,2) not null default 0,
  afectacion    afectacion_tributaria not null default 'gravado',
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  unique (tenant_id, codigo),
  constraint servicio_precio_no_negativo check (precio_capturado >= 0)
);

comment on column public.servicio.area_id is
  'Obligatorio. Hasta que el laboratorio defina sus áreas apunta a GENERAL (D-06); es lo que enrutará la orden.';
comment on column public.servicio.precio_base is
  'Valor de venta SIN IGV, siempre. DERIVADO de precio_capturado: lo escribe tg_normalizar_precio, no la aplicación.';

-- D-07: el modo de captura es un atributo de la LISTA, no del servicio.
-- Así conviven listas capturadas con y sin IGV y no hay que decidir nada
-- antes de cargar el catálogo.
create table public.lista_precio (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenant(id) on delete cascade,
  nombre                text not null,
  precios_incluyen_igv  boolean not null default false,
  es_default            boolean not null default false,
  activo                boolean not null default true,
  created_at            timestamptz not null default now(),
  created_by            uuid,
  updated_at            timestamptz not null default now(),
  updated_by            uuid,
  unique (tenant_id, nombre),
  -- La lista por defecto es la que se aplica a un cliente sin lista
  -- asignada. Desactivarla dejaría al laboratorio sin saber en qué modo
  -- se capturan los precios: primero se nombra otra, luego se retira ésta.
  constraint lista_precio_default_activa check (activo or not es_default)
);

create unique index lista_precio_default_unica
  on public.lista_precio (tenant_id) where es_default;

comment on column public.lista_precio.precios_incluyen_igv is
  'Cómo se CAPTURAN los precios de esta lista. Lo almacenado es siempre sin IGV (D-07).';

create table public.lista_precio_item (
  lista_precio_id  uuid not null references public.lista_precio(id) on delete cascade,
  servicio_id      uuid not null references public.servicio(id) on delete cascade,
  tenant_id        uuid not null references public.tenant(id) on delete cascade,
  -- Lo tecleado, en el modo de captura de ESTA lista.
  precio_capturado numeric(12,2) not null,
  -- Derivado. Ver el comentario de servicio.precio_base.
  precio           numeric(12,2) not null default 0,
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  primary key (lista_precio_id, servicio_id),
  constraint lista_precio_item_no_negativo check (precio_capturado >= 0)
);

alter table public.cliente
  add constraint cliente_lista_precio_fk
  foreign key (lista_precio_id) references public.lista_precio(id);

create table public.precio_historial (
  id            bigserial primary key,
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  servicio_id   uuid not null references public.servicio(id) on delete cascade,
  lista_precio_id uuid references public.lista_precio(id) on delete cascade,
  precio_antes  numeric(12,2),
  precio_despues numeric(12,2) not null,
  cambiado_en   timestamptz not null default now(),
  cambiado_por  uuid
);

create index precio_historial_servicio_idx
  on public.precio_historial (servicio_id, cambiado_en desc);

-- M-09: el color es catálogo cerrado. Es el segundo motivo de retrabajo
-- más frecuente en laboratorios dentales.
create table public.escala_color (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenant(id) on delete cascade,
  nombre     text not null,
  activo     boolean not null default true,
  unique (tenant_id, nombre)
);

create table public.color (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  escala_id      uuid not null references public.escala_color(id) on delete cascade,
  codigo         text not null,
  hex            text,
  orden          integer not null default 0,
  unique (escala_id, codigo)
);

-- M-08: la validación FDI vive en una función, no repetida en cada CHECK.
-- Cuadrantes 1-4, piezas 1-8 → 11..18, 21..28, 31..38, 41..48.
create or replace function public.piezas_fdi_validas(p_piezas text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_piezas is null
      or not exists (
           select 1 from unnest(p_piezas) x where x !~ '^[1-4][1-8]$'
         );
$$;

comment on function public.piezas_fdi_validas is
  'Notación FDI 11-48. Rechaza 19, 09, 51 o cualquier texto libre: el error de transcripción es la causa más común de retrabajo (RF-071).';

-- ── 5 · PRODUCCIÓN: PROCESOS, FLUJOS Y ESTADOS ────────────────────────

create table public.proceso (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  area_id        uuid not null references public.area(id),
  codigo         text not null,
  nombre         text not null,
  horas_estimadas numeric(6,2) not null default 0,
  activo         boolean not null default true,
  unique (tenant_id, codigo),
  constraint proceso_horas_no_negativas check (horas_estimadas >= 0)
);

create table public.flujo_produccion (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenant(id) on delete cascade,
  area_id    uuid not null references public.area(id),
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (tenant_id, nombre)
);

create table public.flujo_etapa (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenant(id) on delete cascade,
  flujo_id    uuid not null references public.flujo_produccion(id) on delete cascade,
  proceso_id  uuid not null references public.proceso(id),
  orden       integer not null,
  obligatoria boolean not null default true,
  unique (flujo_id, orden)
);

comment on table public.flujo_etapa is
  'Plantilla de etapas. Se instancia en tarea_produccion al crear la orden; cambiarla no afecta a órdenes en curso.';

alter table public.servicio
  add column flujo_id uuid references public.flujo_produccion(id);

-- M-01: estados configurables por laboratorio, cada uno mapeado a una fase
-- canónica para que los KPI sobrevivan a que se renombren o se añadan.
create table public.estado_trabajo (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenant(id) on delete cascade,
  codigo     text not null,
  nombre     text not null,
  fase       fase_canonica not null,
  orden      integer not null default 0,
  glifo      text,
  color      text,
  activo     boolean not null default true,
  unique (tenant_id, codigo)
);

comment on column public.estado_trabajo.glifo is
  'El glifo sostiene el significado; el color sólo refuerza. Así el tablero se lee impreso en gris y con daltonismo.';

-- ── 6 · ORDEN DE TRABAJO ──────────────────────────────────────────────

create table public.orden_trabajo (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  sede_id           uuid references public.sede(id),
  codigo            text not null,
  cliente_id        uuid not null references public.cliente(id) on delete restrict,
  doctor_id         uuid not null references public.doctor(id) on delete restrict,
  paciente_id       uuid not null references public.paciente(id) on delete restrict,
  estado_id         uuid not null references public.estado_trabajo(id),
  prioridad         prioridad_trabajo not null default 'normal',
  tipo_recepcion    tipo_recepcion not null default 'impresion_fisica',
  fecha_recepcion   timestamptz not null default now(),
  fecha_comprometida date not null,
  fecha_entrega     timestamptz,
  indicaciones      text,
  created_at        timestamptz not null default now(),
  created_by        uuid,
  updated_at        timestamptz not null default now(),
  updated_by        uuid,
  unique (tenant_id, codigo)
);

create index orden_trabajo_estado_idx on public.orden_trabajo (tenant_id, estado_id);
create index orden_trabajo_fecha_idx on public.orden_trabajo (tenant_id, fecha_comprometida);
create index orden_trabajo_cliente_idx on public.orden_trabajo (cliente_id);

comment on table public.orden_trabajo is
  'D-02: NO tiene columna de saldo ni de deuda. Un trabajo entregado y no facturado no genera deuda.';

-- D-04, mitad de venta: qué se cobra.
create table public.detalle_trabajo (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  orden_id      uuid not null references public.orden_trabajo(id) on delete cascade,
  servicio_id   uuid not null references public.servicio(id) on delete restrict,
  area_id       uuid not null references public.area(id),
  cantidad      numeric(8,2) not null default 1,
  precio_unitario numeric(12,2) not null,
  afectacion    afectacion_tributaria not null default 'gravado',
  -- M-08: notación FDI validada, no texto libre. Reduce el error de
  -- transcripción, que es la causa más común de retrabajo por
  -- "información incorrecta" (RF-071).
  piezas_fdi    text[] not null default '{}',
  color_id      uuid references public.color(id),
  arcada        text,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  constraint detalle_cantidad_positiva check (cantidad > 0),
  constraint detalle_precio_no_negativo check (precio_unitario >= 0),
  constraint detalle_piezas_fdi_validas check (public.piezas_fdi_validas(piezas_fdi))
);

create index detalle_trabajo_orden_idx on public.detalle_trabajo (orden_id);

comment on column public.detalle_trabajo.piezas_fdi is
  'Piezas en notación FDI 11-48. La restricción rechaza cualquier código fuera de ese rango.';

-- D-04, mitad de producción: qué se hace. El avance del kanban se calcula
-- sobre esta tabla; el importe, sobre detalle_trabajo.
create table public.tarea_produccion (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  orden_id          uuid not null references public.orden_trabajo(id) on delete cascade,
  proceso_id        uuid not null references public.proceso(id),
  area_id           uuid not null references public.area(id),
  tecnico_id        uuid references public.usuario(id),
  orden_etapa       integer not null,
  estado            estado_tarea not null default 'sin_asignar',
  fecha_programada  date,
  iniciada_en       timestamptz,
  terminada_en      timestamptz,
  horas_estimadas   numeric(6,2) not null default 0,
  horas_reales      numeric(6,2) generated always as (
    case when iniciada_en is not null and terminada_en is not null
      then round(extract(epoch from (terminada_en - iniciada_en)) / 3600.0, 2)
      else null end
  ) stored,
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid,
  unique (orden_id, orden_etapa),
  constraint tarea_fin_despues_de_inicio
    check (terminada_en is null or iniciada_en is null or terminada_en >= iniciada_en),
  constraint tarea_completa_tiene_tiempos
    check (estado <> 'completa' or (iniciada_en is not null and terminada_en is not null))
);

create index tarea_produccion_tecnico_idx
  on public.tarea_produccion (tecnico_id, estado);
create index tarea_produccion_orden_idx
  on public.tarea_produccion (orden_id, orden_etapa);

comment on constraint tarea_completa_tiene_tiempos on public.tarea_produccion is
  'Una etapa no puede darse por completa sin inicio y fin. Es lo que sostiene los KPI 02, 08 y 09.';

create table public.orden_estado_historial (
  id           bigserial primary key,
  tenant_id    uuid not null references public.tenant(id) on delete cascade,
  orden_id     uuid not null references public.orden_trabajo(id) on delete cascade,
  estado_antes uuid references public.estado_trabajo(id),
  estado_despues uuid not null references public.estado_trabajo(id),
  motivo       text,
  ocurrido_en  timestamptz not null default now(),
  usuario_id   uuid
);

create index orden_estado_historial_idx
  on public.orden_estado_historial (orden_id, ocurrido_en desc);

create table public.archivo (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenant(id) on delete cascade,
  orden_id    uuid references public.orden_trabajo(id) on delete cascade,
  bucket      text not null,
  ruta        text not null,
  nombre      text not null,
  tipo_mime   text,
  bytes       bigint,
  subido_en   timestamptz not null default now(),
  subido_por  uuid,
  unique (bucket, ruta)
);

comment on column public.archivo.ruta is
  'Convención {tenant_id}/{orden_id}/{uuid}-{nombre}. El tenant_id como primer segmento es lo que hace efectiva la política de Storage.';

create table public.entrega (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  orden_id       uuid not null references public.orden_trabajo(id) on delete cascade,
  entregado_en   timestamptz not null default now(),
  receptor       text not null,
  metodo         text not null,
  evidencia_id   uuid references public.archivo(id),
  observaciones  text,
  created_by     uuid,
  unique (orden_id)
);

comment on table public.entrega is
  'Toda entrega exige receptor, método y evidencia. Sin evidencia no se puede cerrar.';

-- ── 7 · FUNCIONES DE NEGOCIO ──────────────────────────────────────────

-- D-07. La normalización ocurre UNA VEZ, al guardar. Un precio almacenado
-- ya está limpio; nunca se normaliza al leer.
create or replace function public.normalizar_valor_venta(
  p_precio       numeric,
  p_incluye_igv  boolean,
  p_tasa_igv     numeric default 0.18
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(
    case when p_incluye_igv then p_precio / (1 + p_tasa_igv) else p_precio end,
    2
  );
$$;

comment on function public.normalizar_valor_venta is
  'S/ 660.80 capturado con IGV incluido → S/ 560.00 almacenado. Redondeo a 2 decimales por línea (D-03).';

-- La tasa vigente del laboratorio. Vive en configuracion porque cambia
-- por ley, no por código: en Perú ya pasó del 19 % al 18 %.
create or replace function public.tasa_igv(p_tenant uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select (valor ->> 'tasa')::numeric
       from public.configuracion
      where tenant_id = p_tenant and clave = 'igv'),
    0.18
  );
$$;

comment on function public.tasa_igv is
  'Tasa de IGV del laboratorio, de configuracion. 0.18 si no está configurada.';

-- RF-095: correlativos sin salto. El lock de fila serializa a los
-- solicitantes concurrentes; emitir dos documentos a la vez no puede
-- producir el mismo número.
create or replace function public.siguiente_correlativo(
  p_tenant uuid,
  p_tipo_doc text,
  p_serie text
)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_siguiente integer;
begin
  update public.serie
     set correlativo = correlativo + 1,
         updated_at = now()
   where tenant_id = p_tenant
     and tipo_doc = p_tipo_doc
     and serie = p_serie
     and activo
  returning correlativo into v_siguiente;

  if v_siguiente is null then
    raise exception 'No existe la serie % del tipo % para el laboratorio %',
      p_serie, p_tipo_doc, p_tenant;
  end if;

  return v_siguiente;
end;
$$;

-- RF-040: el código de orden se unifica en OT-AAAA-NNNNNN.
create or replace function public.generar_codigo_orden(p_tenant uuid)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_anio text := to_char(now() at time zone 'America/Lima', 'YYYY');
  v_n integer;
begin
  v_n := public.siguiente_correlativo(p_tenant, 'OT', v_anio);
  return 'OT-' || v_anio || '-' || lpad(v_n::text, 6, '0');
end;
$$;

-- Instancia las etapas del flujo al crear la orden (D-04). Se llama desde
-- la Server Action que crea la orden, dentro de la misma transacción.
create or replace function public.instanciar_etapas(p_orden uuid)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_creadas integer;
begin
  insert into public.tarea_produccion (
    tenant_id, orden_id, proceso_id, area_id, orden_etapa, horas_estimadas, estado
  )
  select distinct on (fe.orden)
    o.tenant_id, o.id, fe.proceso_id, p.area_id, fe.orden, p.horas_estimadas, 'sin_asignar'
  from public.orden_trabajo o
  join public.detalle_trabajo d on d.orden_id = o.id
  join public.servicio s on s.id = d.servicio_id
  join public.flujo_etapa fe on fe.flujo_id = s.flujo_id
  join public.proceso p on p.id = fe.proceso_id
  where o.id = p_orden
  order by fe.orden
  on conflict (orden_id, orden_etapa) do nothing;

  get diagnostics v_creadas = row_count;
  return v_creadas;
end;
$$;

comment on function public.instanciar_etapas is
  'Sin etapas instanciadas el Kanban es decorativo y los KPI 02, 08 y 09 no existen (D-04).';

-- ── 8 · TRIGGERS ──────────────────────────────────────────────────────

-- El área de la línea y de la tarea se hereda del servicio: es lo que
-- enrutará la orden cuando el laboratorio defina sus áreas (D-06).
create or replace function public.tg_detalle_hereda_area()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.area_id is null then
    select area_id into new.area_id from public.servicio where id = new.servicio_id;
  end if;
  return new;
end;
$$;

create trigger detalle_trabajo_area
  before insert on public.detalle_trabajo
  for each row execute function public.tg_detalle_hereda_area();

-- Todo cambio de estado deja rastro, sin depender de que la aplicación se
-- acuerde de escribirlo.
-- security definer a propósito: orden_estado_historial es @append-only y
-- `authenticated` no tiene INSERT sobre ella. Sin esto, el trigger dejaría
-- de escribir en cuanto lo ejecutara un usuario real en vez de postgres.
create or replace function public.tg_orden_historial_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.estado_id is distinct from old.estado_id then
    insert into public.orden_estado_historial (
      tenant_id, orden_id, estado_antes, estado_despues, usuario_id
    ) values (
      new.tenant_id, new.id,
      case when tg_op = 'UPDATE' then old.estado_id else null end,
      new.estado_id, auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger orden_trabajo_historial
  after insert or update of estado_id on public.orden_trabajo
  for each row execute function public.tg_orden_historial_estado();

-- D-07 · la normalización ocurre AQUÍ, al guardar, y en ningún otro sitio.
--
-- Lo que se almacena es siempre valor de venta sin IGV (regla 5). Lo que
-- cambia es cómo lo teclea el laboratorio: hay listas pactadas con el
-- precio "a todo costo" y listas pactadas sin IGV, y obligar a convertir
-- a mano garantiza que tarde o temprano alguien guarde 660.80 donde
-- debían ir 560.00.
--
-- Va en un trigger y no en la Server Action porque un precio mal
-- normalizado no se nota: no falla nada, simplemente el laboratorio cobra
-- un 18 % de menos durante meses.
--
-- El precio base del servicio es el de la lista por defecto: es la que se
-- aplica a un cliente que no tiene ninguna asignada.
--
-- CLAVE: el precio de venta se DERIVA de `precio_capturado` en cada
-- escritura, en vez de convertir en sitio la columna que llega. Convertir
-- en sitio parece equivalente y no lo es: un `insert ... on conflict do
-- update` dispara el trigger DOS veces sobre la misma fila —una por la
-- inserción y otra por el update— y la segunda vuelve a dividir un valor
-- ya dividido. S/ 708.00 acababan siendo S/ 508.47 en lugar de S/ 600.00.
-- Derivar siempre del mismo origen hace que escribir dos veces dé lo
-- mismo que escribir una.
create or replace function public.tg_normalizar_precio()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_incluye boolean;
begin
  if tg_table_name = 'servicio' then
    select l.precios_incluyen_igv into v_incluye
      from public.lista_precio l
     where l.tenant_id = new.tenant_id and l.es_default;

    new.precio_base := public.normalizar_valor_venta(
      new.precio_capturado, coalesce(v_incluye, false), public.tasa_igv(new.tenant_id)
    );
  else
    select l.precios_incluyen_igv into v_incluye
      from public.lista_precio l
     where l.id = new.lista_precio_id;

    new.precio := public.normalizar_valor_venta(
      new.precio_capturado, coalesce(v_incluye, false), public.tasa_igv(new.tenant_id)
    );
  end if;

  return new;
end;
$$;

-- Sin lista de columnas: si alguien tocara `precio_base` a mano, el
-- trigger lo devuelve a su valor derivado en vez de dejarlo desviarse.
create trigger servicio_normalizar_precio
  before insert or update on public.servicio
  for each row execute function public.tg_normalizar_precio();

create trigger lista_precio_item_normalizar
  before insert or update on public.lista_precio_item
  for each row execute function public.tg_normalizar_precio();

-- Cambiar el modo de captura de una lista NO cambia lo que vale un
-- servicio: cambia cómo se escribe esa misma cifra. Así que lo que se
-- recalcula es lo capturado, dejando fijo el valor de venta.
--
-- Al revés —dejar fijo lo capturado y recalcular el valor de venta— una
-- preferencia de visualización repreciaría en silencio toda la tarifa.
create or replace function public.tg_lista_modo_capturado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tasa numeric := public.tasa_igv(new.tenant_id);
begin
  update public.lista_precio_item i
     set precio_capturado = round(
           case when new.precios_incluyen_igv then i.precio * (1 + v_tasa) else i.precio end, 2)
   where i.lista_precio_id = new.id;

  if new.es_default then
    update public.servicio s
       set precio_capturado = round(
             case when new.precios_incluyen_igv then s.precio_base * (1 + v_tasa) else s.precio_base end, 2)
     where s.tenant_id = new.tenant_id;
  end if;

  return null;
end;
$$;

create trigger lista_precio_modo_capturado
  after update on public.lista_precio
  for each row when (
    old.precios_incluyen_igv is distinct from new.precios_incluyen_igv
    -- Al nombrar por defecto una lista con otro modo, el precio base del
    -- catálogo pasa a capturarse en ese modo.
    or (new.es_default and not old.es_default)
  )
  execute function public.tg_lista_modo_capturado();

-- Hay exactamente UNA lista por defecto, y el índice parcial
-- `lista_precio_default_unica` lo garantiza. Pero un índice único sólo
-- sabe decir que no: sin esto, marcar una lista nueva como la de defecto
-- fallaría con un error de clave duplicada y obligaría a la aplicación a
-- hacer dos escrituras — con la ventana de quedarse sin ninguna por
-- defecto si la segunda falla, y sin lista por defecto no se sabe en qué
-- modo se capturan los precios.
create or replace function public.tg_lista_default_unica()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.es_default then
    update public.lista_precio
       set es_default = false
     where tenant_id = new.tenant_id
       and id <> new.id
       and es_default;
  end if;
  return new;
end;
$$;

create trigger lista_precio_default
  before insert or update of es_default on public.lista_precio
  for each row when (new.es_default) execute function public.tg_lista_default_unica();

-- Todo cambio de precio deja rastro, con autor y fecha.
--
-- Sin esto, subir una tarifa es indistinguible de un dedazo: el precio
-- nuevo simplemente sustituye al viejo y nadie puede responder "¿desde
-- cuándo cuesta esto?" — que es la pregunta que llega cuando un doctor
-- reclama una factura.
--
-- security definer por lo mismo que el historial de estados:
-- precio_historial es @append-only y `authenticated` no tiene INSERT.
create or replace function public.tg_precio_historial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes    numeric(12,2);
  v_despues  numeric(12,2);
  v_servicio uuid;
  v_lista    uuid;
begin
  if tg_table_name = 'servicio' then
    v_servicio := new.id;
    v_lista    := null;
    v_antes    := case when tg_op = 'UPDATE' then old.precio_base end;
    v_despues  := new.precio_base;
  else
    v_servicio := new.servicio_id;
    v_lista    := new.lista_precio_id;
    v_antes    := case when tg_op = 'UPDATE' then old.precio end;
    v_despues  := new.precio;
  end if;

  -- Un update que no toca el precio no es un cambio de precio.
  if tg_op = 'UPDATE' and v_antes is not distinct from v_despues then
    return new;
  end if;

  insert into public.precio_historial (
    tenant_id, servicio_id, lista_precio_id,
    precio_antes, precio_despues, cambiado_por
  ) values (
    new.tenant_id, v_servicio, v_lista, v_antes, v_despues, auth.uid()
  );

  return new;
end;
$$;

-- Sin lista de columnas: el precio de venta lo escribe el trigger BEFORE a
-- partir de `precio_capturado`, así que `update of precio_base` no llegaría
-- a dispararse nunca. La función ya descarta los updates que no mueven el
-- precio, así que no hay ruido.
create trigger servicio_precio_historial
  after insert or update on public.servicio
  for each row execute function public.tg_precio_historial();

create trigger lista_precio_item_historial
  after insert or update on public.lista_precio_item
  for each row execute function public.tg_precio_historial();

do $$
declare t text;
begin
  foreach t in array array[
    'cliente','doctor','paciente','servicio','lista_precio','flujo_produccion',
    'orden_trabajo','tarea_produccion'
  ]
  loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.tg_touch_updated_at();', t);
  end loop;

  -- Se audita lo que mueve dinero o responsabilidad.
  foreach t in array array['cliente','servicio','lista_precio_item','orden_trabajo','entrega']
  loop
    execute format(
      'create trigger %1$s_auditar after insert or update or delete on public.%1$s
         for each row execute function public.tg_auditar();', t);
  end loop;
end;
$$;

-- ── 9 · RLS ───────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'cliente','doctor','paciente','categoria_servicio','servicio','lista_precio',
    'lista_precio_item','precio_historial','escala_color','color','proceso',
    'flujo_produccion','flujo_etapa','estado_trabajo','orden_trabajo',
    'detalle_trabajo','tarea_produccion','orden_estado_historial','archivo','entrega'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- Lectura: todo lo del propio laboratorio.
    execute format($f$
      create policy %1$s_lectura on public.%1$s
        for select using (tenant_id = public.current_tenant_id());
    $f$, t);
  end loop;
end;
$$;

-- Escritura comercial: Recepción y Administrador.
do $$
declare t text;
begin
  foreach t in array array['cliente','doctor','paciente','orden_trabajo','detalle_trabajo','archivo','entrega']
  loop
    execute format($f$
      create policy %1$s_escritura on public.%1$s
        for all
        using (tenant_id = public.current_tenant_id()
               and public.tiene_rol('recepcion','administrador'))
        with check (tenant_id = public.current_tenant_id()
               and public.tiene_rol('recepcion','administrador'));
    $f$, t);
  end loop;
end;
$$;

-- Configuración del catálogo y de la producción: Administrador.
do $$
declare t text;
begin
  foreach t in array array[
    'categoria_servicio','servicio','lista_precio','lista_precio_item',
    'escala_color','color','proceso','flujo_produccion','flujo_etapa','estado_trabajo'
  ]
  loop
    execute format($f$
      create policy %1$s_escritura on public.%1$s
        for all
        using (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'))
        with check (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'));
    $f$, t);
  end loop;
end;
$$;

-- Las tareas las gestiona quien dirige la producción; el técnico sólo
-- actualiza LAS SUYAS. El líder de área sólo ve su área — hoy inocuo
-- porque el área es única, pero la política ya está puesta (D-06).
create policy tarea_produccion_gestion on public.tarea_produccion
  for all
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.tiene_rol('administrador','lider_laboratorio')
      or (public.tiene_rol('lider_area') and area_id = any(public.areas_del_usuario()))
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (
      public.tiene_rol('administrador','lider_laboratorio')
      or (public.tiene_rol('lider_area') and area_id = any(public.areas_del_usuario()))
    )
  );

create policy tarea_produccion_propia on public.tarea_produccion
  for update
  using (tenant_id = public.current_tenant_id()
         and public.tiene_rol('tecnico')
         and tecnico_id = auth.uid())
  with check (tenant_id = public.current_tenant_id()
         and public.tiene_rol('tecnico')
         and tecnico_id = auth.uid());

-- El historial de estados lo escribe el trigger; nadie lo edita.
-- El de precios, igual.

-- ── 10 · GRANTS ───────────────────────────────────────────────────────
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Los historiales los escribe un trigger security definer; nadie los edita.
comment on table public.orden_estado_historial is
  'Historial de cambios de estado. Lo escribe el trigger, nadie lo edita. @append-only';
comment on table public.precio_historial is
  'Historial de precios con autor y fecha. @append-only';

-- OBLIGATORIO al final de toda migración: el `grant ... on all tables` de
-- arriba acaba de volver a conceder escritura sobre las bitácoras que las
-- migraciones anteriores habían cerrado. Esto lo deshace.
select public.asegurar_append_only();

-- ── 11 · VALIDACIÓN DE DOCUMENTO EN LA BASE ───────────────────────────
-- Regla 7 de CLAUDE.md: la regla vive en la base primero. Un RUC mal
-- tecleado no se detecta al emitir la factura —con el doctor esperando y
-- SUNAT rechazándola— sino al registrar el cliente.
--
-- Módulo 11: los 10 primeros dígitos por los factores 5,4,3,2,7,6,5,4,3,2;
-- 11 menos el resto entre 11, colapsando 10→0 y 11→1.
create or replace function public.ruc_valido(p_ruc text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  factores int[] := array[5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  suma int := 0;
  verificador int;
begin
  -- Los dos primeros dígitos declaran el tipo de contribuyente.
  if p_ruc !~ '^(10|15|17|20)[0-9]{9}$' then
    return false;
  end if;

  for i in 1..10 loop
    suma := suma + (substring(p_ruc from i for 1))::int * factores[i];
  end loop;

  verificador := 11 - (suma % 11);
  if verificador = 10 then verificador := 0; end if;
  if verificador = 11 then verificador := 1; end if;

  return verificador = (substring(p_ruc from 11 for 1))::int;
end;
$$;

comment on function public.ruc_valido is
  'Dígito verificador módulo 11 de SUNAT. Espeja lib/validaciones/documento.ts: si una cambia, la otra también.';

create or replace function public.documento_valido(p_tipo text, p_numero text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'RUC' then public.ruc_valido(p_numero)
    when 'DNI' then p_numero ~ '^[0-9]{8}$' and p_numero <> '00000000'
    -- Carné y pasaporte no tienen formato fijo verificable: exigirles uno
    -- inventado bloquearía clientes legítimos.
    else length(trim(p_numero)) >= 6
  end;
$$;

alter table public.cliente
  add constraint cliente_documento_valido
  check (public.documento_valido(tipo_documento, numero_documento));

-- El paciente puede no traer documento (RN-002), pero si lo trae se valida
-- igual que el del cliente: acaba en el comprobante de la misma forma.
alter table public.paciente
  add constraint paciente_documento_valido
  check (numero_documento is null
         or public.documento_valido(tipo_documento, numero_documento));

-- ── 12 · ALTA DE DOCTOR INDEPENDIENTE ─────────────────────────────────
-- D-01: un doctor independiente es un cliente con un único doctor
-- asociado. La interfaz oculta esa dualidad, pero la facturación la
-- necesita: sin sujeto comercial no hay comprobante.
--
-- Va en una función y no en dos llamadas desde la aplicación porque tiene
-- que ser ATÓMICO. Si el cliente se crea y el doctor falla, queda un
-- cliente fantasma que nadie va a limpiar; al revés es imposible por la
-- clave foránea, pero el fantasma sí ocurre.
--
-- security invoker: se ejecuta con los permisos de quien llama, así que
-- RLS sigue aplicando. Esto NO es una puerta trasera.
create or replace function public.registrar_doctor_independiente(
  p_nombre           text,
  p_tipo_documento   text,
  p_numero_documento text,
  p_colegiatura      text default null,
  p_especialidad     text default null,
  p_email            text default null,
  p_telefono         text default null,
  p_sede_entrega     text default null,
  p_dias_credito     integer default 0,
  p_linea_credito    numeric default null,
  p_lista_precio_id  uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant  uuid := public.current_tenant_id();
  v_cliente uuid;
  v_doctor  uuid;
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  -- El cliente lleva el nombre del propio doctor: para quien usa el
  -- sistema, "Dr. Camacho" es a la vez el doctor y a quien se le factura.
  insert into public.cliente (
    tenant_id, tipo, razon_social, tipo_documento, numero_documento,
    email, telefono, dias_credito, linea_credito, lista_precio_id, created_by
  ) values (
    v_tenant, 'doctor_independiente', p_nombre, p_tipo_documento, p_numero_documento,
    p_email, p_telefono, p_dias_credito, p_linea_credito, p_lista_precio_id, auth.uid()
  )
  returning id into v_cliente;

  insert into public.doctor (
    tenant_id, cliente_id, nombre, colegiatura, especialidad,
    email, telefono, sede_entrega, created_by
  ) values (
    v_tenant, v_cliente, p_nombre, p_colegiatura, p_especialidad,
    p_email, p_telefono, p_sede_entrega, auth.uid()
  )
  returning id into v_doctor;

  return v_doctor;
end;
$$;

comment on function public.registrar_doctor_independiente is
  'Crea cliente + doctor en una sola transacción (D-01). Si algo falla, no queda ningún cliente fantasma.';

-- NO hay índice único de doctor por cliente, y es deliberado: una clínica
-- agrupa VARIOS doctores con una sola deuda — es el caso central de D-01.
-- Un índice sobre doctor(cliente_id) rompería justamente eso.

-- ── 13 · DATOS DEL PACIENTE SEGÚN QUIÉN MIRA ──────────────────────────
-- El paciente es la única persona del sistema que no es cliente nuestro y
-- que no ha consentido nada: llega en la orden de su odontólogo. El
-- técnico necesita saber PARA QUIÉN es el trabajo, no quién es.
--
-- RLS filtra filas, no columnas. Para tapar el documento y la edad hace
-- falta una vista, y tiene que estar en la base: si el filtro viviera en
-- la aplicación, cualquier consulta nueva a `paciente` volvería a
-- destaparlo sin que nadie se diera cuenta (regla 7).
--
-- Y no basta con la vista. El token del técnico es el mismo que usa el
-- navegador contra PostgREST: si la tabla siguiera siendo legible para
-- él, bastaría con pedir `/rest/v1/paciente` para saltarse la vista. Así
-- que la tabla se cierra y la vista queda como ÚNICA puerta de lectura.
--
-- Por eso la vista NO es security_invoker: se ejecuta con los permisos de
-- quien la creó y por tanto tiene que filtrar el laboratorio ella misma.
-- Ese `where` de abajo no es decorativo — sin él, la vista se saltaría el
-- aislamiento entre laboratorios, que es la regla 1.
create or replace view public.v_paciente as
select
  p.id,
  p.tenant_id,
  p.nombre,
  p.simplificado,
  case when public.tiene_rol('recepcion','administrador','gerencia')
       then p.tipo_documento end                                as tipo_documento,
  case when public.tiene_rol('recepcion','administrador','gerencia')
       then p.numero_documento end                              as numero_documento,
  case when public.tiene_rol('recepcion','administrador','gerencia')
       then p.fecha_nacimiento end                              as fecha_nacimiento,
  case when public.tiene_rol('recepcion','administrador','gerencia')
       then extract(year from age(p.fecha_nacimiento))::int end as edad,
  -- Esta bandera es para la interfaz: le permite decir "no tienes permiso
  -- para ver esto" en vez de enseñar un hueco que parece un dato que falta.
  public.tiene_rol('recepcion','administrador','gerencia')       as ve_datos_sensibles,
  p.created_at,
  p.updated_at
from public.paciente p
where p.tenant_id = public.current_tenant_id();

comment on view public.v_paciente is
  'Única puerta de lectura de paciente. Tapa documento y edad a quien no es Recepción, Administrador o Gerencia, y filtra el laboratorio ella misma. Producción y entregas leen de aquí, no de la tabla.';

grant select on public.v_paciente to authenticated, service_role;

-- La tabla deja de ser legible directamente. Recepción, Administrador y
-- Gerencia siguen leyéndola porque la política de escritura es `for all`,
-- y la necesitan para editar. El resto pasa por la vista o no pasa.
drop policy if exists paciente_lectura on public.paciente;
create policy paciente_lectura on public.paciente
  for select using (
    tenant_id = public.current_tenant_id()
    and public.tiene_rol('recepcion','administrador','gerencia')
  );
