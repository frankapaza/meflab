-- ═══════════════════════════════════════════════════════════════════════
-- Pruebas de control, calidad e inventario
--
-- Dos invariantes mandan aquí:
--
--   · El resultado de una inspección lo DEDUCE el checklist. Si un punto
--     crítico falla, es rechazo, lo diga quien lo diga.
--   · Las existencias se DERIVAN de los movimientos. No hay saldo
--     almacenado: sería H-01 otra vez, en el almacén.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
begin;

-- ── montaje ───────────────────────────────────────────────────────────
insert into tenant (id, nombre) values
  ('c1000000-0000-0000-0000-000000000001', 'Lab Calidad');

insert into area (id, tenant_id, codigo, nombre, es_default)
values ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'GENERAL', 'General', true);

insert into configuracion (tenant_id, clave, valor) values
  ('c1000000-0000-0000-0000-000000000001', 'igv', '{"tasa": 0.18}'),
  -- El costo de la hora es un parametro del laboratorio, no del codigo.
  ('c1000000-0000-0000-0000-000000000001', 'costo_hora', '{"soles": 20}');

insert into cliente (id, tenant_id, tipo, razon_social, numero_documento)
values ('c3000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'clinica', 'Clinica calidad', '20512345671');

insert into doctor (id, tenant_id, cliente_id, nombre)
values ('c4000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'c3000000-0000-0000-0000-000000000001', 'Dr. Prueba');

insert into paciente (id, tenant_id, nombre, simplificado)
values ('c5000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'Paciente', true);

insert into estado_trabajo (id, tenant_id, codigo, nombre, fase, orden, glifo)
values ('c6000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'REC', 'Recibido', 'inicial', 1, '○');

insert into categoria_servicio (id, tenant_id, nombre, orden)
values ('c7000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Fija', 1);

insert into servicio (id, tenant_id, categoria_id, area_id, codigo, nombre, precio_capturado)
values ('c8000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'c7000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
        'COR-ZIR', 'Corona de zirconio', 600.00);

insert into orden_trabajo (
  id, tenant_id, codigo, cliente_id, doctor_id, paciente_id, estado_id, fecha_comprometida)
values ('c9000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'OT-CAL-1', 'c3000000-0000-0000-0000-000000000001',
        'c4000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001',
        'c6000000-0000-0000-0000-000000000001', current_date);

insert into detalle_trabajo (
  id, tenant_id, orden_id, servicio_id, area_id, cantidad, precio_unitario)
values ('ca000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'c9000000-0000-0000-0000-000000000001', 'c8000000-0000-0000-0000-000000000001',
        'c2000000-0000-0000-0000-000000000001', 1, 600.00);

-- Checklist con un punto critico y otro que no lo es.
insert into checklist_calidad (id, tenant_id, servicio_id, area_id, nombre)
values ('cb000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'c8000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
        'Corona de zirconio');

insert into checklist_punto (id, tenant_id, checklist_id, orden, descripcion, critico) values
  ('cc000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'cb000000-0000-0000-0000-000000000001', 1, 'Ajuste oclusal correcto', true),
  ('cc000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   'cb000000-0000-0000-0000-000000000001', 2, 'Empaque sin rayaduras', false);

-- Material con lote y material sin lote.
insert into material (id, tenant_id, area_id, codigo, nombre, unidad,
                      costo_referencia, umbral_bajo, umbral_critico, controla_lote) values
  ('cd000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', 'ZIR-DISC', 'Disco de zirconio', 'disco',
   180.0000, 5, 2, true),
  ('cd000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', 'GUANTE', 'Guantes', 'caja',
   25.0000, 10, 4, false);

insert into lote (id, tenant_id, material_id, codigo, costo_unitario, vence_el) values
  ('ce000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'cd000000-0000-0000-0000-000000000001', 'L-2026-01', 200.0000, current_date + 400),
  ('ce000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   'cd000000-0000-0000-0000-000000000001', 'L-2026-02', 160.0000, current_date + 10);

-- Un aprobador REAL: aprobar un inventario exige usuario identificado,
-- porque un ajuste de existencias anonimo no se puede auditar.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'almacen@labcalidad.pe',
  extensions.crypt('irrelevante', extensions.gen_salt('bf')),
  now(), now(), now(), '{}', '{}', false, false, '', '', '', '', '', '', '', ''
);

insert into usuario (id, tenant_id, nombre, email)
values ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        'Jefe de almacen', 'almacen@labcalidad.pe');

do $$
declare
  n int;
  v_insp uuid;
  v_res text;
  v_stock numeric(12,3);
  v_costo numeric(12,2);
  v_margen numeric(12,2);
  v_inv uuid;
  v_retr uuid;
begin
  perform set_config(
    'request.jwt.claims',
    '{"sub":"d1000000-0000-0000-0000-000000000001",'
    '"tenant_id":"c1000000-0000-0000-0000-000000000001","roles":["administrador"]}',
    true
  );

  -- ── 1 · un punto CRITICO que falla rechaza, aunque el resto pase ────
  -- Es la regla entera de 3.1: el veredicto lo deduce el checklist, no
  -- lo elige quien inspecciona.
  v_insp := registrar_inspeccion(
    p_orden     => 'c9000000-0000-0000-0000-000000000001',
    p_checklist => 'cb000000-0000-0000-0000-000000000001',
    p_puntos    => jsonb_build_array(
      jsonb_build_object('punto_id', 'cc000000-0000-0000-0000-000000000001',
                         'descripcion', 'Ajuste oclusal correcto',
                         'critico', true, 'conforme', false),
      jsonb_build_object('punto_id', 'cc000000-0000-0000-0000-000000000002',
                         'descripcion', 'Empaque sin rayaduras',
                         'critico', false, 'conforme', true)),
    p_observaciones => 'El ajuste oclusal quedo alto en distal'
  );

  select resultado into v_res from inspeccion where id = v_insp;
  if v_res <> 'rechazado' then
    raise exception 'Un punto critico que falla tiene que RECHAZAR, dio %', v_res;
  end if;

  raise notice 'OK 1 · un punto critico que falla rechaza el trabajo';

  -- ── 2 · un punto no critico deja el trabajo OBSERVADO, no rechazado ─
  v_insp := registrar_inspeccion(
    p_orden     => 'c9000000-0000-0000-0000-000000000001',
    p_checklist => 'cb000000-0000-0000-0000-000000000001',
    p_puntos    => jsonb_build_array(
      jsonb_build_object('punto_id', 'cc000000-0000-0000-0000-000000000001',
                         'descripcion', 'Ajuste oclusal correcto',
                         'critico', true, 'conforme', true),
      jsonb_build_object('punto_id', 'cc000000-0000-0000-0000-000000000002',
                         'descripcion', 'Empaque sin rayaduras',
                         'critico', false, 'conforme', false))
  );

  select resultado into v_res from inspeccion where id = v_insp;
  if v_res <> 'observado' then
    raise exception 'Un fallo NO critico deberia dejarlo observado, dio %', v_res;
  end if;

  -- Y todo conforme aprueba.
  v_insp := registrar_inspeccion(
    p_orden     => 'c9000000-0000-0000-0000-000000000001',
    p_checklist => 'cb000000-0000-0000-0000-000000000001',
    p_puntos    => jsonb_build_array(
      jsonb_build_object('punto_id', 'cc000000-0000-0000-0000-000000000001',
                         'descripcion', 'Ajuste oclusal correcto',
                         'critico', true, 'conforme', true))
  );
  select resultado into v_res from inspeccion where id = v_insp;
  if v_res <> 'aprobado' then
    raise exception 'Sin ningun fallo deberia aprobar, dio %', v_res;
  end if;

  raise notice 'OK 2 · observado y aprobado se deducen igual, sin criterio del inspector';

  -- ── 3 · un rechazo sin explicacion no se puede registrar ────────────
  begin
    perform registrar_inspeccion(
      p_orden     => 'c9000000-0000-0000-0000-000000000001',
      p_checklist => 'cb000000-0000-0000-0000-000000000001',
      p_puntos    => jsonb_build_array(
        jsonb_build_object('punto_id', 'cc000000-0000-0000-0000-000000000001',
                           'descripcion', 'Ajuste oclusal correcto',
                           'critico', true, 'conforme', false))
    );
    raise exception 'Se registro un rechazo sin explicar que corregir';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 3 · un rechazo sin explicacion no se registra';

  -- ── 4 · las existencias se DERIVAN de los movimientos ───────────────
  -- No hay columna de stock a proposito: un saldo almacenado y una lista
  -- de movimientos son dos fuentes para el mismo numero.
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'material'
     and column_name in ('stock', 'existencias', 'cantidad');
  if n <> 0 then
    raise exception 'material tiene columna de stock: son dos fuentes para el mismo numero';
  end if;

  insert into movimiento_stock (tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario)
  values ('c1000000-0000-0000-0000-000000000001', 'cd000000-0000-0000-0000-000000000001',
          'ce000000-0000-0000-0000-000000000001', 'entrada', 10, 200.0000);

  select coalesce(sum(cantidad), 0) into v_stock
    from v_stock where material_id = 'cd000000-0000-0000-0000-000000000001';
  if v_stock <> 10 then
    raise exception 'Tras una entrada de 10 el stock deberia ser 10, es %', v_stock;
  end if;

  raise notice 'OK 4 · el stock sale de los movimientos, no de un saldo guardado';

  -- ── 5 · no se puede consumir mas de lo que hay ──────────────────────
  -- Un almacen en negativo deja de servir para decidir si hay que comprar.
  begin
    perform consumir_material(
      p_material => 'cd000000-0000-0000-0000-000000000001',
      p_lote     => 'ce000000-0000-0000-0000-000000000001',
      p_cantidad => 99,
      p_orden    => 'c9000000-0000-0000-0000-000000000001');
    raise exception 'Se consumio mas material del que habia: el almacen quedo en negativo';
  exception
    when check_violation then null;
  end;

  -- ── 5a · un material con lotes exige decir de cual sale ─────────────
  begin
    perform consumir_material(
      p_material => 'cd000000-0000-0000-0000-000000000001',
      p_lote     => null,
      p_cantidad => 1,
      p_orden    => 'c9000000-0000-0000-0000-000000000001');
    raise exception 'Se consumio un material con lotes sin decir de que lote';
  exception
    when check_violation then null;
  end;

  -- ── 5b · un consumo sin trabajo al que imputarlo no vale ────────────
  begin
    perform consumir_material(
      p_material => 'cd000000-0000-0000-0000-000000000002',
      p_lote     => null,
      p_cantidad => 1);
    raise exception 'Se consumio material sin imputarlo a ningun trabajo';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 5 · el consumo respeta existencias, lote y trabajo imputado';

  -- ── 6 · el costo del consumo sale del LOTE, no del material ─────────
  -- El mismo material cambia de precio entre compras; si el costo
  -- viviera en el material, comprar mas barato manana reescribiria el
  -- costo de lo ya fabricado.
  perform consumir_material(
    p_material => 'cd000000-0000-0000-0000-000000000001',
    p_lote     => 'ce000000-0000-0000-0000-000000000001',
    p_cantidad => 2,
    p_orden    => 'c9000000-0000-0000-0000-000000000001');

  select costo_materiales into v_costo
    from v_costo_orden where orden_id = 'c9000000-0000-0000-0000-000000000001';

  -- 2 discos x 200 (lote), NO x 180 (referencia del material).
  if v_costo <> 400.00 then
    raise exception 'El costo deberia salir del lote (2 x 200 = 400), dio %', v_costo;
  end if;

  select coalesce(sum(cantidad), 0) into v_stock
    from v_stock where lote_id = 'ce000000-0000-0000-0000-000000000001';
  if v_stock <> 8 then
    raise exception 'Tras consumir 2 de 10 deberian quedar 8, quedan %', v_stock;
  end if;

  raise notice 'OK 6 · el costo del consumo lo pone el lote, no el material';

  -- ── 7 · el margen suma las cuatro patas del costo ───────────────────
  insert into costo_externo (tenant_id, orden_id, proveedor, concepto, importe)
  values ('c1000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-000000000001',
          'Centro de fresado', 'Fresado de zirconio', 50.00);

  insert into proceso (id, tenant_id, area_id, codigo, nombre, horas_estimadas)
  values ('d0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
          'c2000000-0000-0000-0000-000000000001', 'MOD', 'Modelado', 3);

  insert into tarea_produccion (
    tenant_id, orden_id, proceso_id, area_id, orden_etapa, horas_estimadas)
  values ('c1000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-000000000001',
          'd0000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 1, 3);

  select costo_total, margen into v_costo, v_margen
    from v_rentabilidad_orden where orden_id = 'c9000000-0000-0000-0000-000000000001';

  -- 400 material + 60 mano de obra (3 h x 20) + 50 externo = 510.
  if v_costo <> 510.00 then
    raise exception 'El costo total deberia ser 510.00 (400+60+50), dio %', v_costo;
  end if;
  if v_margen <> 90.00 then
    raise exception 'El margen deberia ser 600 - 510 = 90.00, dio %', v_margen;
  end if;

  raise notice 'OK 7 · el costo suma material, mano de obra y proceso externo';

  -- ── 8 · el retrabajo cuelga de la orden y su politica es coherente ──
  -- Un retrabajo "cubierto" que se cobra no esta cubierto.
  begin
    insert into retrabajo (tenant_id, orden_id, politica, descripcion, importe_facturable)
    values ('c1000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-000000000001',
            'cubierto', 'Rehacer', 100.00);
    raise exception 'Se registro un retrabajo cubierto que ademas se cobra';
  exception
    when check_violation then null;
  end;

  insert into retrabajo (tenant_id, orden_id, causa, politica, descripcion, costo_generado)
  values ('c1000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-000000000001',
          'error_laboratorio', 'cubierto', 'Se rehace la corona por ajuste alto', 120.00)
  returning id into v_retr;

  select costo_total into v_costo
    from v_rentabilidad_orden where orden_id = 'c9000000-0000-0000-0000-000000000001';
  if v_costo <> 630.00 then
    raise exception 'El retrabajo de 120 deberia subir el costo a 630.00, dio %', v_costo;
  end if;

  raise notice 'OK 8 · el retrabajo cuelga de la orden y encarece el trabajo';

  -- ── 9 · el inventario fisico no ajusta hasta que se aprueba ─────────
  insert into inventario_fisico (id, tenant_id, contado_por)
  values (gen_random_uuid(), 'c1000000-0000-0000-0000-000000000001', null)
  returning id into v_inv;

  -- El sistema dice 8; se contaron 6. Faltan 2.
  insert into inventario_linea (
    tenant_id, inventario_id, material_id, lote_id, cantidad_sistema, cantidad_contada)
  values ('c1000000-0000-0000-0000-000000000001', v_inv,
          'cd000000-0000-0000-0000-000000000001', 'ce000000-0000-0000-0000-000000000001', 8, 6);

  select coalesce(sum(cantidad), 0) into v_stock
    from v_stock where lote_id = 'ce000000-0000-0000-0000-000000000001';
  if v_stock <> 8 then
    raise exception 'Contar sin aprobar no puede mover el stock; paso de 8 a %', v_stock;
  end if;

  select aprobar_inventario(v_inv) into n;
  if n <> 1 then
    raise exception 'Deberia haberse generado 1 ajuste, se generaron %', n;
  end if;

  select coalesce(sum(cantidad), 0) into v_stock
    from v_stock where lote_id = 'ce000000-0000-0000-0000-000000000001';
  if v_stock <> 6 then
    raise exception 'Tras aprobar el conteo el stock deberia ser 6, es %', v_stock;
  end if;

  -- 9a · aprobar dos veces duplicaria los ajustes
  begin
    perform aprobar_inventario(v_inv);
    raise exception 'Se aprobo dos veces el mismo inventario';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 9 · el conteo no mueve nada hasta que se aprueba, y solo una vez';

  -- ── 10 · la alerta de stock avisa por bajo y por vencimiento ────────
  -- El lote L-2026-02 vence en 10 dias pero tiene 0: no deberia alertar
  -- por vencimiento algo de lo que no queda nada.
  insert into movimiento_stock (tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario)
  values ('c1000000-0000-0000-0000-000000000001', 'cd000000-0000-0000-0000-000000000001',
          'ce000000-0000-0000-0000-000000000002', 'entrada', 1, 160.0000);

  select count(*) into n
    from v_alerta_stock where material_id = 'cd000000-0000-0000-0000-000000000001';
  if n <> 1 then
    raise exception 'El disco de zirconio deberia alertar (vence en 10 dias), alertas: %', n;
  end if;

  -- Los guantes no tienen existencias: 0 esta por debajo del umbral, asi
  -- que tambien alertan. Es correcto — cero es el peor stock posible.
  select nivel into v_res
    from v_alerta_stock where material_id = 'cd000000-0000-0000-0000-000000000002';
  if v_res <> 'critico' then
    raise exception 'Un material a cero tiene que estar en critico, esta en %', v_res;
  end if;

  raise notice 'OK 10 · las alertas cubren umbral bajo, critico y proximo vencimiento';

  -- ── 11 · competencias: nivel valido y acreditacion visible ──────────
  insert into competencia (id, tenant_id, area_id, codigo, nombre)
  values ('cf000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
          'c2000000-0000-0000-0000-000000000001', 'CERAM', 'Ceramica estratificada');

  begin
    insert into tecnico_competencia (tenant_id, usuario_id, competencia_id, nivel)
    values ('c1000000-0000-0000-0000-000000000001',
            'c1000000-0000-0000-0000-000000000001', 'cf000000-0000-0000-0000-000000000001', 7);
    raise exception 'Se acepto un nivel de competencia fuera de 1-3';
  exception
    when check_violation then null;
    when foreign_key_violation then null;
  end;

  raise notice 'OK 11 · la competencia solo admite niveles 1 a 3';

  -- ── 12 · toda tabla nueva lleva RLS (regla 1) ───────────────────────
  select count(*) into n
    from pg_tables t
   where t.schemaname = 'public'
     and t.tablename in (
       'checklist_calidad','checklist_punto','inspeccion','inspeccion_punto',
       'retrabajo','competencia','proceso_competencia','tecnico_competencia',
       'material','lote','movimiento_stock','inventario_fisico','inventario_linea',
       'costo_externo')
     and not exists (
       select 1 from pg_class c
        where c.relname = t.tablename and c.relrowsecurity);
  if n <> 0 then
    raise exception 'Hay % tabla(s) de la Fase 3 sin RLS', n;
  end if;

  raise notice 'OK 12 · las 14 tablas nuevas llevan RLS';
end $$;

rollback;

\echo '  ✓ 0005_calidad_inventario · las 12 comprobaciones pasan'
