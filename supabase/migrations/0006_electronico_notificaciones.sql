-- ═══════════════════════════════════════════════════════════════════════
-- 0006 · COMPROBANTE ELECTRÓNICO (registro manual) Y NOTIFICACIONES
--
-- Dos cosas que faltaban y que no dependen de terceros:
--
--   ELECTRÓNICO · el laboratorio todavía no está integrado con ningún PSE.
--     Hoy emite por fuera y anota el resultado a mano. Estos campos son
--     los MISMOS que rellenará la integración cuando llegue: registrar a
--     mano ahora no es un apaño desechable, es adelantar el modelo.
--
--   NOTIFICACIONES · el canal `sistema` funciona sin depender de nadie.
--     Email y WhatsApp esperan a 2.9, pero el motor de eventos y las
--     preferencias por usuario ya pueden existir — y sin ellos no hay
--     dónde enchufarlos después.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · COMPROBANTE ELECTRÓNICO ───────────────────────────────────────

-- El ciclo de vida ante SUNAT. 'no_aplica' es el estado por defecto
-- mientras el laboratorio no emita electrónicamente nada.
create type estado_cpe as enum (
  'no_aplica',
  'pendiente',           -- emitido en MEFLAB, aún no declarado
  'registrado_manual',   -- declarado por fuera y anotado aquí
  'aceptado',            -- el PSE devolvió conformidad
  'rechazado',           -- SUNAT lo rechazó: hay que corregir y reenviar
  'anulado_sunat'        -- dado de baja ante SUNAT
);

alter table public.documento_venta
  -- Nace en 'no_aplica': un laboratorio sin integración ni obligación
  -- electrónica no tiene por qué ver el documento marcado como pendiente
  -- de algo que no va a hacer.
  add column estado_cpe estado_cpe not null default 'no_aplica',
  -- El código que devuelve SUNAT o el PSE. Es lo que se dicta por
  -- teléfono cuando el contador pregunta si la factura pasó.
  add column hash_cpe text,
  add column ticket_cpe text,
  add column declarado_en timestamptz,
  add column declarado_por uuid references public.usuario(id),
  -- Lo que respondió SUNAT, literal. Un rechazo dice el motivo, y ese
  -- texto es lo único que permite corregir y reenviar.
  add column respuesta_cpe text;

-- Un estado que afirma que el documento se declaró tiene que decir
-- cuándo. Sin fecha, "aceptado" es una casilla que alguien marcó.
alter table public.documento_venta
  add constraint documento_cpe_declarado_con_fecha
    check (
      estado_cpe in ('no_aplica', 'pendiente')
      or declarado_en is not null
    );

-- Un rechazo sin motivo no se puede corregir.
alter table public.documento_venta
  add constraint documento_cpe_rechazo_explicado
    check (
      estado_cpe <> 'rechazado'
      or btrim(coalesce(respuesta_cpe, '')) <> ''
    );

create index documento_cpe_pendientes_idx
  on public.documento_venta (tenant_id, fecha_emision)
  where estado_cpe in ('pendiente', 'rechazado');

comment on column public.documento_venta.estado_cpe is
  'Ciclo ante SUNAT. Hoy se rellena a mano; la integración con el PSE usará estos mismos campos.';

/**
 * Anotar el resultado de la declaración electrónica.
 *
 * Mientras no haya integración, esto lo teclea Administración con lo que
 * le devuelve el sistema por el que emite. Cuando llegue el PSE, será la
 * integración quien llame aquí: la firma no cambia.
 */
create or replace function public.registrar_cpe(
  p_documento uuid,
  p_estado    text,
  p_hash      text default null,
  p_ticket    text default null,
  p_respuesta text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_tenant uuid := public.current_tenant_id();
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.documento_venta
     where id = p_documento and tenant_id = v_tenant
  ) then
    raise exception 'Ese documento no existe en este laboratorio' using errcode = '42501';
  end if;

  if p_estado = 'rechazado' and btrim(coalesce(p_respuesta, '')) = '' then
    raise exception 'Un rechazo de SUNAT sin motivo no se puede corregir'
      using errcode = '23514';
  end if;

  update public.documento_venta
     set estado_cpe    = p_estado::public.estado_cpe,
         hash_cpe      = nullif(btrim(coalesce(p_hash, '')), ''),
         ticket_cpe    = nullif(btrim(coalesce(p_ticket, '')), ''),
         respuesta_cpe = nullif(btrim(coalesce(p_respuesta, '')), ''),
         -- Los estados que afirman una declaración llevan fecha; los que
         -- no, la limpian, para que no quede una fecha huérfana.
         declarado_en  = case
           when p_estado in ('no_aplica', 'pendiente') then null
           else now()
         end,
         declarado_por = case
           when p_estado in ('no_aplica', 'pendiente') then null
           else auth.uid()
         end,
         updated_at    = now(),
         updated_by    = auth.uid()
   where id = p_documento and tenant_id = v_tenant;
end;
$fn$;

grant execute on function public.registrar_cpe(uuid, text, text, text, text) to authenticated;

-- ── 2 · NOTIFICACIONES ────────────────────────────────────────────────

create type canal_notificacion as enum ('sistema', 'email', 'whatsapp');

create table public.notificacion (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenant(id) on delete cascade,
  -- A quién va. Nulo = a todo el que tenga el rol indicado.
  usuario_id  uuid references public.usuario(id) on delete cascade,
  rol_destino text,
  evento      text not null,
  titulo      text not null,
  cuerpo      text,
  -- A dónde lleva al pulsarla. Una notificación que no lleva a ningún
  -- sitio obliga a buscar a mano lo que anuncia.
  enlace      text,
  canal       canal_notificacion not null default 'sistema',
  leida_en    timestamptz,
  enviada_en  timestamptz,

  created_at  timestamptz not null default now(),

  constraint notificacion_titulo_no_vacio check (btrim(titulo) <> ''),
  -- O va a una persona o va a un rol. Ninguna de las dos es «a nadie».
  constraint notificacion_tiene_destino
    check (usuario_id is not null or rol_destino is not null)
);

create index notificacion_pendientes_idx
  on public.notificacion (tenant_id, usuario_id, created_at desc)
  where leida_en is null;

comment on table public.notificacion is
  'Canal sistema funcionando. Email y WhatsApp esperan a 2.9, pero el motor y las preferencias ya existen.';

create table public.preferencia_notificacion (
  tenant_id  uuid not null references public.tenant(id) on delete cascade,
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  evento     text not null,
  canal      canal_notificacion not null,
  activo     boolean not null default true,

  primary key (usuario_id, evento, canal)
);

alter table public.notificacion enable row level security;
alter table public.preferencia_notificacion enable row level security;

-- Cada quien ve LO SUYO: las dirigidas a él, y las dirigidas a un rol que
-- tiene. Ver las de otro sería ver trabajo ajeno sin motivo.
create policy notificacion_lectura on public.notificacion
  for select using (
    tenant_id = public.current_tenant_id()
    and (
      usuario_id = auth.uid()
      or (rol_destino is not null and public.tiene_rol(rol_destino))
    )
  );

-- Marcarla como leída es lo único que hace el destinatario.
create policy notificacion_marcar on public.notificacion
  for update using (
    tenant_id = public.current_tenant_id()
    and (
      usuario_id = auth.uid()
      or (rol_destino is not null and public.tiene_rol(rol_destino))
    )
  );

create policy notificacion_alta on public.notificacion
  for insert with check (tenant_id = public.current_tenant_id());

create policy preferencia_propia on public.preferencia_notificacion
  for all using (
    tenant_id = public.current_tenant_id() and usuario_id = auth.uid()
  ) with check (
    tenant_id = public.current_tenant_id() and usuario_id = auth.uid()
  );

grant select, insert, update on public.notificacion to authenticated;
grant select, insert, update, delete on public.preferencia_notificacion to authenticated;

/**
 * Emitir una notificación respetando las preferencias del destinatario.
 *
 * Es `security definer` porque tiene que poder escribir en la bandeja de
 * OTRO usuario: quien entrega un trabajo notifica a quien cobra, y no
 * puede depender de que tenga permiso sobre su bandeja.
 */
create or replace function public.notificar(
  p_evento  text,
  p_titulo  text,
  p_cuerpo  text default null,
  p_enlace  text default null,
  p_usuario uuid default null,
  p_rol     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_tenant uuid := public.current_tenant_id();
  v_id     uuid;
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  if p_usuario is null and p_rol is null then
    raise exception 'Una notificación sin destinatario no se entrega a nadie'
      using errcode = '23514';
  end if;

  -- Si el destinatario apagó este evento en el canal sistema, no se
  -- crea. Crearla y ocultarla dejaría la bandeja llena de cosas que
  -- nadie va a ver.
  if p_usuario is not null and exists (
    select 1 from public.preferencia_notificacion
     where usuario_id = p_usuario and evento = p_evento
       and canal = 'sistema' and not activo
  ) then
    return null;
  end if;

  insert into public.notificacion (
    tenant_id, usuario_id, rol_destino, evento, titulo, cuerpo, enlace
  ) values (
    v_tenant, p_usuario, p_rol, p_evento, p_titulo, p_cuerpo, p_enlace
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

grant execute on function public.notificar(text, text, text, text, uuid, text) to authenticated;

-- ── 3 · EVENTOS QUE NOTIFICAN SOLOS ───────────────────────────────────
-- Se disparan desde la base, no desde la aplicación: un aviso que
-- depende de que la pantalla acierte a lanzarlo se pierde en cuanto algo
-- se hace por otra vía.

create or replace function public.tg_notificar_inspeccion_rechazada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_codigo text;
begin
  if new.resultado <> 'rechazado' then
    return new;
  end if;

  select codigo into v_codigo from public.orden_trabajo where id = new.orden_id;

  perform public.notificar(
    p_evento => 'calidad.rechazo',
    p_titulo => 'Trabajo rechazado en control de calidad: ' || coalesce(v_codigo, ''),
    p_cuerpo => new.observaciones,
    p_enlace => '/trabajos/' || new.orden_id,
    p_rol    => 'lider_laboratorio'
  );

  return new;
end;
$fn$;

create trigger inspeccion_rechazada_notifica
  after insert on public.inspeccion
  for each row execute function public.tg_notificar_inspeccion_rechazada();

create or replace function public.tg_notificar_stock_critico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_mat record;
  v_queda numeric(12,3);
begin
  -- Sólo al salir material: una entrada nunca deja el stock más bajo.
  if new.tipo not in ('consumo', 'merma') then
    return new;
  end if;

  select nombre, unidad, umbral_critico into v_mat
    from public.material where id = new.material_id;

  select coalesce(sum(cantidad), 0) into v_queda
    from public.v_stock where material_id = new.material_id;

  if v_queda > v_mat.umbral_critico then
    return new;
  end if;

  perform public.notificar(
    p_evento => 'inventario.critico',
    p_titulo => 'Stock crítico: ' || v_mat.nombre,
    p_cuerpo => 'Quedan ' || v_queda || ' ' || v_mat.unidad ||
                ', por debajo del umbral crítico (' || v_mat.umbral_critico || ').',
    p_enlace => '/inventario',
    p_rol    => 'lider_laboratorio'
  );

  return new;
end;
$fn$;

create trigger stock_critico_notifica
  after insert on public.movimiento_stock
  for each row execute function public.tg_notificar_stock_critico();
