-- ═══════════════════════════════════════════════════════════════════════
-- Pruebas de RLS y auditoría de 0001_core
--
--   npm run db:test
--
-- Falla ruidosamente (exit ≠ 0) si algún control no se cumple. Cubre los
-- puntos 1, 2, 3 y 9 de la lista de verificación de docs/03 §9.
--
-- Se ataca la base DIRECTAMENTE, no a través de la UI: una regla que sólo
-- se prueba desde el front no está probada (regla 7 de CLAUDE.md).
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
begin;

-- ── datos de dos laboratorios distintos ───────────────────────────────
insert into tenant (id, nombre) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Lab Vera'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Lab Rival');

insert into area (tenant_id, codigo, nombre, es_default) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'GENERAL', 'General', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'GENERAL', 'General', true);

insert into configuracion (tenant_id, clave, valor) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'igv', '{"tasa":0.18}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'igv', '{"tasa":0.18}');

update configuracion set valor = '{"tasa":0.20}'
 where tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001';

do $$
declare
  n int;
  t text;
begin
  set local role authenticated;

  -- ── 1 · Ningún laboratorio ve datos de otro ─────────────────────────
  set local request.jwt.claims =
    '{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000001","roles":["administrador"]}';

  select string_agg(nombre, ',') into t from tenant;
  if t is distinct from 'Lab Vera' then
    raise exception 'FUGA ENTRE TENANTS: Lab Vera ve "%"', t;
  end if;

  select count(*) into n from area;
  if n <> 1 then
    raise exception 'FUGA ENTRE TENANTS: Lab Vera ve % areas, esperaba 1', n;
  end if;

  set local request.jwt.claims =
    '{"tenant_id":"bbbbbbbb-0000-0000-0000-000000000002","roles":["administrador"]}';

  select string_agg(nombre, ',') into t from tenant;
  if t is distinct from 'Lab Rival' then
    raise exception 'FUGA ENTRE TENANTS: Lab Rival ve "%"', t;
  end if;

  raise notice 'OK 1 · aislamiento entre laboratorios';

  -- ── 2 · El técnico lee la configuración pero no la escribe ──────────
  set local request.jwt.claims =
    '{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000001","roles":["tecnico"]}';

  select count(*) into n from configuracion;
  if n <> 1 then
    raise exception 'El tecnico deberia leer 1 configuracion, lee %', n;
  end if;

  update configuracion set valor = '{"hack":true}' where clave = 'igv';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'ESCALADA DE PRIVILEGIOS: el tecnico escribio % filas', n;
  end if;

  raise notice 'OK 2 · el tecnico no escribe configuracion';

  -- ── 3 · Los permisos son la UNIÓN de los roles (AC-01 §7.2) ─────────
  set local request.jwt.claims =
    '{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000001","roles":["recepcion","administrador"]}';

  update configuracion set valor = '{"tasa":0.18}' where clave = 'igv';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'UNION DE ROLES ROTA: recepcion+administrador no pudo escribir';
  end if;

  raise notice 'OK 3 · los permisos son la union de los roles';

  -- ── 4 · La bitácora es inalterable, incluso para quien la lee ───────
  set local request.jwt.claims =
    '{"tenant_id":"aaaaaaaa-0000-0000-0000-000000000001","roles":["administrador"]}';

  select count(*) into n from auditoria;
  if n = 0 then
    raise exception 'La auditoria no registro nada';
  end if;

  begin
    delete from auditoria;
    raise exception 'BITACORA ALTERABLE: se pudieron borrar los eventos';
  exception
    when insufficient_privilege then null;
  end;

  raise notice 'OK 4 · la bitacora es inalterable';

  -- ── 5 · El trigger guarda el antes y el después ─────────────────────
  select count(*) into n
    from auditoria
   where tabla = 'configuracion'
     and accion = 'UPDATE'
     and antes ->> 'valor' is not null
     and despues ->> 'valor' is not null;
  if n = 0 then
    raise exception 'La auditoria no guardo el valor anterior y el nuevo';
  end if;

  -- Clave compuesta: configuracion es (tenant_id, clave), no tiene `id`.
  select registro_id into t
    from auditoria where tabla = 'configuracion' limit 1;
  if t not like '%/%' then
    raise exception 'La clave compuesta no se registro bien: "%"', t;
  end if;

  raise notice 'OK 5 · el trigger guarda antes/despues y la clave compuesta';

  reset role;
end;
$$;

rollback;

\echo ''
\echo '  ✓ 0001_core · las 5 comprobaciones pasan'
