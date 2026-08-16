-- ═══════════════════════════════════════════════════════════════════════
-- MEFLAB · 0001_core
-- Tenant, sedes, áreas, usuarios y roles, configuración, series, auditoría
-- y las funciones de contexto sobre las que se apoya todo el RLS.
--
-- Decisiones que este archivo implementa:
--   D-05  tenant_id + RLS en toda tabla de negocio, desde la primera línea
--   D-06  el área existe en el esquema aunque la interfaz no la use todavía
--   AC-01 §7.2  un usuario tiene VARIOS roles (N:M), nunca uno solo
--   M-07  la auditoría es un trigger, no código de aplicación
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · TIPOS ─────────────────────────────────────────────────────────
-- Los 7 roles reales del laboratorio (AC-01 §2.1), no los 13 del SRS.
create type rol_sistema as enum (
  'administrador',
  'gerencia',
  'lider_laboratorio',
  'recepcion',
  'lider_area',
  'tecnico',
  'portal_cliente'
);

-- ── 2 · FUNCIONES DE CONTEXTO ─────────────────────────────────────────
-- Leen del JWT. Son la base de todas las políticas: si estas fallan,
-- fallan cerradas (devuelven null / false), nunca abiertas.

create or replace function public.jwt_claims()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

comment on function public.jwt_claims is
  'Claims del JWT actual, o {} si no hay sesión. Nunca lanza excepción.';

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(public.jwt_claims() ->> 'tenant_id', '')::uuid;
$$;

comment on function public.current_tenant_id is
  'Laboratorio del usuario actual. null sin sesión, lo que hace que toda política falle cerrada.';

-- El permiso se concede si ALGUNO de los roles lo otorga (AC-01 §7.2).
create or replace function public.tiene_rol(variadic roles text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    array(
      select jsonb_array_elements_text(
        coalesce(public.jwt_claims() -> 'roles', '[]'::jsonb)
      )
    ) && roles,
    false
  );
$$;

comment on function public.tiene_rol is
  'true si el usuario tiene al menos uno de los roles indicados. Nunca se inventan roles compuestos.';

create or replace function public.areas_del_usuario()
returns uuid[]
language sql
stable
set search_path = ''
as $$
  select coalesce(
    array(
      select jsonb_array_elements_text(
        coalesce(public.jwt_claims() -> 'areas', '[]'::jsonb)
      )::uuid
    ),
    '{}'::uuid[]
  );
$$;

comment on function public.areas_del_usuario is
  'Área principal del usuario más aquellas en las que puede apoyar (AC-01 §3.2.5).';

-- ── 2.1 · HOOK DEL TOKEN ──────────────────────────────────────────────
-- Se define al final del archivo, cuando ya existen usuario y usuario_rol.
-- Ver sección 8.

-- ── 3 · TABLAS ────────────────────────────────────────────────────────

create table public.tenant (
  id          uuid primary key default gen_random_uuid(),
  nombre      text        not null,
  ruc         text,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.tenant is 'Un laboratorio. La raíz del aislamiento multi-tenant.';

create table public.sede (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenant(id) on delete cascade,
  codigo      text        not null,
  nombre      text        not null,
  direccion   text,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (tenant_id, codigo)
);

-- D-06: el área existe desde el día 1 con un valor por defecto GENERAL.
-- La interfaz no la usa hasta que el laboratorio defina las suyas, pero la
-- columna tiene que estar antes de que haya datos: añadirla después obliga
-- a migrar 6 tablas y reasignar cada registro a mano.
create table public.area (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenant(id) on delete cascade,
  codigo      text        not null,
  nombre      text        not null,
  lider_id    uuid,
  color       text,
  es_default  boolean     not null default false,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (tenant_id, codigo)
);

-- Exactamente un área por defecto por laboratorio: es la que reciben las
-- filas que no declaran área.
create unique index area_default_unica
  on public.area (tenant_id)
  where es_default;

comment on table public.area is
  'Área productiva (FIJA, PPR, DIGITAL…). Arranca con una única GENERAL marcada es_default (D-06).';

create table public.usuario (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid        not null references public.tenant(id) on delete cascade,
  sede_id     uuid        references public.sede(id),
  area_id     uuid        references public.area(id),
  nombre      text        not null,
  email       text        not null,
  telefono    text,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (tenant_id, email)
);

comment on column public.usuario.id is
  'Mismo id que auth.users: la identidad la gestiona Supabase Auth, el perfil vive aquí.';

-- AC-01 §7.2. No existe usuario.rol: un usuario tiene N roles, y sus
-- permisos son la UNIÓN de los de todos ellos.
create table public.usuario_rol (
  tenant_id   uuid        not null references public.tenant(id) on delete cascade,
  usuario_id  uuid        not null references public.usuario(id) on delete cascade,
  rol         rol_sistema not null,
  area_id     uuid        references public.area(id),
  created_at  timestamptz not null default now(),
  created_by  uuid,
  primary key (usuario_id, rol)
);

comment on column public.usuario_rol.area_id is
  'Ámbito del rol. null = todo el laboratorio. Sólo lo usa lider_area.';

create table public.usuario_area_apoyo (
  tenant_id   uuid not null references public.tenant(id) on delete cascade,
  usuario_id  uuid not null references public.usuario(id) on delete cascade,
  area_id     uuid not null references public.area(id) on delete cascade,
  primary key (usuario_id, area_id)
);

comment on table public.usuario_area_apoyo is
  'Un técnico puede apoyar en otra área — de ahí "técnicos de apoyo" (AC-01 §3.2.5).';

alter table public.area
  add constraint area_lider_fk foreign key (lider_id) references public.usuario(id);

create table public.configuracion (
  tenant_id   uuid        not null references public.tenant(id) on delete cascade,
  clave       text        not null,
  valor       jsonb       not null,
  descripcion text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  primary key (tenant_id, clave)
);

comment on table public.configuracion is
  'Parámetros del laboratorio: IGV, pesos del score, umbrales de segmento. Nunca en el código.';

create table public.serie (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenant(id) on delete cascade,
  sede_id       uuid        references public.sede(id),
  tipo_doc      text        not null,
  serie         text        not null,
  correlativo   integer     not null default 0,
  activo        boolean     not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  unique (tenant_id, tipo_doc, serie),
  constraint serie_correlativo_no_negativo check (correlativo >= 0)
);

comment on table public.serie is
  'Series y correlativos por tipo de comprobante y sede, con control de saltos (RF-095).';

-- M-07: la bitácora la escribe un trigger. Ninguna operación puede
-- escapar de la auditoría por un olvido en el código de aplicación.
create table public.auditoria (
  id          bigserial   primary key,
  tenant_id   uuid,
  ocurrido_en timestamptz not null default now(),
  usuario_id  uuid,
  accion      text        not null,
  tabla       text        not null,
  registro_id text,
  antes       jsonb,
  despues     jsonb,
  ip          inet
);

create index auditoria_tenant_fecha_idx
  on public.auditoria (tenant_id, ocurrido_en desc);
create index auditoria_tabla_idx
  on public.auditoria (tabla, ocurrido_en desc);

-- ── 4 · TRIGGERS ──────────────────────────────────────────────────────

-- Se aplica a tablas de forma distinta, así que no puede dar por sentado
-- que todas tengan `updated_by`. Trabajar sobre jsonb la hace segura de
-- colgar en cualquier tabla sin romper el INSERT/UPDATE.
create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parche jsonb := jsonb_build_object('updated_at', now());
begin
  if to_jsonb(new) ? 'updated_by' then
    v_parche := v_parche || jsonb_build_object('updated_by', auth.uid());
  end if;
  return jsonb_populate_record(new, v_parche);
end;
$$;

comment on function public.tg_touch_updated_at is
  'Sella updated_at, y updated_by si la tabla lo tiene. Segura de colgar en cualquier tabla.';

-- Devuelve la clave primaria de un registro como texto, sea simple o
-- compuesta. No se puede asumir que toda tabla tenga columna `id`:
-- configuracion es (tenant_id, clave) y usuario_rol es (usuario_id, rol).
create or replace function public.pk_como_texto(p_relid oid, p_fila jsonb)
returns text
language sql
stable
set search_path = ''
as $$
  select string_agg(p_fila ->> a.attname, ' / ' order by k.ord)
  from pg_index i
  cross join lateral unnest(i.indkey) with ordinality as k(attnum, ord)
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
  where i.indrelid = p_relid and i.indisprimary;
$$;

create or replace function public.tg_auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes   jsonb;
  v_despues jsonb;
  v_tenant  uuid;
begin
  if tg_op = 'DELETE' then
    v_antes := to_jsonb(old);
  elsif tg_op = 'UPDATE' then
    v_antes := to_jsonb(old);
    v_despues := to_jsonb(new);
    -- Un UPDATE que no cambia nada no merece una línea de bitácora.
    if v_antes = v_despues then
      return new;
    end if;
  else
    v_despues := to_jsonb(new);
  end if;

  v_tenant := coalesce(
    (v_despues ->> 'tenant_id')::uuid,
    (v_antes ->> 'tenant_id')::uuid
  );

  insert into public.auditoria (tenant_id, usuario_id, accion, tabla, registro_id, antes, despues)
  values (
    v_tenant,
    auth.uid(),
    tg_op,
    tg_table_name,
    public.pk_como_texto(tg_relid, coalesce(v_despues, v_antes)),
    v_antes,
    v_despues
  );

  return coalesce(new, old);
end;
$$;

comment on function public.tg_auditar is
  'Trigger genérico de auditoría. security definer para poder escribir en auditoria con RLS activo.';

-- ── 5 · RLS ───────────────────────────────────────────────────────────
-- Toda tabla lleva RLS. Sin excepción (regla 1 de CLAUDE.md).

alter table public.tenant             enable row level security;
alter table public.sede               enable row level security;
alter table public.area               enable row level security;
alter table public.usuario            enable row level security;
alter table public.usuario_rol        enable row level security;
alter table public.usuario_area_apoyo enable row level security;
alter table public.configuracion      enable row level security;
alter table public.serie              enable row level security;
alter table public.auditoria          enable row level security;

-- El propio laboratorio: se ve, no se toca desde el cliente.
create policy tenant_propio on public.tenant
  for select using (id = public.current_tenant_id());

-- Lectura: todo lo del propio laboratorio.
-- Escritura: sólo Administrador.
do $$
declare t text;
begin
  foreach t in array array['sede', 'area', 'configuracion', 'serie']
  loop
    execute format($f$
      create policy %1$s_lectura on public.%1$s
        for select using (tenant_id = public.current_tenant_id());
      create policy %1$s_escritura on public.%1$s
        for all
        using (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'))
        with check (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'));
    $f$, t);
  end loop;
end;
$$;

-- Usuarios: todos ven a sus compañeros (hace falta para asignar tareas);
-- sólo el Administrador da de alta o modifica.
create policy usuario_lectura on public.usuario
  for select using (tenant_id = public.current_tenant_id());
create policy usuario_escritura on public.usuario
  for all
  using (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'))
  with check (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'));

create policy usuario_rol_lectura on public.usuario_rol
  for select using (tenant_id = public.current_tenant_id());
create policy usuario_rol_escritura on public.usuario_rol
  for all
  using (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'))
  with check (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'));

create policy usuario_area_apoyo_lectura on public.usuario_area_apoyo
  for select using (tenant_id = public.current_tenant_id());
create policy usuario_area_apoyo_escritura on public.usuario_area_apoyo
  for all
  using (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'))
  with check (tenant_id = public.current_tenant_id() and public.tiene_rol('administrador'));

-- La bitácora es de sólo lectura, y sólo para Administrador y Gerencia.
-- No hay política de insert, update ni delete: ni siquiera ellos pueden
-- alterarla. Sólo el trigger, que es security definer, escribe en ella.
create policy auditoria_lectura on public.auditoria
  for select using (
    tenant_id = public.current_tenant_id()
    and public.tiene_rol('administrador', 'gerencia')
  );

-- ── 6 · GRANTS ────────────────────────────────────────────────────────
-- RLS filtra FILAS; el GRANT concede acceso a la TABLA. Hacen falta los
-- dos: sin grant, la política no llega a evaluarse y Postgres responde
-- "permission denied". Toda migración nueva debe repetir este bloque.
--
-- `anon` no toca ninguna tabla de negocio: sólo existe para el login.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- ── 6.1 · TABLAS DE SÓLO AÑADIR ───────────────────────────────────────
-- Bitácoras e historiales: los escribe un trigger, nadie los edita.
--
-- El problema que resuelve esto: `grant ... on all tables` es cómodo, pero
-- una migración posterior que lo repita VUELVE A CONCEDER el borrado que
-- ésta acaba de revocar. Pasó de verdad entre 0001 y 0002, y lo detectó la
-- prueba, no la lectura del código.
--
-- Solución: la tabla se marca a sí misma con @append-only en su comentario
-- y esta función revoca sobre todas las marcadas. Cada migración la llama
-- al final. Así la lista se mantiene sola y no hay nada que recordar.
create or replace function public.asegurar_append_only()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare t text;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and coalesce(obj_description(c.oid, 'pg_class'), '') like '%@append-only%'
  loop
    execute format(
      'revoke insert, update, delete on public.%I from authenticated;', t);
  end loop;
end;
$$;

comment on function public.asegurar_append_only is
  'Revoca escritura sobre toda tabla marcada @append-only. Llamar al final de CADA migración.';

comment on table public.auditoria is
  'Sólo lectura para Administrador y Gerencia. No se puede editar ni borrar (RF-210). @append-only';

select public.asegurar_append_only();

-- ── 7 · AUDITORÍA Y updated_at SOBRE LAS TABLAS DE ESTE ARCHIVO ───────
do $$
declare t text;
begin
  foreach t in array array['sede', 'area', 'usuario', 'serie']
  loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.tg_touch_updated_at();', t);
  end loop;

  -- Se auditan los cambios de configuración y de permisos: son las
  -- operaciones donde importa distinguir una decisión de un mantenimiento.
  foreach t in array array['usuario', 'usuario_rol', 'configuracion', 'serie', 'area']
  loop
    execute format(
      'create trigger %1$s_auditar after insert or update or delete on public.%1$s
         for each row execute function public.tg_auditar();', t);
  end loop;
end;
$$;

-- ── 8 · HOOK DEL ACCESS TOKEN ─────────────────────────────────────────
-- Mete tenant_id, roles[] y areas[] en el JWT. Sin esto todas las
-- políticas fallan cerradas y el usuario no ve absolutamente nada.
--
-- El claim es `roles` (array), NO `rol`: un usuario tiene varios roles
-- (AC-01 §7.2) y sus permisos son la unión. Un claim escalar obligaría a
-- inventar roles compuestos, que es justo lo que el análisis descarta.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  u      record;
  v_roles text[];
  v_areas text[];
begin
  select tenant_id, sede_id, area_id, activo
    into u
    from public.usuario
   where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  -- Un usuario desactivado sale con un token sin tenant: las políticas
  -- fallan cerradas y no ve nada, sin necesidad de borrarle la cuenta.
  if u.tenant_id is null or not u.activo then
    return jsonb_set(event, '{claims}', claims);
  end if;

  select array_agg(rol::text order by rol)
    into v_roles
    from public.usuario_rol
   where usuario_id = (event ->> 'user_id')::uuid;

  -- Área principal más aquellas en las que puede apoyar.
  select array_agg(distinct x)
    into v_areas
    from (
      select u.area_id::text as x
      union
      select area_id::text
        from public.usuario_area_apoyo
       where usuario_id = (event ->> 'user_id')::uuid
    ) s
   where x is not null;

  claims := jsonb_set(claims, '{tenant_id}', to_jsonb(u.tenant_id::text));
  claims := jsonb_set(claims, '{roles}',     to_jsonb(coalesce(v_roles, '{}'::text[])));
  claims := jsonb_set(claims, '{areas}',     to_jsonb(coalesce(v_areas, '{}'::text[])));
  claims := jsonb_set(claims, '{sede_id}',   to_jsonb(coalesce(u.sede_id::text, '')));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook is
  'Emite tenant_id, roles[] y areas[] en el JWT. Un usuario inactivo sale sin tenant y no ve nada.';

-- Supabase Auth ejecuta el hook con su propio rol, no con el del usuario.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.usuario, public.usuario_rol, public.usuario_area_apoyo
  to supabase_auth_admin;

-- Auth no pasa por RLS al leer estas tres tablas: es el propio emisor del
-- token, y si RLS lo filtrara no podría construir los claims.
create policy usuario_auth_admin on public.usuario
  for select to supabase_auth_admin using (true);
create policy usuario_rol_auth_admin on public.usuario_rol
  for select to supabase_auth_admin using (true);
create policy usuario_area_apoyo_auth_admin on public.usuario_area_apoyo
  for select to supabase_auth_admin using (true);
