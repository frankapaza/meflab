-- ═══════════════════════════════════════════════════════════════════════
-- 0005 · CONTROL Y CALIDAD  (Fase 3)
--
-- Cuatro bloques que se sostienen entre sí:
--
--   CALIDAD    · se inspecciona lo fabricado antes de entregarlo
--   RETRABAJO  · lo que no pasa la inspección se rehace, y eso CUESTA
--   INVENTARIO · lo que se consume al fabricar y al rehacer
--   COSTOS     · materiales + mano de obra + procesos externos
--
-- El orden no es casual: el costo real de un trabajo no se puede calcular
-- sin saber qué material consumió, y el costo de la mala calidad no se
-- puede calcular sin saber qué se rehízo. Por eso van juntos en una sola
-- migración: separarlos daría dos mitades que no responden nada.
--
-- Dos advertencias sobre lo que este archivo NO decide:
--
--   · QUIÉN inspecciona sigue sin decidirlo el laboratorio (decisión
--     abierta, límite semana 21). Aquí se deja como parámetro en
--     `configuracion`, con líder de laboratorio y líder de área por
--     defecto. Cambiarlo será cambiar un dato, no una migración.
--
--   · QUÉ competencias existen tampoco está decidido. El esquema las
--     soporta vacías: sin competencias declaradas, la sugerencia de
--     técnico se degrada a "por carga", que es lo que se hace hoy a mano.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · TIPOS ─────────────────────────────────────────────────────────

-- El resultado de una inspección. 'observado' es el caso real que la
-- mayoría de sistemas olvida: pasa, pero con una salvedad anotada.
create type resultado_inspeccion as enum ('aprobado', 'observado', 'rechazado');

-- De quién es la culpa. No es para señalar personas: es para saber si el
-- retrabajo se le puede facturar al doctor o lo paga el laboratorio.
create type causa_retrabajo as enum (
  'error_laboratorio',    -- lo pagamos nosotros
  'error_impresion',      -- la impresión del doctor vino mal
  'cambio_indicacion',    -- el doctor cambió lo pedido
  'material_defectuoso',  -- reclamable al proveedor
  'ajuste_clinico',       -- ajuste normal en boca, no es culpa de nadie
  'sin_determinar'
);

-- Quién paga el retrabajo. Es la decisión comercial, y se separa de la
-- causa a propósito: un laboratorio puede cubrir por cortesía algo que
-- técnicamente no le corresponde.
create type politica_garantia as enum ('cubierto', 'parcial', 'facturable');

create type tipo_movimiento_stock as enum (
  'entrada',      -- compra o devolución a almacén
  'consumo',      -- se usó en un trabajo
  'merma',        -- se rompió, se venció, se perdió
  'ajuste',       -- corrección tras inventario físico
  'devolucion'    -- vuelve al proveedor
);

-- ── 2 · CONTROL DE CALIDAD ────────────────────────────────────────────
-- El checklist es POR SERVICIO: no se revisa igual una corona que una
-- prótesis total. Un checklist único obliga a marcar «no aplica» en la
-- mitad de los puntos, y un formulario donde la mitad no aplica deja de
-- leerse.

create table public.checklist_calidad (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenant(id) on delete cascade,
  servicio_id uuid references public.servicio(id) on delete cascade,
  area_id     uuid not null references public.area(id),
  nombre      text not null,
  activo      boolean not null default true,

  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,

  -- Un servicio tiene UN checklist activo. Dos serían dos criterios de
  -- calidad para lo mismo, y nadie sabría cuál rige.
  constraint checklist_nombre_no_vacio check (btrim(nombre) <> '')
);

create unique index checklist_uno_activo_por_servicio
  on public.checklist_calidad (tenant_id, servicio_id)
  where activo and servicio_id is not null;

-- El checklist genérico del laboratorio: `servicio_id is null`. Se usa
-- cuando el servicio no tiene el suyo, para que ningún trabajo salga sin
-- revisar por un hueco de configuración.
create unique index checklist_uno_generico
  on public.checklist_calidad (tenant_id)
  where activo and servicio_id is null;

create table public.checklist_punto (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenant(id) on delete cascade,
  checklist_id uuid not null references public.checklist_calidad(id) on delete cascade,
  orden        integer not null,
  descripcion  text not null,
  -- Un punto crítico que falla RECHAZA el trabajo, no lo deja observado.
  -- El ajuste oclusal es crítico; que la caja venga rayada, no.
  critico      boolean not null default false,

  created_at   timestamptz not null default now(),

  unique (checklist_id, orden),
  constraint punto_descripcion_no_vacia check (btrim(descripcion) <> '')
);

create table public.inspeccion (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  orden_id       uuid not null references public.orden_trabajo(id) on delete cascade,
  checklist_id   uuid references public.checklist_calidad(id),
  inspeccionado_por uuid references public.usuario(id),
  inspeccionado_en  timestamptz not null default now(),
  resultado      resultado_inspeccion not null,
  observaciones  text,
  -- La foto vive en Storage; aquí sólo el enlace al archivo ya subido.
  evidencia_id   uuid references public.archivo(id),

  created_at     timestamptz not null default now(),
  created_by     uuid,

  -- Un rechazo sin explicación es un rechazo que nadie puede corregir.
  constraint inspeccion_rechazo_explicado
    check (resultado <> 'rechazado' or btrim(coalesce(observaciones, '')) <> '')
);

create index inspeccion_orden_idx on public.inspeccion (orden_id, inspeccionado_en desc);

create table public.inspeccion_punto (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  inspeccion_id uuid not null references public.inspeccion(id) on delete cascade,
  punto_id      uuid references public.checklist_punto(id) on delete set null,
  -- Se guarda el texto además del enlace: si mañana se edita el
  -- checklist, la inspección de ayer tiene que seguir diciendo lo que
  -- se revisó ayer.
  descripcion   text not null,
  critico       boolean not null default false,
  conforme      boolean not null,
  nota          text,

  created_at    timestamptz not null default now(),

  unique (inspeccion_id, punto_id)
);

-- ── 3 · RETRABAJOS Y GARANTÍAS ────────────────────────────────────────
-- Un retrabajo cuelga de la orden ORIGINAL. Crear una orden nueva sin
-- enlace haría que el KPI de retrabajo diera siempre cero y que el costo
-- de la mala calidad fuese invisible — que es como se vuelve crónica.

create table public.retrabajo (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  orden_id       uuid not null references public.orden_trabajo(id) on delete cascade,
  inspeccion_id  uuid references public.inspeccion(id) on delete set null,
  causa          causa_retrabajo not null default 'sin_determinar',
  politica       politica_garantia not null default 'cubierto',
  descripcion    text not null,
  -- Cuánto se le cobra al cliente. En 'cubierto' es 0 por definición.
  importe_facturable numeric(12,2) not null default 0,
  -- Costo que generó al laboratorio: se calcula al cerrarlo, sumando
  -- material consumido y horas de las tareas del retrabajo.
  costo_generado numeric(12,2),
  abierto_en     timestamptz not null default now(),
  abierto_por    uuid references public.usuario(id),
  cerrado_en     timestamptz,

  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,

  constraint retrabajo_descripcion_no_vacia check (btrim(descripcion) <> ''),
  constraint retrabajo_importe_no_negativo check (importe_facturable >= 0),
  -- Coherencia entre política e importe: un retrabajo "cubierto" que se
  -- cobra no está cubierto, y uno "facturable" gratis no es facturable.
  constraint retrabajo_politica_coherente check (
    (politica = 'cubierto'   and importe_facturable = 0) or
    (politica = 'parcial'    and importe_facturable > 0) or
    (politica = 'facturable' and importe_facturable > 0)
  )
);

create index retrabajo_orden_idx on public.retrabajo (orden_id);
create index retrabajo_abiertos_idx on public.retrabajo (tenant_id, abierto_en desc)
  where cerrado_en is null;

comment on table public.retrabajo is
  'Cuelga de la orden original. Sin ese enlace el KPI de retrabajo daría siempre cero.';

-- ── 4 · COMPETENCIAS (AC-01 §8) ───────────────────────────────────────
-- Qué sabe hacer cada técnico, y a qué nivel. El laboratorio todavía no
-- ha declarado sus competencias; el esquema funciona vacío y la
-- sugerencia se degrada a "por carga".

create table public.competencia (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenant(id) on delete cascade,
  area_id    uuid not null references public.area(id),
  codigo     text not null,
  nombre     text not null,
  activo     boolean not null default true,

  created_at timestamptz not null default now(),
  created_by uuid,

  unique (tenant_id, codigo)
);

-- Qué competencia exige cada proceso. Sin esto no hay forma de sugerir a
-- quién asignar una etapa: se sabría quién está libre, no quién sabe.
create table public.proceso_competencia (
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  proceso_id     uuid not null references public.proceso(id) on delete cascade,
  competencia_id uuid not null references public.competencia(id) on delete cascade,
  -- Nivel mínimo para hacerlo solo. 1 aprendiz · 2 autónomo · 3 referente.
  nivel_minimo   smallint not null default 2,

  primary key (proceso_id, competencia_id),
  constraint proceso_comp_nivel_valido check (nivel_minimo between 1 and 3)
);

create table public.tecnico_competencia (
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  usuario_id     uuid not null references public.usuario(id) on delete cascade,
  competencia_id uuid not null references public.competencia(id) on delete cascade,
  nivel          smallint not null,
  -- Quién dice que lo sabe hacer. Una competencia que se auto-declara y
  -- nadie respalda es justo lo que AC-01 §8 pide poder detectar.
  acreditada_por uuid references public.usuario(id),
  acreditada_en  timestamptz,

  created_at     timestamptz not null default now(),

  primary key (usuario_id, competencia_id),
  constraint tecnico_comp_nivel_valido check (nivel between 1 and 3)
);

comment on column public.tecnico_competencia.acreditada_por is
  'AC-01 §8: una competencia sin acreditar es una alerta, no un dato normal.';

-- ── 5 · INVENTARIO ────────────────────────────────────────────────────

create table public.material (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  area_id       uuid not null references public.area(id),
  codigo        text not null,
  nombre        text not null,
  unidad        text not null default 'unidad',
  -- Costo de referencia. El costo REAL de cada consumo sale del lote,
  -- porque el mismo material cambia de precio entre compras.
  costo_referencia numeric(12,4) not null default 0,
  umbral_bajo   numeric(12,3) not null default 0,
  umbral_critico numeric(12,3) not null default 0,
  -- Un material controlado por lotes exige indicar el lote al consumir:
  -- la cerámica sí, los guantes no.
  controla_lote boolean not null default false,
  activo        boolean not null default true,

  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,

  unique (tenant_id, codigo),
  constraint material_umbrales_coherentes check (umbral_critico <= umbral_bajo),
  constraint material_costo_no_negativo check (costo_referencia >= 0)
);

create table public.lote (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  material_id   uuid not null references public.material(id) on delete cascade,
  codigo        text not null,
  -- El costo unitario ES del lote, no del material: comprar más barato
  -- el mes que viene no puede cambiar el costo de lo que ya se fabricó.
  costo_unitario numeric(12,4) not null,
  vence_el      date,
  ubicacion     text,
  recibido_el   date not null default (now() at time zone 'America/Lima')::date,

  created_at    timestamptz not null default now(),
  created_by    uuid,

  unique (material_id, codigo),
  constraint lote_costo_no_negativo check (costo_unitario >= 0)
);

create index lote_vencimiento_idx on public.lote (tenant_id, vence_el)
  where vence_el is not null;

comment on column public.lote.costo_unitario is
  'El costo vive en el lote. Si viviera en el material, una compra nueva reescribiría el costo de lo ya fabricado.';

-- El movimiento es el único que mueve stock. No hay columna `stock` en
-- `material` a propósito: un saldo almacenado y una lista de movimientos
-- son dos fuentes para el mismo número, y acaban discrepando. Es H-01
-- otra vez, en el almacén.
create table public.movimiento_stock (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenant(id) on delete cascade,
  material_id  uuid not null references public.material(id) on delete restrict,
  lote_id      uuid references public.lote(id) on delete restrict,
  tipo         tipo_movimiento_stock not null,
  -- SIEMPRE positiva. El signo lo pone el tipo, igual que en caja: una
  -- cantidad negativa en una tabla de existencias es una invitación a
  -- sumarla mal.
  cantidad     numeric(12,3) not null,
  costo_unitario numeric(12,4) not null default 0,
  -- A qué trabajo se consumió. Es lo que permite el costo real por orden.
  orden_id     uuid references public.orden_trabajo(id) on delete set null,
  tarea_id     uuid references public.tarea_produccion(id) on delete set null,
  retrabajo_id uuid references public.retrabajo(id) on delete set null,
  motivo       text,

  created_at   timestamptz not null default now(),
  created_by   uuid,

  constraint movimiento_cantidad_positiva check (cantidad > 0),
  constraint movimiento_costo_no_negativo check (costo_unitario >= 0),
  -- Un consumo sin trabajo al que imputarlo hace que el costo real por
  -- orden sea mentira: el material desaparece del almacén y no aparece
  -- en ningún costo.
  constraint movimiento_consumo_imputado
    check (tipo <> 'consumo' or orden_id is not null or retrabajo_id is not null),
  -- Una merma sin motivo es material que se evaporó.
  constraint movimiento_merma_explicada
    check (tipo <> 'merma' or btrim(coalesce(motivo, '')) <> '')
);

create index movimiento_material_idx on public.movimiento_stock (material_id, created_at desc);
create index movimiento_orden_idx on public.movimiento_stock (orden_id)
  where orden_id is not null;

comment on table public.movimiento_stock is
  'Única fuente de existencias. No hay columna de stock en material: dos fuentes para el mismo número acaban discrepando.';

-- Inventario físico: lo que se contó de verdad, frente a lo que el
-- sistema decía. El ajuste NO se aplica solo — necesita aprobación.
create table public.inventario_fisico (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenant(id) on delete cascade,
  contado_en   timestamptz not null default now(),
  contado_por  uuid references public.usuario(id),
  aprobado_por uuid references public.usuario(id),
  aprobado_en  timestamptz,
  observaciones text,

  created_at   timestamptz not null default now(),

  -- Aprobar es lo que convierte el conteo en ajuste. Sin aprobación, un
  -- error de conteo reescribiría el almacén entero.
  constraint inventario_aprobacion_completa
    check ((aprobado_por is null) = (aprobado_en is null))
);

create table public.inventario_linea (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  inventario_id uuid not null references public.inventario_fisico(id) on delete cascade,
  material_id   uuid not null references public.material(id) on delete restrict,
  lote_id       uuid references public.lote(id) on delete restrict,
  -- Lo que el sistema decía en el momento del conteo, congelado.
  cantidad_sistema numeric(12,3) not null,
  cantidad_contada numeric(12,3) not null,

  created_at    timestamptz not null default now(),

  unique (inventario_id, material_id, lote_id),
  constraint inventario_cantidades_no_negativas
    check (cantidad_sistema >= 0 and cantidad_contada >= 0)
);

-- ── 6 · COSTOS ────────────────────────────────────────────────────────
-- Procesos externos: lo que se manda fuera (fresado, sinterizado). No es
-- material ni mano de obra propia, y sin registrarlo el costo de un
-- trabajo de zirconio sale la mitad de lo que es.

create table public.costo_externo (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenant(id) on delete cascade,
  orden_id    uuid not null references public.orden_trabajo(id) on delete cascade,
  proveedor   text not null,
  concepto    text not null,
  importe     numeric(12,2) not null,
  fecha       date not null default (now() at time zone 'America/Lima')::date,

  created_at  timestamptz not null default now(),
  created_by  uuid,

  constraint costo_externo_positivo check (importe > 0),
  constraint costo_externo_proveedor_no_vacio check (btrim(proveedor) <> '')
);

create index costo_externo_orden_idx on public.costo_externo (orden_id);

-- El costo de la hora de trabajo. Vive en configuración, no en el
-- código: cambia con los sueldos, y no puede exigir un despliegue.
-- Se lee con `costo_hora(tenant)`.

-- ── 7 · VISTAS ────────────────────────────────────────────────────────

-- Existencias por material y lote. Se DERIVA de los movimientos, siempre.
create or replace view public.v_stock
with (security_invoker = true) as
select
  m.id                as material_id,
  m.tenant_id,
  m.codigo,
  m.nombre,
  m.unidad,
  m.umbral_bajo,
  m.umbral_critico,
  l.id                as lote_id,
  l.codigo            as lote,
  l.vence_el,
  l.ubicacion,
  coalesce(sum(
    case mv.tipo
      when 'entrada'    then  mv.cantidad
      when 'devolucion' then -mv.cantidad
      when 'consumo'    then -mv.cantidad
      when 'merma'      then -mv.cantidad
      -- El ajuste ya viene con el sentido correcto en su propio signo:
      -- se registra como entrada o consumo según sobre o falte.
      else 0
    end), 0)          as cantidad,
  coalesce(l.costo_unitario, m.costo_referencia) as costo_unitario
from public.material m
left join public.lote l on l.material_id = m.id
left join public.movimiento_stock mv
       on mv.material_id = m.id
      and (mv.lote_id = l.id or (mv.lote_id is null and l.id is null))
where m.activo
group by m.id, m.tenant_id, m.codigo, m.nombre, m.unidad, m.umbral_bajo,
         m.umbral_critico, l.id, l.codigo, l.vence_el, l.ubicacion, l.costo_unitario;

comment on view public.v_stock is
  'Existencias derivadas de los movimientos. Nunca se almacena un saldo: dos fuentes discreparían.';

-- Alertas de almacén: bajo, crítico y por vencer, en una sola lista.
create or replace view public.v_alerta_stock
with (security_invoker = true) as
select
  material_id,
  tenant_id,
  codigo,
  nombre,
  unidad,
  sum(cantidad) as cantidad,
  min(umbral_bajo) as umbral_bajo,
  min(umbral_critico) as umbral_critico,
  min(vence_el) filter (where vence_el is not null and cantidad > 0) as primer_vencimiento,
  case
    when sum(cantidad) <= min(umbral_critico) then 'critico'
    when sum(cantidad) <= min(umbral_bajo)    then 'bajo'
    else 'normal'
  end as nivel
from public.v_stock
group by material_id, tenant_id, codigo, nombre, unidad
having sum(cantidad) <= min(umbral_bajo)
    or min(vence_el) filter (where vence_el is not null and cantidad > 0)
       <= ((now() at time zone 'America/Lima')::date + 30);

-- ── 8 · RLS ───────────────────────────────────────────────────────────
-- Regla 1 del proyecto: toda tabla lleva tenant_id y política. Sin
-- excepción, aunque la pantalla todavía no exista.

do $$
declare t text;
begin
  foreach t in array array[
    'checklist_calidad','checklist_punto','inspeccion','inspeccion_punto',
    'retrabajo','competencia','proceso_competencia','tecnico_competencia',
    'material','lote','movimiento_stock','inventario_fisico','inventario_linea',
    'costo_externo'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    -- Leer: cualquiera del laboratorio. Lo que se protege es escribir.
    execute format($p$
      create policy %1$s_lectura on public.%1$s
        for select using (tenant_id = public.current_tenant_id());
    $p$, t);

    -- El GRANT hace falta ADEMÁS de la política: sin él, Postgres
    -- responde permission denied y la política ni se evalúa.
    execute format('grant select on public.%I to authenticated;', t);
  end loop;
end $$;

-- Escritura, por bloques, según quién hace realmente cada cosa.

-- Calidad: quien inspecciona. Por defecto los líderes; el laboratorio
-- aún no ha decidido si habrá un rol dedicado (decisión abierta).
do $$
declare t text;
begin
  foreach t in array array['inspeccion','inspeccion_punto','retrabajo']
  loop
    execute format($p$
      create policy %1$s_escritura on public.%1$s
        for all using (
          tenant_id = public.current_tenant_id()
          and public.tiene_rol('administrador','lider_laboratorio','lider_area')
        ) with check (
          tenant_id = public.current_tenant_id()
          and public.tiene_rol('administrador','lider_laboratorio','lider_area')
        );
    $p$, t);
    execute format('grant insert, update, delete on public.%I to authenticated;', t);
  end loop;
end $$;

-- Almacén: quien mueve material. El técnico consume, y por eso escribe
-- movimientos — pero no crea materiales ni corrige el inventario.
create policy movimiento_stock_escritura on public.movimiento_stock
  for all using (
    tenant_id = public.current_tenant_id()
    and public.tiene_rol('administrador','lider_laboratorio','lider_area','tecnico')
  ) with check (
    tenant_id = public.current_tenant_id()
    and public.tiene_rol('administrador','lider_laboratorio','lider_area','tecnico')
  );
grant insert on public.movimiento_stock to authenticated;

-- Catálogos y correcciones: administración y jefatura del taller.
do $$
declare t text;
begin
  foreach t in array array[
    'checklist_calidad','checklist_punto','competencia','proceso_competencia',
    'tecnico_competencia','material','lote','inventario_fisico','inventario_linea',
    'costo_externo'
  ]
  loop
    execute format($p$
      create policy %1$s_escritura on public.%1$s
        for all using (
          tenant_id = public.current_tenant_id()
          and public.tiene_rol('administrador','lider_laboratorio')
        ) with check (
          tenant_id = public.current_tenant_id()
          and public.tiene_rol('administrador','lider_laboratorio')
        );
    $p$, t);
    execute format('grant insert, update, delete on public.%I to authenticated;', t);
  end loop;
end $$;

-- ── 9 · AUDITORÍA Y TIMESTAMPS ────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'checklist_calidad','retrabajo','material','lote','inventario_fisico'
  ]
  loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.tg_touch_updated_at();', t);
  end loop;

  -- Se audita lo que mueve dinero o existencias, y lo que juzga calidad.
  foreach t in array array[
    'inspeccion','retrabajo','movimiento_stock','inventario_fisico','costo_externo',
    'tecnico_competencia'
  ]
  loop
    execute format(
      'create trigger %1$s_auditar after insert or update or delete on public.%1$s
         for each row execute function public.tg_auditar();', t);
  end loop;
end $$;

-- ── 10 · FUNCIONES DE NEGOCIO ─────────────────────────────────────────

-- El costo de la hora sale de `configuracion`, igual que el IGV: cambia
-- con los sueldos y no puede exigir un despliegue.
create or replace function public.costo_hora(p_tenant uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce((valor ->> 'soles')::numeric, 0)
    from public.configuracion
   where tenant_id = p_tenant and clave = 'costo_hora';
$fn$;

-- Registrar una inspección con sus puntos, en una sola transacción.
--
-- El resultado NO lo elige quien inspecciona: lo deduce el checklist. Si
-- falla un punto crítico es rechazo; si falla uno no crítico, observado;
-- si no falla ninguno, aprobado. Dejarlo a criterio abriría la puerta a
-- "apruebo aunque falló el ajuste, que ya lo arreglan en clínica".
create or replace function public.registrar_inspeccion(
  p_orden         uuid,
  p_checklist     uuid,
  p_puntos        jsonb,
  p_observaciones text default null,
  p_evidencia     uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_tenant    uuid := public.current_tenant_id();
  v_insp      uuid;
  v_punto     jsonb;
  v_resultado public.resultado_inspeccion;
  v_fallo_critico boolean := false;
  v_fallo_leve    boolean := false;
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  if jsonb_array_length(coalesce(p_puntos, '[]'::jsonb)) = 0 then
    raise exception 'Una inspección sin puntos revisados no es una inspección'
      using errcode = '23514';
  end if;

  -- Se recorre primero para deducir el resultado y sólo después se
  -- inserta: la cabecera nace ya con el veredicto correcto.
  for v_punto in select * from jsonb_array_elements(p_puntos)
  loop
    if not (v_punto ->> 'conforme')::boolean then
      if coalesce((v_punto ->> 'critico')::boolean, false) then
        v_fallo_critico := true;
      else
        v_fallo_leve := true;
      end if;
    end if;
  end loop;

  v_resultado := case
    when v_fallo_critico then 'rechazado'
    when v_fallo_leve    then 'observado'
    else 'aprobado'
  end;

  -- Un rechazo exige explicación (lo impone también un CHECK). Aquí se da
  -- el mensaje comprensible en vez del error de constraint.
  if v_resultado = 'rechazado' and btrim(coalesce(p_observaciones, '')) = '' then
    raise exception 'Un rechazo necesita explicación: sin ella nadie sabe qué corregir'
      using errcode = '23514';
  end if;

  insert into public.inspeccion (
    tenant_id, orden_id, checklist_id, inspeccionado_por,
    resultado, observaciones, evidencia_id, created_by
  ) values (
    v_tenant, p_orden, p_checklist, auth.uid(),
    v_resultado, nullif(btrim(coalesce(p_observaciones, '')), ''), p_evidencia, auth.uid()
  )
  returning id into v_insp;

  for v_punto in select * from jsonb_array_elements(p_puntos)
  loop
    insert into public.inspeccion_punto (
      tenant_id, inspeccion_id, punto_id, descripcion, critico, conforme, nota
    ) values (
      v_tenant, v_insp,
      nullif(v_punto ->> 'punto_id', '')::uuid,
      v_punto ->> 'descripcion',
      coalesce((v_punto ->> 'critico')::boolean, false),
      (v_punto ->> 'conforme')::boolean,
      nullif(btrim(coalesce(v_punto ->> 'nota', '')), '')
    );
  end loop;

  return v_insp;
end;
$fn$;

comment on function public.registrar_inspeccion is
  'El resultado lo deduce el checklist, no lo elige el inspector. Un crítico que falla es rechazo, siempre.';

-- Consumir material contra un trabajo.
--
-- Comprueba existencias ANTES de descontar. Sin esto el almacén puede
-- quedar en negativo, y un almacén en negativo deja de servir para
-- decidir si hace falta comprar.
create or replace function public.consumir_material(
  p_material  uuid,
  p_lote      uuid,
  p_cantidad  numeric,
  p_orden     uuid default null,
  p_tarea     uuid default null,
  p_retrabajo uuid default null,
  p_motivo    text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_tenant uuid := public.current_tenant_id();
  v_disp   numeric(12,3);
  v_costo  numeric(12,4);
  v_lotes  boolean;
  v_mov    uuid;
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  if p_cantidad <= 0 then
    raise exception 'La cantidad consumida tiene que ser mayor que cero'
      using errcode = '23514';
  end if;

  if p_orden is null and p_retrabajo is null then
    raise exception 'Un consumo sin trabajo al que imputarlo hace que el costo real sea mentira'
      using errcode = '23514';
  end if;

  select controla_lote, costo_referencia into v_lotes, v_costo
    from public.material where id = p_material and tenant_id = v_tenant;

  if v_lotes is null then
    raise exception 'Ese material no existe en este laboratorio' using errcode = '42501';
  end if;

  if v_lotes and p_lote is null then
    raise exception 'Este material se controla por lotes: hay que decir de cuál sale'
      using errcode = '23514';
  end if;

  -- Existencias del lote concreto, o del material entero si no lleva lote.
  select coalesce(sum(cantidad), 0) into v_disp
    from public.v_stock
   where material_id = p_material
     and (p_lote is null or lote_id = p_lote);

  if v_disp < p_cantidad then
    raise exception 'No hay existencias suficientes: quedan % y se piden %', v_disp, p_cantidad
      using errcode = '23514';
  end if;

  if p_lote is not null then
    select costo_unitario into v_costo from public.lote where id = p_lote;
  end if;

  insert into public.movimiento_stock (
    tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario,
    orden_id, tarea_id, retrabajo_id, motivo, created_by
  ) values (
    v_tenant, p_material, p_lote, 'consumo', p_cantidad, coalesce(v_costo, 0),
    p_orden, p_tarea, p_retrabajo, p_motivo, auth.uid()
  )
  returning id into v_mov;

  return v_mov;
end;
$fn$;

-- Aprobar un inventario físico y generar los ajustes.
--
-- El conteo por sí solo no mueve nada. Aprobarlo es lo que convierte la
-- diferencia en movimiento — y como el ajuste altera existencias, queda
-- escrito quién lo aprobó y contra qué conteo.
create or replace function public.aprobar_inventario(p_inventario uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_tenant uuid := public.current_tenant_id();
  v_linea  record;
  v_dif    numeric(12,3);
  n        integer := 0;
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  -- Un ajuste de existencias sin aprobador identificado no es un ajuste
  -- aprobado: es un cambio anónimo en el almacén.
  if auth.uid() is null then
    raise exception 'Aprobar un inventario exige un usuario identificado'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.inventario_fisico
     where id = p_inventario and tenant_id = v_tenant and aprobado_en is not null
  ) then
    raise exception 'Ese inventario ya está aprobado: aprobarlo dos veces duplicaría los ajustes'
      using errcode = '23514';
  end if;

  for v_linea in
    select l.*, m.costo_referencia, lo.costo_unitario as costo_lote
      from public.inventario_linea l
      join public.material m on m.id = l.material_id
      left join public.lote lo on lo.id = l.lote_id
     where l.inventario_id = p_inventario and l.tenant_id = v_tenant
  loop
    v_dif := v_linea.cantidad_contada - v_linea.cantidad_sistema;

    if v_dif <> 0 then
      -- El signo lo lleva el tipo, no la cantidad: si sobra material es
      -- una entrada; si falta, una merma. Guardar un negativo sería
      -- invitar a que alguien lo sumara mal.
      insert into public.movimiento_stock (
        tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario,
        motivo, created_by
      ) values (
        v_tenant, v_linea.material_id, v_linea.lote_id,
        (case when v_dif > 0 then 'entrada' else 'merma' end)::public.tipo_movimiento_stock,
        abs(v_dif),
        coalesce(v_linea.costo_lote, v_linea.costo_referencia, 0),
        'Ajuste por inventario físico',
        auth.uid()
      );

      n := n + 1;
    end if;
  end loop;

  update public.inventario_fisico
     set aprobado_por = auth.uid(), aprobado_en = now()
   where id = p_inventario and tenant_id = v_tenant;

  return n;
end;
$fn$;

grant execute on function public.registrar_inspeccion(uuid, uuid, jsonb, text, uuid) to authenticated;
grant execute on function public.consumir_material(uuid, uuid, numeric, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.aprobar_inventario(uuid) to authenticated;
grant execute on function public.costo_hora(uuid) to authenticated;

-- ── 11 · COSTO REAL POR ORDEN (3.5) ───────────────────────────────────
-- Las cuatro patas del costo, en una sola vista. Sin las cuatro, el
-- margen de un trabajo de zirconio sale el doble de lo que es.

create or replace view public.v_costo_orden
with (security_invoker = true) as
select
  o.id            as orden_id,
  o.tenant_id,
  o.codigo,
  o.cliente_id,
  -- Valor de venta del trabajo, sin IGV (regla 5).
  coalesce((
    select sum(dt.cantidad * dt.precio_unitario)
      from public.detalle_trabajo dt where dt.orden_id = o.id
  ), 0) as valor_venta,

  coalesce((
    select sum(mv.cantidad * mv.costo_unitario)
      from public.movimiento_stock mv
     where mv.orden_id = o.id and mv.tipo = 'consumo'
  ), 0) as costo_materiales,

  -- Mano de obra: horas REALES si la etapa se cronometró, estimadas si
  -- no. Se prefiere lo real; caer a lo estimado evita que un trabajo sin
  -- cronometrar aparezca con coste de mano de obra cero, que sería peor.
  coalesce((
    select sum(coalesce(t.horas_reales, t.horas_estimadas) * public.costo_hora(o.tenant_id))
      from public.tarea_produccion t where t.orden_id = o.id
  ), 0) as costo_mano_obra,

  coalesce((
    select sum(ce.importe) from public.costo_externo ce where ce.orden_id = o.id
  ), 0) as costo_externo,

  coalesce((
    select sum(r.costo_generado) from public.retrabajo r where r.orden_id = o.id
  ), 0) as costo_retrabajo
from public.orden_trabajo o;

comment on view public.v_costo_orden is
  'Costo real: materiales + mano de obra + procesos externos + retrabajo. Sin las cuatro patas el margen miente.';

create or replace view public.v_rentabilidad_orden
with (security_invoker = true) as
select
  c.*,
  (c.costo_materiales + c.costo_mano_obra + c.costo_externo + c.costo_retrabajo) as costo_total,
  c.valor_venta - (c.costo_materiales + c.costo_mano_obra + c.costo_externo + c.costo_retrabajo) as margen,
  case when c.valor_venta > 0
    then round(
      (c.valor_venta - (c.costo_materiales + c.costo_mano_obra + c.costo_externo + c.costo_retrabajo))
      / c.valor_venta * 100, 1)
    else null
  end as margen_pct
from public.v_costo_orden c;

-- El GRANT de las vistas es tan necesario como el de las tablas. Sin él,
-- Postgres responde `permission denied` y la pantalla sale vacía sin
-- decir por qué — que es exactamente lo que pasó al construirla.
grant select on public.v_stock to authenticated;
grant select on public.v_alerta_stock to authenticated;
grant select on public.v_costo_orden to authenticated;
grant select on public.v_rentabilidad_orden to authenticated;
