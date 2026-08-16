-- ═══════════════════════════════════════════════════════════════════════
-- Pruebas de las reglas de negocio de 0002_operacion
--
-- Cada prueba ataca una decisión concreta del proyecto. Si una falla, la
-- decisión dejó de estar garantizada por la base — y una regla que sólo
-- vive en el front no es una regla (CLAUDE.md, regla 7).
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
begin;

-- ── montaje ───────────────────────────────────────────────────────────
insert into tenant (id, nombre) values ('11111111-0000-0000-0000-000000000001', 'Lab Vera');

insert into area (id, tenant_id, codigo, nombre, es_default)
values ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        'GENERAL', 'General', true);

insert into serie (tenant_id, tipo_doc, serie)
values ('11111111-0000-0000-0000-000000000001', 'OT', to_char(now(), 'YYYY'));

insert into estado_trabajo (id, tenant_id, codigo, nombre, fase, orden, glifo)
values ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        'recibido', 'Recibido', 'inicial', 1, '○');

insert into lista_precio (id, tenant_id, nombre, precios_incluyen_igv, es_default)
values ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        'Lista base', false, true),
       ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
        'Convenio A', true, false);

insert into cliente (id, tenant_id, tipo, razon_social, numero_documento, lista_precio_id)
values ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        'clinica', 'Clínica Dental Sonrisa Plena', '20512345671',
        '44444444-0000-0000-0000-000000000001');

insert into doctor (id, tenant_id, cliente_id, nombre)
values ('66666666-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        '55555555-0000-0000-0000-000000000001', 'Dr. Ramiro Jáuregui');

insert into paciente (id, tenant_id, nombre, simplificado)
values ('77777777-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        'Lucía Mendoza', true);

insert into proceso (id, tenant_id, area_id, codigo, nombre, horas_estimadas) values
  ('88888888-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', 'MODELO', 'Modelo / Vaciado', 1.0),
  ('88888888-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', 'CAD', 'Diseño CAD', 1.5),
  ('88888888-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', 'ACABADO', 'Acabado', 0.5);

insert into flujo_produccion (id, tenant_id, area_id, nombre)
values ('99999999-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001', 'Corona de zirconio');

insert into flujo_etapa (tenant_id, flujo_id, proceso_id, orden) values
  ('11111111-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000001', 1),
  ('11111111-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000002', 2),
  ('11111111-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000003', 3);

insert into servicio (id, tenant_id, area_id, codigo, nombre, precio_capturado, flujo_id)
values ('aaaa0000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001', 'COR-ZIR', 'Corona de Zirconio',
        620.00, '99999999-0000-0000-0000-000000000001');

do $$
declare
  n int;
  v_codigo text;
  v_orden uuid;
  v_doctor_ind uuid;
  v_doc text;
  v_ruido int;
  v_precio numeric;
begin
  -- ── 1 · D-07 · la captura con IGV se normaliza a valor de venta ─────
  v_precio := normalizar_valor_venta(660.80, true, 0.18);
  if v_precio <> 560.00 then
    raise exception 'D-07 ROTA: 660.80 con IGV deberia guardarse como 560.00, dio %', v_precio;
  end if;

  v_precio := normalizar_valor_venta(620.00, false, 0.18);
  if v_precio <> 620.00 then
    raise exception 'D-07 ROTA: un precio sin IGV no debe tocarse, dio %', v_precio;
  end if;

  raise notice 'OK 1 · D-07 · la normalizacion de IGV ocurre al guardar';

  -- ── 2 · M-08 · la pieza dental es FDI validada, no texto libre ──────
  if piezas_fdi_validas(array['16','26','48']) is not true then
    raise exception 'M-08 ROTA: rechaza piezas FDI validas';
  end if;
  foreach v_codigo in array array['19','09','51','abc','1','160'] loop
    if piezas_fdi_validas(array[v_codigo]) then
      raise exception 'M-08 ROTA: acepta la pieza invalida "%"', v_codigo;
    end if;
  end loop;

  begin
    insert into detalle_trabajo (tenant_id, orden_id, servicio_id, precio_unitario, piezas_fdi)
    values ('11111111-0000-0000-0000-000000000001', gen_random_uuid(),
            'aaaa0000-0000-0000-0000-000000000001', 620, array['99']);
    raise exception 'M-08 ROTA: la base acepto una pieza fuera de FDI';
  exception
    when check_violation or foreign_key_violation then null;
  end;

  raise notice 'OK 2 · M-08 · la pieza dental se valida en la base';

  -- ── 3 · RF-040 y RF-095 · correlativos sin salto ────────────────────
  v_codigo := generar_codigo_orden('11111111-0000-0000-0000-000000000001');
  if v_codigo !~ '^OT-\d{4}-\d{6}$' then
    raise exception 'RF-040 ROTA: el codigo "%" no sigue OT-AAAA-NNNNNN', v_codigo;
  end if;
  if generar_codigo_orden('11111111-0000-0000-0000-000000000001') = v_codigo then
    raise exception 'RF-095 ROTA: dos ordenes obtuvieron el mismo correlativo';
  end if;

  raise notice 'OK 3 · RF-040/095 · codigo OT-AAAA-NNNNNN sin repetir';

  -- ── 4 · D-04 · las etapas se instancian desde el flujo ──────────────
  v_orden := gen_random_uuid();
  insert into orden_trabajo (
    id, tenant_id, codigo, cliente_id, doctor_id, paciente_id, estado_id, fecha_comprometida
  ) values (
    v_orden, '11111111-0000-0000-0000-000000000001',
    generar_codigo_orden('11111111-0000-0000-0000-000000000001'),
    '55555555-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001',
    '77777777-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
    current_date + 7
  );

  insert into detalle_trabajo (tenant_id, orden_id, servicio_id, precio_unitario, piezas_fdi)
  values ('11111111-0000-0000-0000-000000000001', v_orden,
          'aaaa0000-0000-0000-0000-000000000001', 620, array['16','26']);

  n := instanciar_etapas(v_orden);
  if n <> 3 then
    raise exception 'D-04 ROTA: el flujo tiene 3 etapas, se instanciaron %', n;
  end if;

  -- El área se hereda del servicio (D-06), no se pide al usuario.
  select count(*) into n from detalle_trabajo where orden_id = v_orden and area_id is null;
  if n <> 0 then
    raise exception 'D-06 ROTA: la linea quedo sin area';
  end if;

  raise notice 'OK 4 · D-04/D-06 · etapas instanciadas y area heredada';

  -- ── 5 · una etapa no se da por completa sin inicio y fin ────────────
  -- Es lo que sostiene los KPI 02, 08 y 09. Si esto cede, el modulo de
  -- produccion se llena de tareas "completas" sin tiempo registrado.
  begin
    update tarea_produccion set estado = 'completa'
     where orden_id = v_orden and orden_etapa = 1;
    raise exception 'D-04 ROTA: se completo una etapa sin inicio ni fin';
  exception
    when check_violation then null;
  end;

  update tarea_produccion
     set estado = 'completa',
         iniciada_en = now() - interval '2 hours',
         terminada_en = now()
   where orden_id = v_orden and orden_etapa = 1;

  select horas_reales into v_precio
    from tarea_produccion where orden_id = v_orden and orden_etapa = 1;
  if v_precio is null or v_precio < 1.9 or v_precio > 2.1 then
    raise exception 'Las horas reales deberian ser ~2.0, dieron %', v_precio;
  end if;

  raise notice 'OK 5 · una etapa completa exige inicio y fin, y calcula horas';

  -- ── 6 · D-01 · el doctor no existe sin cliente ──────────────────────
  begin
    insert into doctor (tenant_id, cliente_id, nombre)
    values ('11111111-0000-0000-0000-000000000001', null, 'Dr. Huérfano');
    raise exception 'D-01 ROTA: se creo un doctor sin cliente';
  exception
    when not_null_violation then null;
  end;

  raise notice 'OK 6 · D-01 · el doctor siempre pertenece a un cliente';

  -- ── 6b · una clinica agrupa VARIOS doctores ─────────────────────────
  -- Es el caso central de D-01: varios doctores, una sola deuda. Si algo
  -- lo impidiera, el modelo comercial entero se cae.
  insert into doctor (tenant_id, cliente_id, nombre) values
    ('11111111-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Dra. Paula Requena'),
    ('11111111-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Dr. Marco Tuesta');

  select count(*) into n from doctor
   where cliente_id = '55555555-0000-0000-0000-000000000001';
  if n < 3 then
    raise exception 'D-01 ROTA: una clinica solo admite % doctor(es)', n;
  end if;

  raise notice 'OK 6b · una clinica agrupa varios doctores con una sola deuda';

  -- ── 7 · D-02 · no existe ninguna columna de deuda en la orden ───────
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'orden_trabajo'
     and (column_name like '%saldo%' or column_name like '%deuda%');
  if n <> 0 then
    raise exception 'D-02 ROTA: orden_trabajo tiene % columna(s) de deuda', n;
  end if;

  raise notice 'OK 7 · D-02 · la orden no guarda deuda, ni una columna';

  -- ── 8 · el cambio de estado deja rastro sin que nadie lo escriba ────
  select count(*) into n from orden_estado_historial where orden_id = v_orden;
  if n <> 1 then
    raise exception 'El alta de la orden deberia dejar 1 evento de estado, dejo %', n;
  end if;

  raise notice 'OK 8 · el historial de estados lo escribe el trigger';

  -- ── 8b · el RUC se valida EN LA BASE, no solo en el formulario ──────
  -- Un RUC mal tecleado llega hasta el comprobante electronico y SUNAT lo
  -- rechaza. Detectarlo aqui cuesta nada.
  if not ruc_valido('20512345671') then
    raise exception 'ruc_valido rechaza un RUC correcto';
  end if;
  if ruc_valido('20512345678') then
    raise exception 'ruc_valido acepta un digito verificador incorrecto';
  end if;
  if ruc_valido('30512345671') then
    raise exception 'ruc_valido acepta un prefijo que no existe';
  end if;

  begin
    insert into cliente (tenant_id, tipo, razon_social, numero_documento)
    values ('11111111-0000-0000-0000-000000000001', 'clinica', 'Clinica Falsa', '20512345678');
    raise exception 'La base acepto un cliente con RUC invalido';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 8b · el RUC se valida en la base, con su digito verificador';

  -- ── 9 · ninguna tabla @append-only conserva permiso de escritura ────
  -- Guarda contra la regresión que ya ocurrió una vez: un
  -- `grant ... on all tables` en una migración posterior reabrió el
  -- borrado de la bitácora que una anterior había cerrado.
  select count(*) into n
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public'
     and c.relkind = 'r'
     and coalesce(obj_description(c.oid, 'pg_class'), '') like '%@append-only%'
     and (
       has_table_privilege('authenticated', c.oid, 'INSERT') or
       has_table_privilege('authenticated', c.oid, 'UPDATE') or
       has_table_privilege('authenticated', c.oid, 'DELETE')
     );
  if n <> 0 then
    raise exception 'REGRESION: % tabla(s) @append-only volvieron a ser escribibles', n;
  end if;

  raise notice 'OK 9 · las bitacoras siguen siendo de solo anadir';

  -- ── 10 · D-01 · el alta de doctor independiente es ATOMICA ──────────
  -- La funcion existe justamente para esto: si crea el cliente y luego
  -- falla el doctor, queda un cliente fantasma que nadie limpia.
  perform set_config(
    'request.jwt.claims',
    '{"tenant_id":"11111111-0000-0000-0000-000000000001"}',
    true
  );

  select registrar_doctor_independiente(
    p_nombre           => 'Dra. Elsa Salcedo',
    p_tipo_documento   => 'RUC',
    p_numero_documento => '10456782341',
    p_colegiatura      => 'COP 31204',
    p_sede_entrega     => 'Miraflores, Lima'
  ) into v_doctor_ind;

  select count(*) into n
    from doctor d
    join cliente c on c.id = d.cliente_id
   where d.id = v_doctor_ind
     and c.tipo = 'doctor_independiente'
     and c.razon_social = 'Dra. Elsa Salcedo'
     and d.sede_entrega = 'Miraflores, Lima';
  if n <> 1 then
    raise exception 'El alta independiente no dejo cliente + doctor enlazados';
  end if;

  raise notice 'OK 10 · D-01 · el doctor independiente nace con su cliente';

  -- ── 10b · y si el documento es invalido, NO queda cliente fantasma ──
  -- Lo que guarda esta prueba es que el error SALGA de la funcion. Si
  -- alguien le metiera un `exception when others then null` alrededor del
  -- insert del doctor, el cliente quedaria creado y la llamada diria que
  -- todo fue bien: exactamente el fantasma que la funcion evita.
  begin
    perform registrar_doctor_independiente(
      p_nombre           => 'Dr. Fantasma',
      p_tipo_documento   => 'RUC',
      p_numero_documento => '20512345678'   -- verificador cambiado
    );
    raise exception 'La base acepto un doctor independiente con RUC invalido';
  exception
    when check_violation then null;
  end;

  select count(*) into n from cliente where razon_social = 'Dr. Fantasma';
  if n <> 0 then
    raise exception 'ATOMICIDAD ROTA: quedaron % cliente(s) fantasma', n;
  end if;

  raise notice 'OK 10b · un alta fallida no deja cliente fantasma';

  -- ── 11 · el tecnico NO ve el documento ni la edad del paciente ──────
  -- El paciente es la unica persona del sistema que no ha consentido
  -- nada: llega en la orden de su odontologo. El tecnico necesita saber
  -- para quien es el trabajo, no quien es.
  insert into paciente (id, tenant_id, nombre, tipo_documento, numero_documento, fecha_nacimiento)
  values ('77777777-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
          'Lucia Mendoza Rios', 'DNI', '45871239', '1990-05-14');

  -- Se ataca con RLS puesta: como `authenticated`, que es el rol con el
  -- que llega cualquier token del navegador. Sin esto la prueba correria
  -- como superusuario y no probaria nada.
  set local role authenticated;

  set local request.jwt.claims =
    '{"tenant_id":"11111111-0000-0000-0000-000000000001","roles":["recepcion"]}';

  select numero_documento into v_doc from v_paciente
   where id = '77777777-0000-0000-0000-000000000002';
  if v_doc is null then
    raise exception 'Recepcion deberia ver el documento del paciente y no lo ve';
  end if;

  set local request.jwt.claims =
    '{"tenant_id":"11111111-0000-0000-0000-000000000001","roles":["tecnico","lider_area"]}';

  select numero_documento into v_doc from v_paciente
   where id = '77777777-0000-0000-0000-000000000002';
  if v_doc is not null then
    raise exception 'FUGA: el tecnico ve el documento del paciente (%)', v_doc;
  end if;

  select count(*) into n from v_paciente
   where id = '77777777-0000-0000-0000-000000000002'
     and (edad is not null or fecha_nacimiento is not null or ve_datos_sensibles);
  if n <> 0 then
    raise exception 'FUGA: el tecnico ve la edad o la fecha de nacimiento del paciente';
  end if;

  -- Pero el nombre si: sin el, el trabajo no se puede identificar.
  select count(*) into n from v_paciente
   where id = '77777777-0000-0000-0000-000000000002' and nombre is not null;
  if n <> 1 then
    raise exception 'El tecnico tiene que ver el nombre del paciente';
  end if;

  -- Y no puede saltarse la vista pidiendo la tabla. El token del tecnico
  -- es el mismo que usa el navegador contra PostgREST: si `paciente`
  -- siguiera siendo legible, la vista seria decoracion.
  select count(*) into n from paciente;
  if n <> 0 then
    raise exception 'FUGA: el tecnico lee % fila(s) directamente de paciente', n;
  end if;

  -- Y la vista no puede convertirse en un agujero entre laboratorios: se
  -- ejecuta saltando RLS, asi que filtra el tenant ella misma.
  set local request.jwt.claims =
    '{"tenant_id":"99999999-9999-9999-9999-999999999999","roles":["administrador"]}';

  select count(*) into n from v_paciente;
  if n <> 0 then
    raise exception 'FUGA ENTRE TENANTS: v_paciente enseña % paciente(s) ajenos', n;
  end if;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  raise notice 'OK 11 · el tecnico ve el nombre del paciente, no su documento';

  -- ── 11b · un paciente completo no puede quedarse sin documento ──────
  -- RN-002 permite registrar solo el nombre, pero entonces hay que
  -- DECLARARLO simplificado. Si no, un paciente sin documento se cuela
  -- como completo y nadie vuelve a completarlo.
  begin
    insert into paciente (tenant_id, nombre, simplificado)
    values ('11111111-0000-0000-0000-000000000001', 'Paciente A Medias', false);
    raise exception 'La base acepto un paciente completo sin documento';
  exception
    when check_violation then null;
  end;

  begin
    insert into paciente (tenant_id, nombre, simplificado, tipo_documento, numero_documento)
    values ('11111111-0000-0000-0000-000000000001', 'Paciente Mal', false, 'DNI', '123');
    raise exception 'La base acepto un paciente con DNI invalido';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 11b · RN-002 · el paciente sin documento se declara simplificado';

  -- ── 12 · D-07 · la normalizacion ocurre AL GUARDAR, no al leer ──────
  -- El servicio de montaje se creo con 620.00 y la lista por defecto
  -- captura SIN IGV: tiene que haberse quedado igual.
  select precio_base into v_precio from servicio
   where id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 620.00 then
    raise exception 'D-07 ROTA: un precio capturado sin IGV se guardo como %', v_precio;
  end if;

  -- Convenio A si captura con IGV: 660.80 tecleados son 560.00 guardados.
  insert into lista_precio_item (tenant_id, lista_precio_id, servicio_id, precio_capturado)
  values ('11111111-0000-0000-0000-000000000001',
          '44444444-0000-0000-0000-000000000002',
          'aaaa0000-0000-0000-0000-000000000001', 660.80);

  select precio into v_precio from lista_precio_item
   where lista_precio_id = '44444444-0000-0000-0000-000000000002'
     and servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 560.00 then
    raise exception 'D-07 ROTA: 660.80 con IGV debio guardarse como 560.00, guardo %', v_precio;
  end if;

  -- Y la misma cifra en la lista que NO captura con IGV se queda igual.
  insert into lista_precio_item (tenant_id, lista_precio_id, servicio_id, precio_capturado)
  values ('11111111-0000-0000-0000-000000000001',
          '44444444-0000-0000-0000-000000000001',
          'aaaa0000-0000-0000-0000-000000000001', 660.80);

  select precio into v_precio from lista_precio_item
   where lista_precio_id = '44444444-0000-0000-0000-000000000001'
     and servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 660.80 then
    raise exception 'D-07 ROTA: un precio sin IGV no debe tocarse, guardo %', v_precio;
  end if;

  raise notice 'OK 12 · D-07 · el modo de captura es de la lista, y se aplica al guardar';

  -- ── 12a · guardar dos veces no vuelve a dividir ─────────────────────
  -- REGRESION REAL: con la normalizacion hecha en sitio, un
  -- `on conflict do update` disparaba el trigger dos veces sobre la misma
  -- fila y S/ 708.00 acababan siendo S/ 508.47 en vez de S/ 600.00. No
  -- fallaba nada: el laboratorio simplemente cobraba de menos.
  insert into lista_precio_item (tenant_id, lista_precio_id, servicio_id, precio_capturado)
  values ('11111111-0000-0000-0000-000000000001',
          '44444444-0000-0000-0000-000000000002',
          'aaaa0000-0000-0000-0000-000000000001', 708.00)
  on conflict (lista_precio_id, servicio_id)
    do update set precio_capturado = excluded.precio_capturado;

  select precio into v_precio from lista_precio_item
   where lista_precio_id = '44444444-0000-0000-0000-000000000002'
     and servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 600.00 then
    raise exception 'REGRESION: un upsert de 708.00 guardo % en vez de 600.00', v_precio;
  end if;

  -- Y repetirlo tal cual tampoco lo mueve.
  insert into lista_precio_item (tenant_id, lista_precio_id, servicio_id, precio_capturado)
  values ('11111111-0000-0000-0000-000000000001',
          '44444444-0000-0000-0000-000000000002',
          'aaaa0000-0000-0000-0000-000000000001', 708.00)
  on conflict (lista_precio_id, servicio_id)
    do update set precio_capturado = excluded.precio_capturado;

  select precio into v_precio from lista_precio_item
   where lista_precio_id = '44444444-0000-0000-0000-000000000002'
     and servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 600.00 then
    raise exception 'REGRESION: guardar dos veces movio el precio a %', v_precio;
  end if;

  raise notice 'OK 12a · guardar dos veces la misma tarifa no vuelve a dividir';

  -- ── 12c · cambiar el modo de captura NO reprecia la tarifa ──────────
  -- Es una preferencia de como se escribe la cifra, no una rebaja. Lo que
  -- se recalcula es lo capturado; el valor de venta se queda quieto.
  update lista_precio set precios_incluyen_igv = false
   where id = '44444444-0000-0000-0000-000000000002';

  select precio into v_precio from lista_precio_item
   where lista_precio_id = '44444444-0000-0000-0000-000000000002'
     and servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 600.00 then
    raise exception 'Cambiar el modo repricio el servicio: % en vez de 600.00', v_precio;
  end if;

  select precio_capturado into v_precio from lista_precio_item
   where lista_precio_id = '44444444-0000-0000-0000-000000000002'
     and servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 600.00 then
    raise exception 'Tras pasar a captura sin IGV deberia teclearse 600.00, no %', v_precio;
  end if;

  update lista_precio set precios_incluyen_igv = true
   where id = '44444444-0000-0000-0000-000000000002';

  select precio_capturado into v_precio from lista_precio_item
   where lista_precio_id = '44444444-0000-0000-0000-000000000002'
     and servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_precio <> 708.00 then
    raise exception 'Al volver a captura con IGV deberia teclearse 708.00, no %', v_precio;
  end if;

  raise notice 'OK 12c · cambiar el modo de captura reescribe la cifra, no el precio';

  -- ── 12b · todo cambio de precio deja rastro ─────────────────────────
  -- Sin historial, subir una tarifa es indistinguible de un dedazo, y a
  -- la pregunta "¿desde cuando cuesta esto?" no responde nadie.
  -- El alta del servicio dejo su movimiento, y solo uno: los de las listas
  -- llevan lista_precio_id y se cuentan aparte.
  select count(*) into n from precio_historial
   where servicio_id = 'aaaa0000-0000-0000-0000-000000000001'
     and lista_precio_id is null;
  if n <> 1 then
    raise exception 'El alta del servicio deberia dejar 1 movimiento, dejo %', n;
  end if;

  select count(*) into n from precio_historial
   where servicio_id = 'aaaa0000-0000-0000-0000-000000000001'
     and lista_precio_id is not null;
  if n < 2 then
    raise exception 'Los precios por lista deberian dejar rastro, hay %', n;
  end if;

  update servicio set precio_capturado = 680.00
   where id = 'aaaa0000-0000-0000-0000-000000000001';

  select count(*) into n from precio_historial
   where servicio_id = 'aaaa0000-0000-0000-0000-000000000001'
     and precio_antes = 620.00 and precio_despues = 680.00;
  if n <> 1 then
    raise exception 'El cambio de 620.00 a 680.00 no quedo registrado';
  end if;

  -- Guardar el mismo precio no es un cambio de precio.
  select count(*) into n from precio_historial
   where servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  update servicio set precio_capturado = 680.00
   where id = 'aaaa0000-0000-0000-0000-000000000001';

  select count(*) into v_ruido from precio_historial
   where servicio_id = 'aaaa0000-0000-0000-0000-000000000001';
  if v_ruido <> n then
    raise exception 'Guardar el mismo precio ensucio el historial (% -> %)', n, v_ruido;
  end if;

  raise notice 'OK 12b · el historial de precios lo escribe el trigger, sin ruido';

  -- ── 13 · siempre hay UNA lista por defecto, y esta activa ───────────
  -- Sin lista por defecto no se sabe en que modo se capturan los precios,
  -- y el catalogo entero deja de poder darse de alta.
  update lista_precio set es_default = true
   where id = '44444444-0000-0000-0000-000000000002';

  -- Filtrado por laboratorio: esta suite corre como superusuario, sin RLS,
  -- y el seed de desarrollo ya dejo sus propias listas en otro tenant.
  select count(*) into n from lista_precio
   where tenant_id = '11111111-0000-0000-0000-000000000001' and es_default;
  if n <> 1 then
    raise exception 'Deberia haber exactamente 1 lista por defecto, hay %', n;
  end if;

  select count(*) into n from lista_precio
   where id = '44444444-0000-0000-0000-000000000002' and es_default;
  if n <> 1 then
    raise exception 'La lista recien nombrada por defecto no lo es';
  end if;

  -- Y la de defecto no se puede retirar sin nombrar antes a otra.
  begin
    update lista_precio set activo = false
     where id = '44444444-0000-0000-0000-000000000002';
    raise exception 'La base dejo desactivar la lista por defecto';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 13 · siempre hay una lista por defecto, y esta activa';

  -- ── 14 · D-04 · reordenar etapas sin chocar ni vaciar el flujo ──────
  -- `unique (flujo_id, orden)` hace que intercambiar la 2 y la 3 fila a
  -- fila choque a mitad de camino, y borrarlas todas desde la aplicacion
  -- deja el flujo VACIO si la reinsercion falla. Un flujo vacio mete las
  -- ordenes en produccion sin ninguna tarea.
  n := fijar_etapas_flujo(
    '99999999-0000-0000-0000-000000000001',
    array[
      '88888888-0000-0000-0000-000000000003',
      '88888888-0000-0000-0000-000000000001',
      '88888888-0000-0000-0000-000000000002'
    ]::uuid[]
  );
  if n <> 3 then
    raise exception 'fijar_etapas_flujo deberia dejar 3 etapas, dejo %', n;
  end if;

  select string_agg(p.codigo, '>' order by fe.orden) into v_codigo
    from flujo_etapa fe join proceso p on p.id = fe.proceso_id
   where fe.flujo_id = '99999999-0000-0000-0000-000000000001';
  if v_codigo <> 'ACABADO>MODELO>CAD' then
    raise exception 'La secuencia quedo como "%", esperaba ACABADO>MODELO>CAD', v_codigo;
  end if;

  -- Un mismo proceso puede repetirse: hay trabajos con dos pruebas en
  -- clinica, y cada una es una etapa que se registra aparte.
  n := fijar_etapas_flujo(
    '99999999-0000-0000-0000-000000000001',
    array[
      '88888888-0000-0000-0000-000000000001',
      '88888888-0000-0000-0000-000000000002',
      '88888888-0000-0000-0000-000000000002',
      '88888888-0000-0000-0000-000000000003'
    ]::uuid[]
  );
  if n <> 4 then
    raise exception 'Un proceso repetido deberia contar como dos etapas, conto %', n;
  end if;

  -- Y las ordenes YA instanciadas no se tocan: las etapas se copian al
  -- registrar la orden, no se leen del flujo cada vez.
  select count(*) into n from tarea_produccion where orden_id = v_orden;
  if n <> 3 then
    raise exception 'Cambiar el flujo movio las tareas de una orden en curso (% tareas)', n;
  end if;

  raise notice 'OK 14 · D-04 · la secuencia se reescribe entera y no toca lo ya instanciado';

  perform set_config('request.jwt.claims', '', true);
end;
$$;

rollback;

\echo ''
\echo '  ✓ 0002_operacion · las 21 comprobaciones pasan'
