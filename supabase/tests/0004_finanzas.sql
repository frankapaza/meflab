-- ═══════════════════════════════════════════════════════════════════════
-- Pruebas del ciclo del dinero
--
-- Estas pruebas existen para una cosa: comprobar que H-01 está cerrado.
-- El sistema anterior enseñaba TRES cifras distintas de deuda según la
-- pantalla. La prueba 5 es la que lo fija: la suma de los tramos del
-- aging tiene que cuadrar AL CÉNTIMO con el total de la cartera.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
begin;

-- ── montaje ───────────────────────────────────────────────────────────
insert into tenant (id, nombre) values
  ('f1000000-0000-0000-0000-000000000001', 'Lab Finanzas');

insert into area (id, tenant_id, codigo, nombre, es_default)
values ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'GENERAL', 'General', true);

insert into configuracion (tenant_id, clave, valor)
values ('f1000000-0000-0000-0000-000000000001', 'igv', '{"tasa": 0.18}');

insert into serie (tenant_id, tipo_doc, serie) values
  ('f1000000-0000-0000-0000-000000000001', 'FACTURA', 'F001'),
  ('f1000000-0000-0000-0000-000000000001', 'BOLETA', 'B001'),
  ('f1000000-0000-0000-0000-000000000001', 'NOTA_CREDITO', 'FC01'),
  ('f1000000-0000-0000-0000-000000000001', 'NOTA_DEBITO', 'FD01');

insert into cliente (id, tenant_id, tipo, razon_social, numero_documento, dias_credito)
values ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'clinica', 'Clinica de prueba', '20512345671', 30);

-- Una linea de trabajo REAL. La prueba 9 la necesita: sin ella no se
-- puede comprobar que RF-145 bloquea la doble facturacion, ni que una
-- anulacion devuelve el trabajo al circuito.
insert into doctor (id, tenant_id, cliente_id, nombre)
values ('f5000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'f3000000-0000-0000-0000-000000000001', 'Dr. de prueba');

insert into paciente (id, tenant_id, nombre, simplificado)
values ('f6000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'Paciente de prueba', true);

insert into estado_trabajo (id, tenant_id, codigo, nombre, fase, orden, glifo)
values ('f7000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'REC', 'Recibido', 'inicial', 1, '○'),
       ('f7000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001',
        'ENT', 'Entregado', 'final', 9, '■');

insert into categoria_servicio (id, tenant_id, nombre, orden)
values ('f8000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'Fija', 1);

insert into servicio (id, tenant_id, categoria_id, area_id, codigo, nombre, precio_capturado)
values ('f9000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'f8000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001',
        'COR-PRU', 'Corona de prueba', 300.00);

insert into orden_trabajo (
  id, tenant_id, codigo, cliente_id, doctor_id, paciente_id, estado_id, fecha_comprometida)
values ('fa000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'OT-PRUEBA-1', 'f3000000-0000-0000-0000-000000000001',
        'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001',
        'f7000000-0000-0000-0000-000000000002', current_date);

insert into detalle_trabajo (
  id, tenant_id, orden_id, servicio_id, area_id, cantidad, precio_unitario)
values ('fb000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'fa000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-000000000001',
        'f2000000-0000-0000-0000-000000000001', 1, 300.00);

-- Un cajero REAL: caja_sesion.abierta_por es NOT NULL y referencia
-- usuario, que a su vez referencia auth.users. Sin la identidad completa
-- la prueba 11 fallaria por la clave foranea y no por el arqueo.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000', 'f4000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'caja@labfinanzas.pe',
  extensions.crypt('irrelevante', extensions.gen_salt('bf')),
  now(), now(), now(), '{}', '{}', false, false, '', '', '', '', '', '', '', ''
);

insert into usuario (id, tenant_id, nombre, email)
values ('f4000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'Cajero de prueba', 'caja@labfinanzas.pe');

do $$
declare
  n int;
  v_doc uuid;
  v_doc2 uuid;
  v_cxc uuid;
  v_pago uuid;
  v_total numeric(12,2);
  v_saldo numeric(12,2);
  v_suma_tramos numeric(12,2);
  v_estado text;
  v_dif numeric(12,2);
  v_sesion uuid;
begin
  perform set_config(
    'request.jwt.claims',
    '{"tenant_id":"f1000000-0000-0000-0000-000000000001","roles":["recepcion"]}',
    true
  );

  -- ── 1 · D-03 · el IGV se calcula al emitir, no se guarda en el precio ─
  -- El catalogo guarda valor de venta SIN IGV. Una linea de 620.00 tiene
  -- que producir 111.60 de IGV y 731.60 de total.
  v_doc := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura',
    p_serie   => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Corona de zirconio',
      'cantidad', 1,
      'precio_unitario', 620.00
    ))
  );

  select subtotal, igv, total into v_saldo, v_dif, v_total
    from documento_venta where id = v_doc;

  if v_saldo <> 620.00 or v_dif <> 111.60 or v_total <> 731.60 then
    raise exception 'D-03 ROTA: 620.00 deberia dar 620.00 + 111.60 = 731.60, dio % + % = %',
      v_saldo, v_dif, v_total;
  end if;

  raise notice 'OK 1 · D-03 · el IGV se calcula al emitir y el total cuadra';

  -- ── 2 · D-02 · la CxC nace del documento, y sólo de ahí ─────────────
  select id, saldo into v_cxc, v_saldo
    from cuenta_cobrar where documento_id = v_doc;

  if v_cxc is null then
    raise exception 'D-02 ROTA: emitir una factura no genero su cuenta por cobrar';
  end if;

  if v_saldo <> 731.60 then
    raise exception 'La CxC deberia nacer con el total del documento (731.60), nacio con %',
      v_saldo;
  end if;

  -- Y la estructura IMPIDE que la deuda nazca del trabajo: cuenta_cobrar
  -- no tiene ninguna columna que apunte a orden_trabajo.
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'cuenta_cobrar'
     and (column_name like '%orden%' or column_name like '%trabajo%');
  if n <> 0 then
    raise exception 'D-02 ROTA: cuenta_cobrar tiene % columna(s) que apuntan al trabajo', n;
  end if;

  raise notice 'OK 2 · D-02 · la CxC nace del documento y no puede nacer del trabajo';

  -- ── 3 · el saldo lo mantienen los pagos, no la aplicación ───────────
  v_pago := registrar_pago(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_importe => 300.00,
    p_medio   => 'transferencia',
    p_aplicaciones => jsonb_build_array(jsonb_build_object(
      'cuenta_cobrar_id', v_cxc, 'importe', 300.00))
  );

  select saldo, estado into v_saldo, v_estado from cuenta_cobrar where id = v_cxc;
  if v_saldo <> 431.60 then
    raise exception 'Tras pagar 300.00 de 731.60 el saldo deberia ser 431.60, es %', v_saldo;
  end if;
  if v_estado <> 'abierta' then
    raise exception 'Una CxC con saldo no puede estar %', v_estado;
  end if;

  -- No se puede aplicar mas de lo que se debe: es la puerta por la que se
  -- cuela un saldo negativo, y un saldo negativo es deuda inventada.
  begin
    perform registrar_pago(
      p_cliente => 'f3000000-0000-0000-0000-000000000001',
      p_importe => 1000.00,
      p_medio   => 'efectivo',
      p_aplicaciones => jsonb_build_array(jsonb_build_object(
        'cuenta_cobrar_id', v_cxc, 'importe', 999.00))
    );
    raise exception 'La base acepto aplicar 999.00 a un saldo de 431.60';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 3 · el saldo sale de los pagos y no admite sobrepago';

  -- ── 4 · RN-014 · una CxC saldada se cierra sola ─────────────────────
  perform registrar_pago(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_importe => 431.60,
    p_medio   => 'transferencia',
    p_aplicaciones => jsonb_build_array(jsonb_build_object(
      'cuenta_cobrar_id', v_cxc, 'importe', 431.60))
  );

  select saldo, estado into v_saldo, v_estado from cuenta_cobrar where id = v_cxc;
  if v_saldo <> 0 or v_estado <> 'cerrada' then
    raise exception 'RN-014 ROTA: saldo % estado % — deberia ser 0 y cerrada', v_saldo, v_estado;
  end if;

  -- Y al cerrarse SALE de la cartera: una CxC saldada que sigue en
  -- v_cartera es deuda fantasma.
  select count(*) into n from v_cartera where cuenta_cobrar_id = v_cxc;
  if n <> 0 then
    raise exception 'Una CxC cerrada sigue apareciendo en la cartera';
  end if;

  raise notice 'OK 4 · RN-014 · la CxC saldada se cierra sola y sale de la cartera';

  -- ── 5 · H-01 · LA SUMA DE LOS TRAMOS CUADRA AL CÉNTIMO ──────────────
  -- Esta es LA prueba del proyecto. Se crean cuatro documentos que caen
  -- en tramos distintos del aging y se comprueba que la suma de los
  -- tramos es exactamente el total. Si no cuadra, hay dos cifras de deuda
  -- y H-01 sigue abierto.
  for n in 1..4 loop
    v_doc2 := emitir_documento(
      p_cliente => 'f3000000-0000-0000-0000-000000000001',
      p_tipo    => 'factura',
      p_serie   => 'F001',
      p_lineas  => jsonb_build_array(jsonb_build_object(
        'descripcion', 'Trabajo ' || n,
        'cantidad', 1,
        'precio_unitario', (100 * n)::numeric
      ))
    );
    -- Se empujan los vencimientos para repartirlos por los cuatro tramos
    -- de mora: 15, 45, 75 y 120 dias.
    update cuenta_cobrar
       set fecha_vencimiento = (now() at time zone 'America/Lima')::date
                               - (case n when 1 then 15 when 2 then 45 when 3 then 75 else 120 end)
     where documento_id = v_doc2;
  end loop;

  -- Uno mas que aun no vence, para cubrir el tramo 'por_vencer'.
  v_doc2 := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura',
    p_serie   => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Trabajo futuro', 'cantidad', 1, 'precio_unitario', 500.00))
  );

  select coalesce(sum(saldo), 0) into v_total from v_cartera;

  select coalesce(sum(saldo), 0) into v_suma_tramos
    from (
      select sum(saldo) as saldo from v_cartera group by tramo
    ) t;

  if v_total <> v_suma_tramos then
    raise exception 'H-01 ABIERTO: el total es % pero los tramos suman %',
      v_total, v_suma_tramos;
  end if;

  -- Y cada CxC cae en UN tramo y sólo uno: los tramos son excluyentes.
  select count(*) into n from v_cartera;
  select count(*) into v_dif from (
    select cuenta_cobrar_id from v_cartera group by cuenta_cobrar_id having count(*) > 1
  ) t;
  if v_dif <> 0 then
    raise exception 'Hay % CxC que caen en mas de un tramo del aging', v_dif;
  end if;

  -- Los cinco tramos estan representados: si alguno faltara, el reparto
  -- no seria exhaustivo y una deuda podria quedarse sin clasificar.
  select count(distinct tramo) into n from v_cartera;
  if n <> 5 then
    raise exception 'Se esperaban los 5 tramos representados, hay %', n;
  end if;

  raise notice 'OK 5 · H-01 CERRADO · la suma de los tramos cuadra al centimo con el total';

  -- ── 6 · la deuda por cliente sale de la MISMA fuente ────────────────
  -- v_deuda_cliente lee de v_cartera, no de las tablas. Si leyera aparte,
  -- volverian las dos cifras.
  select deuda_total into v_saldo
    from v_deuda_cliente where cliente_id = 'f3000000-0000-0000-0000-000000000001';

  if v_saldo <> v_total then
    raise exception 'La deuda del cliente (%) no coincide con la cartera (%)',
      v_saldo, v_total;
  end if;

  raise notice 'OK 6 · la deuda por cliente y la cartera dan la misma cifra';

  -- ── 7 · RN-013 · anular un documento anula su deuda ─────────────────
  v_doc2 := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'boleta',
    p_serie   => 'B001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'A anular', 'cantidad', 1, 'precio_unitario', 200.00))
  );

  select coalesce(sum(saldo), 0) into v_total from v_cartera;

  update documento_venta
     set estado = 'anulado', anulado_en = now(), motivo_anulacion = 'Error de emision'
   where id = v_doc2;

  select coalesce(sum(saldo), 0) into v_saldo from v_cartera;

  if v_saldo <> v_total - 236.00 then
    raise exception 'Anular una boleta de 236.00 deberia bajar la cartera de % a %, dio %',
      v_total, v_total - 236.00, v_saldo;
  end if;

  raise notice 'OK 7 · RN-013 · una factura anulada deja de ser deuda';

  -- ── 8 · un documento con pagos no se puede anular sin revertirlos ───
  -- Anularlo dejaria dinero cobrado contra una factura que no existe.
  v_doc2 := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura', p_serie => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Con pago', 'cantidad', 1, 'precio_unitario', 100.00))
  );
  select id into v_cxc from cuenta_cobrar where documento_id = v_doc2;

  perform registrar_pago(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_importe => 50.00, p_medio => 'efectivo',
    p_aplicaciones => jsonb_build_array(jsonb_build_object(
      'cuenta_cobrar_id', v_cxc, 'importe', 50.00))
  );

  begin
    update documento_venta
       set estado = 'anulado', anulado_en = now(), motivo_anulacion = 'Prueba'
     where id = v_doc2;
    raise exception 'La base dejo anular un documento que ya tiene pagos aplicados';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 8 · un documento con pagos aplicados no se anula sin revertirlos';

  -- ── 9 · RF-145 · no se factura dos veces la misma linea ─────────────
  -- Y el reverso, que es donde estaba el fallo: si la factura se anula,
  -- el trabajo TIENE que poder volver a facturarse. Bloquearlo para
  -- siempre convierte un error de emision en trabajo regalado.
  v_doc2 := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura', p_serie => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'detalle_trabajo_id', 'fb000000-0000-0000-0000-000000000001',
      'descripcion', 'Corona de prueba', 'cantidad', 1, 'precio_unitario', 300.00))
  );

  -- 9a · la misma linea, otra vez, tiene que rebotar
  begin
    perform emitir_documento(
      p_cliente => 'f3000000-0000-0000-0000-000000000001',
      p_tipo    => 'factura', p_serie => 'F001',
      p_lineas  => jsonb_build_array(jsonb_build_object(
        'detalle_trabajo_id', 'fb000000-0000-0000-0000-000000000001',
        'descripcion', 'Corona de prueba', 'cantidad', 1, 'precio_unitario', 300.00))
    );
    raise exception 'RF-145 roto: se facturo dos veces la misma linea de trabajo';
  exception
    when unique_violation then null;
  end;

  -- 9b · mientras la factura vive, el trabajo NO esta pendiente
  select count(*) into n
    from v_pendiente_facturar
   where orden_id = 'fa000000-0000-0000-0000-000000000001';
  if n <> 0 then
    raise exception 'Un trabajo ya facturado no puede figurar como pendiente de facturar';
  end if;

  -- 9c · al anular, el trabajo vuelve a estar pendiente
  update documento_venta
     set estado = 'anulado', anulado_en = now(), motivo_anulacion = 'Error de emision'
   where id = v_doc2;

  select count(*) into n
    from v_pendiente_facturar
   where orden_id = 'fa000000-0000-0000-0000-000000000001';
  if n <> 1 then
    raise exception 'Tras anular la factura, el trabajo tendria que volver a estar pendiente de facturar';
  end if;

  -- 9d · y se puede volver a facturar de verdad, no solo aparecer en la vista
  perform emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura', p_serie => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'detalle_trabajo_id', 'fb000000-0000-0000-0000-000000000001',
      'descripcion', 'Corona de prueba', 'cantidad', 1, 'precio_unitario', 300.00))
  );

  raise notice 'OK 9 · RF-145 · no se factura dos veces, y anular devuelve el trabajo al circuito';

  -- ── 10 · el anticipo es saldo A FAVOR, no deuda ─────────────────────
  -- Un pago sin aplicar no puede aparecer nunca en la cartera: si lo
  -- hiciera, un cliente que paga por adelantado "deberia" mas.
  select coalesce(sum(saldo), 0) into v_total from v_cartera;

  v_pago := registrar_pago(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_importe => 1000.00,
    p_medio   => 'transferencia',
    p_aplicaciones => '[]'::jsonb
  );

  select sin_aplicar into v_saldo from pago where id = v_pago;
  if v_saldo <> 1000.00 then
    raise exception 'Un pago sin aplicar deberia quedar entero como anticipo, quedo %', v_saldo;
  end if;

  select coalesce(sum(saldo), 0) into v_saldo from v_cartera;
  if v_saldo <> v_total then
    raise exception 'Un anticipo cambio la cartera: de % a %', v_total, v_saldo;
  end if;

  raise notice 'OK 10 · el anticipo es saldo a favor y no toca la cartera';

  -- ── 11 · arqueo de caja ─────────────────────────────────────────────
  insert into caja_sesion (tenant_id, monto_apertura, abierta_por)
  values ('f1000000-0000-0000-0000-000000000001', 100.00, 'f4000000-0000-0000-0000-000000000001')
  returning id into v_sesion;

  insert into caja_movimiento (tenant_id, sesion_id, tipo, categoria, concepto, importe)
  values
    ('f1000000-0000-0000-0000-000000000001', v_sesion, 'ingreso', 'cobranza', 'Cobro', 500.00),
    ('f1000000-0000-0000-0000-000000000001', v_sesion, 'egreso', 'gastos', 'Movilidad', 30.00);

  -- Teorico = 100 + 500 - 30 = 570. Si en el cajon hay 565, faltan 5.
  v_dif := cerrar_caja(v_sesion, 565.00);

  if v_dif <> -5.00 then
    raise exception 'El arqueo deberia dar -5.00 (falta dinero), dio %', v_dif;
  end if;

  select monto_teorico into v_saldo from caja_sesion where id = v_sesion;
  if v_saldo <> 570.00 then
    raise exception 'El teorico deberia ser 570.00, es %', v_saldo;
  end if;

  raise notice 'OK 11 · el arqueo distingue lo teorico de lo fisico y guarda la diferencia con signo';

  -- ── 12 · trabajo entregado sin facturar NO es deuda ─────────────────
  -- Vive en su propia vista. Es la mitad de H-01 que nadie mira: el
  -- control operativo existe, pero no infla la cartera.
  select count(*) into n
    from information_schema.views
   where table_schema = 'public' and table_name = 'v_pendiente_facturar';
  if n <> 1 then
    raise exception 'Falta la vista v_pendiente_facturar';
  end if;

  select coalesce(sum(saldo), 0) into v_saldo from v_cartera;
  if v_saldo <> v_total then
    raise exception 'La cartera cambio sin emitir ni cobrar nada';
  end if;

  raise notice 'OK 12 · el trabajo entregado sin facturar vive aparte de la cartera';

  -- ── 13 · la nota de credito rebaja la deuda del documento que corrige ─
  -- No genera deuda propia: si creara su propia CxC, la cartera contaria
  -- dos veces la misma venta y H-01 volveria por la puerta de atras.
  v_doc2 := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura', p_serie => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Para nota', 'cantidad', 1, 'precio_unitario', 1000.00))
  );
  select id into v_cxc from cuenta_cobrar where documento_id = v_doc2;

  select coalesce(sum(saldo), 0) into v_total from v_cartera;

  -- 1000 + 180 = 1180. Se acredita 236 (200 + IGV).
  perform emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'nota_credito', p_serie => 'FC01',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Descuento por retraso', 'cantidad', 1, 'precio_unitario', 200.00)),
    p_documento_ref => v_doc2,
    p_motivo        => 'Se entrego con dos dias de retraso'
  );

  select saldo into v_saldo from cuenta_cobrar where id = v_cxc;
  if v_saldo <> 944.00 then
    raise exception 'Tras una nota de credito de 236.00 el saldo deberia ser 944.00, es %', v_saldo;
  end if;

  -- 13a · la nota NO crea cuenta por cobrar propia
  select count(*) into n
    from cuenta_cobrar c
    join documento_venta d on d.id = c.documento_id
   where d.tipo in ('nota_credito', 'nota_debito');
  if n <> 0 then
    raise exception 'Una nota de credito no puede tener cuenta por cobrar propia';
  end if;

  -- 13b · la cartera baja exactamente lo acreditado, y sigue cuadrando
  select coalesce(sum(saldo), 0) into v_saldo from v_cartera;
  if v_saldo <> v_total - 236.00 then
    raise exception 'La cartera deberia bajar de % a %, dio %',
      v_total, v_total - 236.00, v_saldo;
  end if;

  raise notice 'OK 13 · la nota de credito rebaja la deuda y no crea deuda propia';

  -- ── 14 · la nota de debito sube la deuda ────────────────────────────
  perform emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'nota_debito', p_serie => 'FD01',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Interes por mora', 'cantidad', 1, 'precio_unitario', 100.00)),
    p_documento_ref => v_doc2,
    p_motivo        => 'Intereses acordados'
  );

  select saldo into v_saldo from cuenta_cobrar where id = v_cxc;
  if v_saldo <> 1062.00 then
    raise exception 'Tras una nota de debito de 118.00 el saldo deberia ser 1062.00, es %', v_saldo;
  end if;

  raise notice 'OK 14 · la nota de debito sube la deuda del documento que corrige';

  -- ── 15 · acreditar mas de lo que se debe genera SALDO A FAVOR ───────
  -- El caso real: el cliente ya pago y el trabajo sale mal. El dinero es
  -- suyo. Si el sistema lo dejara "evaporarse", el laboratorio se quedaria
  -- con dinero que no le corresponde y nadie lo veria.
  perform registrar_pago(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_importe => 1062.00, p_medio => 'transferencia',
    p_aplicaciones => jsonb_build_array(jsonb_build_object(
      'cuenta_cobrar_id', v_cxc, 'importe', 1062.00))
  );

  select saldo, estado into v_saldo, v_estado from cuenta_cobrar where id = v_cxc;
  if v_saldo <> 0 or v_estado <> 'cerrada' then
    raise exception 'La CxC deberia quedar saldada y cerrada, dio saldo % estado %',
      v_saldo, v_estado;
  end if;

  -- Ahora se acredita 590.00 sobre una factura ya pagada del todo.
  perform emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'nota_credito', p_serie => 'FC01',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Rehacer la pieza', 'cantidad', 1, 'precio_unitario', 500.00)),
    p_documento_ref => v_doc2,
    p_motivo        => 'La pieza no ajusto y se rehizo sin cargo'
  );

  -- El saldo a favor sale del pago des-aplicado, no de un pago inventado.
  select coalesce(sum(sin_aplicar), 0) into v_saldo
    from pago
   where cliente_id = 'f3000000-0000-0000-0000-000000000001' and not anulado;

  if v_saldo < 590.00 then
    raise exception 'Acreditar 590.00 sobre una factura pagada deberia dejar ese saldo a favor, hay %',
      v_saldo;
  end if;

  -- Y ese saldo a favor NO puede aparecer nunca como deuda.
  select count(*) into n from v_cartera where cuenta_cobrar_id = v_cxc;
  if n <> 0 then
    raise exception 'Una factura acreditada del todo no puede seguir en la cartera';
  end if;

  raise notice 'OK 15 · acreditar mas de lo debido deja saldo a favor, no deuda negativa';

  -- ── 16 · la linea de credito frena la emision, y se puede autorizar ──
  -- El control vive en la BASE: si viviera solo en el formulario, se
  -- saltaria llamando a la API, y lo que esta en juego es cuanto se fia.
  update cliente set linea_credito = 2000.00
   where id = 'f3000000-0000-0000-0000-000000000001';

  -- Se limpia la cartera para partir de una deuda conocida.
  update cuenta_cobrar set estado = 'anulada', saldo = 0
   where tenant_id = 'f1000000-0000-0000-0000-000000000001';

  -- 1800 + IGV = 2124, por encima de 2000. Tiene que rebotar.
  begin
    perform emitir_documento(
      p_cliente => 'f3000000-0000-0000-0000-000000000001',
      p_tipo    => 'factura', p_serie => 'F001',
      p_lineas  => jsonb_build_array(jsonb_build_object(
        'descripcion', 'Pasa de la linea', 'cantidad', 1, 'precio_unitario', 1800.00))
    );
    raise exception 'La base dejo emitir por encima de la linea de credito';
  exception
    when check_violation then null;
  end;

  -- 16a · con autorizacion SI se emite, y queda escrito quien la dio
  v_doc2 := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura', p_serie => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Pasa de la linea', 'cantidad', 1, 'precio_unitario', 1800.00)),
    p_autorizado_por => 'f4000000-0000-0000-0000-000000000001',
    p_motivo_autorizacion => 'Cliente antiguo, paga siempre; lo autoriza Gerencia'
  );

  select count(*) into n
    from documento_venta
   where id = v_doc2 and autorizado_por is not null and motivo_autorizacion is not null;
  if n <> 1 then
    raise exception 'Emitir sobre la linea de credito tiene que dejar constancia de quien lo autorizo';
  end if;

  -- 16b · autorizar sin motivo no vale: un permiso sin razon no se puede auditar
  begin
    perform emitir_documento(
      p_cliente => 'f3000000-0000-0000-0000-000000000001',
      p_tipo    => 'factura', p_serie => 'F001',
      p_lineas  => jsonb_build_array(jsonb_build_object(
        'descripcion', 'Sin motivo', 'cantidad', 1, 'precio_unitario', 900.00)),
      p_autorizado_por => 'f4000000-0000-0000-0000-000000000001'
    );
    raise exception 'Se autorizo pasar de la linea sin escribir el motivo';
  exception
    when check_violation then null;
  end;

  -- 16c · una nota de credito NO se frena por la linea: baja la deuda
  perform emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'nota_credito', p_serie => 'FC01',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Ajuste', 'cantidad', 1, 'precio_unitario', 100.00)),
    p_documento_ref => v_doc2,
    p_motivo        => 'Ajuste comercial'
  );

  raise notice 'OK 16 · la linea de credito frena la emision salvo autorizacion escrita';

  -- ── 17 · el saldo a favor se aplica, no se duplica ──────────────────
  -- Aplicar un anticipo NO crea un pago nuevo: reparte el que ya entro.
  -- Si creara uno, el laboratorio veria cobrado dos veces el mismo dinero.
  update cliente set linea_credito = null
   where id = 'f3000000-0000-0000-0000-000000000001';

  v_pago := registrar_pago(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_importe => 500.00, p_medio => 'transferencia'
  );

  select sin_aplicar into v_saldo from pago where id = v_pago;
  if v_saldo <> 500.00 then
    raise exception 'Un pago sin aplicar deberia quedar entero como saldo a favor, quedo %', v_saldo;
  end if;

  v_doc2 := emitir_documento(
    p_cliente => 'f3000000-0000-0000-0000-000000000001',
    p_tipo    => 'factura', p_serie => 'F001',
    p_lineas  => jsonb_build_array(jsonb_build_object(
      'descripcion', 'Para aplicar anticipo', 'cantidad', 1, 'precio_unitario', 1000.00))
  );
  select id into v_cxc from cuenta_cobrar where documento_id = v_doc2;

  select count(*) into n from pago where cliente_id = 'f3000000-0000-0000-0000-000000000001';

  perform aplicar_anticipo(v_pago, jsonb_build_array(
    jsonb_build_object('cuenta_cobrar_id', v_cxc, 'importe', 500.00)));

  -- 17a · no nacio ningun pago nuevo
  select count(*) into v_total from pago where cliente_id = 'f3000000-0000-0000-0000-000000000001';
  if v_total <> n then
    raise exception 'Aplicar un anticipo creo un pago nuevo: el dinero se conto dos veces';
  end if;

  -- 17b · el saldo a favor se consumio y la deuda bajo
  select sin_aplicar into v_saldo from pago where id = v_pago;
  if v_saldo <> 0 then
    raise exception 'Tras aplicar los 500 el saldo a favor deberia ser 0, es %', v_saldo;
  end if;

  select saldo into v_saldo from cuenta_cobrar where id = v_cxc;
  if v_saldo <> 680.00 then
    raise exception 'La deuda de 1180 menos 500 deberia ser 680, es %', v_saldo;
  end if;

  -- 17c · no se puede aplicar mas de lo que hay a favor
  begin
    perform aplicar_anticipo(v_pago, jsonb_build_array(
      jsonb_build_object('cuenta_cobrar_id', v_cxc, 'importe', 100.00)));
    raise exception 'Se aplico saldo a favor que ya no existia';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 17 · el saldo a favor se aplica sin duplicar el dinero cobrado';

  -- ── 18 · M-02 · el score sale de la formula y la deuda de v_cartera ──
  select recalcular_scores('f1000000-0000-0000-0000-000000000001') into n;
  if n < 1 then
    raise exception 'recalcular_scores no actualizo ningun cliente';
  end if;

  select score into n from cliente where id = 'f3000000-0000-0000-0000-000000000001';
  if n is null or n < 1 or n > 5 then
    raise exception 'El score tiene que estar entre 1 y 5, dio %', n;
  end if;

  -- 18a · nadie escribe el score a mano; lo pone la funcion
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'cliente'
     and column_name in ('score', 'segmento', 'score_calculado_en');
  if n <> 3 then
    raise exception 'Faltan columnas del score en cliente';
  end if;

  -- 18b · un cliente con mora de mas de 60 dias es moroso, pase lo que pase
  update cuenta_cobrar set fecha_vencimiento = current_date - 75, estado = 'abierta', saldo = 100
   where id = v_cxc;
  perform recalcular_scores('f1000000-0000-0000-0000-000000000001');

  select segmento into v_estado from cliente where id = 'f3000000-0000-0000-0000-000000000001';
  if v_estado <> 'moroso' then
    raise exception 'Con 75 dias de mora el segmento tendria que ser moroso, es %', v_estado;
  end if;

  raise notice 'OK 18 · M-02 · el score se calcula y la mora manda sobre el segmento';

  perform set_config('request.jwt.claims', '', true);
end;
$$;

rollback;

\echo ''
\echo '  ✓ 0004_finanzas · las 18 comprobaciones pasan'
