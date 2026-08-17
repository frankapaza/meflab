-- ═══════════════════════════════════════════════════════════════════════
-- Pruebas del almacenamiento de adjuntos
--
-- La regla 1 no se suspende porque el dato viva en Storage: el
-- aislamiento entre laboratorios tiene que valer también para los
-- archivos, y allí el mecanismo es una CONVENCIÓN DE RUTA, no una
-- columna. Eso lo hace más frágil, así que se ataca directamente.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
begin;

insert into tenant (id, nombre) values
  ('aaaa1111-0000-0000-0000-000000000001', 'Lab Vera'),
  ('bbbb2222-0000-0000-0000-000000000002', 'Lab Rival');

do $$
declare
  n int;
  v_limite bigint;
  v_publico boolean;
begin
  -- ── 1 · el bucket es privado y admite un STL de arcada completa ─────
  select public, file_size_limit into v_publico, v_limite
    from storage.buckets where id = 'adjuntos';

  if v_publico then
    raise exception 'FUGA: el bucket de adjuntos es PUBLICO. Un adjunto lleva el nombre del paciente.';
  end if;

  if v_limite < 100 * 1024 * 1024 then
    raise exception 'El limite por archivo es % bytes: un STL de arcada completa no cabe', v_limite;
  end if;

  raise notice 'OK 1 · el bucket es privado y acepta 100 MiB por archivo';

  -- ── 2 · la politica usa el PRIMER segmento de la ruta ───────────────
  -- Es lo que sostiene el aislamiento. Si alguien cambiara la convencion
  -- de ruta sin tocar la politica, se caeria en silencio.
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('adjuntos_lectura','adjuntos_subida','adjuntos_borrado');
  if n <> 3 then
    raise exception 'Faltan politicas de adjuntos: hay % de 3', n;
  end if;

  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'adjuntos_lectura'
     and coalesce(qual, '') like '%foldername%'
     and coalesce(qual, '') like '%current_tenant_id%';
  if n <> 1 then
    raise exception 'La politica de lectura no ata la ruta al laboratorio';
  end if;

  raise notice 'OK 2 · la ruta ata cada archivo a su laboratorio';

  -- ── 3 · el tecnico LEE adjuntos pero no los sube ni los borra ───────
  -- Un tecnico no anade la prescripcion de un doctor, y borrar un adjunto
  -- es perder la prueba de lo que se pidio.
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'adjuntos_subida'
     and coalesce(with_check, '') like '%tiene_rol%';
  if n <> 1 then
    raise exception 'Cualquiera con sesion puede subir adjuntos';
  end if;

  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'adjuntos_borrado'
     and coalesce(qual, '') like '%administrador%';
  if n <> 1 then
    raise exception 'El borrado de adjuntos no esta restringido al Administrador';
  end if;

  raise notice 'OK 3 · subir y borrar estan restringidos por rol';
end;
$$;

-- ── 4 · la evidencia de entrega es de ESA orden ───────────────────────
-- Adjuntar como prueba la foto de otro trabajo es peor que no tener
-- ninguna: parece que hay evidencia y no la hay.
insert into area (id, tenant_id, codigo, nombre, es_default)
values ('cccc3333-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'GENERAL', 'General', true);

insert into serie (tenant_id, tipo_doc, serie)
values ('aaaa1111-0000-0000-0000-000000000001', 'OT', to_char(now(), 'YYYY'));

insert into estado_trabajo (id, tenant_id, codigo, nombre, fase, orden, glifo)
values ('dddd4444-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001',
        'recibido', 'Recibido', 'inicial', 1, '○');

insert into cliente (id, tenant_id, tipo, razon_social, numero_documento)
values ('eeee5555-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001',
        'clinica', 'Clinica de prueba', '20512345671');

insert into doctor (id, tenant_id, cliente_id, nombre)
values ('ffff6666-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001',
        'eeee5555-0000-0000-0000-000000000001', 'Dr. Prueba');

insert into paciente (id, tenant_id, nombre, simplificado)
values ('1111aaaa-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001',
        'Paciente de prueba', true);

insert into orden_trabajo (id, tenant_id, codigo, cliente_id, doctor_id, paciente_id, estado_id, fecha_comprometida) values
  ('2222bbbb-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'OT-TEST-000001',
   'eeee5555-0000-0000-0000-000000000001', 'ffff6666-0000-0000-0000-000000000001',
   '1111aaaa-0000-0000-0000-000000000001', 'dddd4444-0000-0000-0000-000000000001', current_date + 5),
  ('2222bbbb-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 'OT-TEST-000002',
   'eeee5555-0000-0000-0000-000000000001', 'ffff6666-0000-0000-0000-000000000001',
   '1111aaaa-0000-0000-0000-000000000001', 'dddd4444-0000-0000-0000-000000000001', current_date + 5);

insert into archivo (id, tenant_id, orden_id, bucket, ruta, nombre)
values ('3333cccc-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001',
        '2222bbbb-0000-0000-0000-000000000002', 'adjuntos',
        'aaaa1111-0000-0000-0000-000000000001/2222bbbb-0000-0000-0000-000000000002/foto.jpg',
        'foto.jpg');

do $$
declare n int;
begin
  begin
    insert into entrega (tenant_id, orden_id, receptor, metodo, evidencia_id)
    values ('aaaa1111-0000-0000-0000-000000000001', '2222bbbb-0000-0000-0000-000000000001',
            'Quien sea', 'mostrador', '3333cccc-0000-0000-0000-000000000001');
    raise exception 'La base acepto como evidencia el adjunto de OTRA orden';
  exception
    when check_violation then null;
  end;

  -- Y con el adjunto correcto, entra.
  insert into entrega (tenant_id, orden_id, receptor, metodo, evidencia_id)
  values ('aaaa1111-0000-0000-0000-000000000001', '2222bbbb-0000-0000-0000-000000000002',
          'Srta. Requena', 'mostrador', '3333cccc-0000-0000-0000-000000000001');

  select count(*) into n from entrega where evidencia_id is not null;
  if n <> 1 then
    raise exception 'La entrega con evidencia correcta no se guardo';
  end if;

  raise notice 'OK 4 · la evidencia tiene que ser un adjunto de esa misma orden';
end;
$$;

rollback;

\echo ''
\echo '  ✓ 0003_almacenamiento · las 4 comprobaciones pasan'
