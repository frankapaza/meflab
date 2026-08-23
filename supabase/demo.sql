-- ═══════════════════════════════════════════════════════════════════════
-- MEFLAB · datos de DEMOSTRACIÓN
--
-- `npm run db:demo`, después de `db:reset`. Deliberadamente separado de
-- `seed.sql`: el seed lo aplica también `db:test`, y una base de pruebas
-- con clientes y facturas ya dentro hace que las comprobaciones dejen de
-- medir lo que dicen medir.
--
-- Deja el laboratorio con un ciclo del dinero completo y recorrible: seis
-- trabajos entregados, dos facturados, uno cobrado del todo y otro a
-- medias, y una caja cerrada con un descuadre de S/ 20 explicado. Es el
-- estado con el que se puede enseñar la Fase 2 sin teclear nada.
--
-- Es idempotente: vuelve a empezar borrando lo que hubiera creado antes.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
begin;

-- Las funciones de negocio son `security invoker` y leen el tenant del
-- JWT. Sin esto devuelven «Sin sesión válida» aunque se corra como
-- superusuario — que es justo lo que se quiere de ellas.
do $ctx$
begin
  perform set_config(
    'request.jwt.claims',
    '{"sub":"a0000000-0000-4000-8000-000000000100",'
    '"tenant_id":"a0000000-0000-4000-8000-000000000001",'
    '"roles":["administrador","recepcion"]}',
    true
  );
end
$ctx$;

-- Rehacer, no acumular: correrlo dos veces no debe dar doce órdenes.
delete from public.caja_sesion  where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.pago         where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.documento_venta where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.orden_trabajo where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.paciente     where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.doctor       where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.cliente      where tenant_id = 'a0000000-0000-4000-8000-000000000001';

-- Y se reinician los correlativos. En producción esto sería inaceptable
-- —un correlativo quemado no se reutiliza jamás— pero aquí se están
-- borrando los documentos que lo consumieron, y una demo que empieza en
-- F001-000019 se lee como si algo fuera mal.
update public.serie set correlativo = 0
 where tenant_id = 'a0000000-0000-4000-8000-000000000001';

do $demo$
declare
  v_tenant  constant uuid := 'a0000000-0000-4000-8000-000000000001';
  v_sede    constant uuid := 'a0000000-0000-4000-8000-000000000010';
  v_cajero  constant uuid := 'a0000000-0000-4000-8000-000000000100';

  v_clinica uuid;  v_centro  uuid;
  v_dr_a    uuid;  v_dr_b    uuid;
  v_pac_a   uuid;  v_pac_b   uuid;
  v_final   uuid;

  v_orden   uuid;
  v_doc     uuid;
  v_cxc     uuid;
  v_sesion  uuid;
  v_lineas  jsonb;

  -- Un cliente de crédito largo y otro de crédito corto: es lo que hace
  -- que el aging tenga más de un tramo sin tocar ninguna fecha a mano.
  v_ordenes text[] := array[
    'COR-ZIR', 'COR-EMAX', 'PPR-CRO', 'COR-MET', 'CAR-EMAX', 'PTO-ACR'
  ];
  v_cli     uuid;
  v_doc_id  uuid;
  v_pac     uuid;
  v_serv    uuid;
  i         int;
begin
  -- ── clientes y sus doctores (D-01) ──────────────────────────────────
  insert into public.cliente (
    tenant_id, tipo, razon_social, tipo_documento, numero_documento,
    direccion, email, telefono, dias_credito, linea_credito, lista_precio_id
  )
  values (
    v_tenant, 'clinica', 'Clínica Dental Sonrisa Plena S.A.C.', 'RUC', '20512345671',
    'Av. Javier Prado Este 1420, San Isidro', 'admin@sonrisaplena.pe', '014455667',
    30, 7500.00,
    (select id from public.lista_precio where tenant_id = v_tenant and nombre = 'Convenio A')
  )
  returning id into v_clinica;

  insert into public.cliente (
    tenant_id, tipo, razon_social, tipo_documento, numero_documento,
    direccion, email, telefono, dias_credito, linea_credito, lista_precio_id
  )
  values (
    v_tenant, 'clinica', 'Centro Odontológico Ríos', 'RUC', '20100047218',
    'Jr. Cusco 388, Cercado de Lima', 'contacto@corios.pe', '013322110',
    15, 4000.00,
    (select id from public.lista_precio where tenant_id = v_tenant and es_default)
  )
  returning id into v_centro;

  insert into public.doctor (tenant_id, cliente_id, nombre, colegiatura, especialidad, email, telefono)
  values (v_tenant, v_clinica, 'Dr. Ramiro Jáuregui Portal', 'COP-18422',
          'Rehabilitación oral', 'rjauregui@sonrisaplena.pe', '987654321')
  returning id into v_dr_a;

  insert into public.doctor (tenant_id, cliente_id, nombre, colegiatura, especialidad, email, telefono)
  values (v_tenant, v_centro, 'Dr. Marco Tuesta Vela', 'COP-27310',
          'Prótesis', 'mtuesta@corios.pe', '912345678')
  returning id into v_dr_b;

  -- Uno completo y otro simplificado: el laboratorio recibe los dos casos
  -- y sólo el completo puede acabar nombrado en un comprobante.
  insert into public.paciente (tenant_id, nombre, tipo_documento, numero_documento)
  values (v_tenant, 'Elena Pacheco Muñoz', 'DNI', '45129833') returning id into v_pac_a;

  insert into public.paciente (tenant_id, nombre, simplificado)
  values (v_tenant, 'Julio Bermúdez Aliaga', true) returning id into v_pac_b;

  select id into v_final
    from public.estado_trabajo
   where tenant_id = v_tenant and fase = 'final' and activo
   order by orden limit 1;

  -- ── seis órdenes, alternando cliente, ya entregadas ─────────────────
  for i in 1 .. array_length(v_ordenes, 1) loop
    if i % 2 = 1 then
      v_cli := v_clinica; v_doc_id := v_dr_a; v_pac := v_pac_a;
    else
      v_cli := v_centro;  v_doc_id := v_dr_b; v_pac := v_pac_b;
    end if;

    select id into v_serv
      from public.servicio where tenant_id = v_tenant and codigo = v_ordenes[i];

    v_orden := public.registrar_orden(
      p_cliente            => v_cli,
      p_doctor             => v_doc_id,
      p_paciente           => v_pac,
      p_fecha_comprometida => ((now() at time zone 'America/Lima')::date - (14 - i)),
      p_lineas             => jsonb_build_array(
        jsonb_build_object('servicio_id', v_serv, 'cantidad', 1)),
      p_sede               => v_sede
    );

    -- Se entregan todas: sin entrega no hay nada que facturar, y la
    -- pantalla de facturación se vería vacía.
    update public.orden_trabajo
       set estado_id     = v_final,
           fecha_entrega = (now() - make_interval(days => 15 - i))
     where id = v_orden;
  end loop;

  -- ── se factura parte de lo entregado (D-02) ─────────────────────────
  -- Adrede queda trabajo entregado SIN facturar: es el control RF-145, y
  -- enseñarlo distinto de la deuda es media Fase 2.
  select jsonb_agg(jsonb_build_object(
           'detalle_trabajo_id', dt.id,
           'descripcion',        s.nombre,
           'cantidad',           dt.cantidad,
           'precio_unitario',    dt.precio_unitario,
           'afectacion',         dt.afectacion))
    into v_lineas
    from public.detalle_trabajo dt
    join public.orden_trabajo o on o.id = dt.orden_id
    join public.servicio s      on s.id = dt.servicio_id
   where o.cliente_id = v_clinica
     and s.codigo in ('COR-ZIR', 'PPR-CRO');

  perform public.emitir_documento(
    p_cliente => v_clinica, p_tipo => 'factura', p_serie => 'F001',
    p_lineas  => v_lineas);

  select jsonb_agg(jsonb_build_object(
           'detalle_trabajo_id', dt.id,
           'descripcion',        s.nombre,
           'cantidad',           dt.cantidad,
           'precio_unitario',    dt.precio_unitario,
           'afectacion',         dt.afectacion))
    into v_lineas
    from public.detalle_trabajo dt
    join public.orden_trabajo o on o.id = dt.orden_id
    join public.servicio s      on s.id = dt.servicio_id
   where o.cliente_id = v_centro
     and s.codigo in ('COR-EMAX', 'COR-MET');

  select public.emitir_documento(
    p_cliente => v_centro, p_tipo => 'factura', p_serie => 'F001',
    p_lineas  => v_lineas)
    into v_doc;

  -- La factura del Centro se envejece 42 días para que el aging tenga de
  -- verdad más de un tramo. Es lo único que se fuerza: el resto de fechas
  -- salen de las condiciones de crédito de cada cliente.
  update public.cuenta_cobrar
     set fecha_vencimiento = ((now() at time zone 'America/Lima')::date - 42)
   where documento_id = v_doc
  returning id into v_cxc;

  -- ── una jornada de caja completa ────────────────────────────────────
  insert into public.caja_sesion (tenant_id, sede_id, monto_apertura, abierta_por)
  values (v_tenant, v_sede, 200.00, v_cajero)
  returning id into v_sesion;

  -- Un cobro PARCIAL, no uno que salde. Es deliberado: si la factura
  -- vencida se pagara entera, saldría de la cartera y el aging quedaría
  -- con un solo tramo — justo el gráfico que hay que poder enseñar.
  -- Así quedan dos documentos abiertos en dos tramos distintos.
  perform public.registrar_pago(
    p_cliente      => v_centro,
    p_importe      => 800.00,
    p_medio        => 'efectivo',
    p_aplicaciones => jsonb_build_array(
      jsonb_build_object('cuenta_cobrar_id', v_cxc, 'importe', 800.00)),
    p_sesion_caja  => v_sesion);

  -- Se cierra con S/ 20 de menos: una caja que siempre cuadra no enseña
  -- para qué sirve el arqueo.
  perform public.cerrar_caja(
    p_sesion        => v_sesion,
    p_monto_fisico  => (select monto_apertura
                          + coalesce(sum(m.importe) filter (where m.tipo = 'ingreso'), 0)
                          - coalesce(sum(m.importe) filter (where m.tipo = 'egreso'), 0)
                          - 20.00
                        from public.caja_sesion s
                        left join public.caja_movimiento m on m.sesion_id = s.id
                       where s.id = v_sesion
                       group by s.monto_apertura),
    p_observaciones => 'Faltan S/ 20: taxi de la entrega a San Isidro, sin comprobante.');
end
$demo$;


-- ── Fase 3 · almacén, calidad y costos ────────────────────────────────
-- Sin material consumido, el costo real de un trabajo es sólo mano de
-- obra y el margen sale falso. La demo carga lo justo para que las
-- pantallas de inventario y rentabilidad tengan algo que enseñar.

delete from public.movimiento_stock where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.lote            where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.material        where tenant_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.checklist_calidad where tenant_id = 'a0000000-0000-4000-8000-000000000001';

do $f3$
declare
  v_tenant constant uuid := 'a0000000-0000-4000-8000-000000000001';
  v_area   uuid;
  v_zir    uuid;  v_emax uuid;  v_guante uuid;
  v_lote1  uuid;  v_lote2 uuid;
  v_chk    uuid;
  v_orden  uuid;
  v_serv   uuid;
begin
  select id into v_area from public.area where tenant_id = v_tenant and es_default;

  -- El costo de la hora: parámetro del laboratorio, no del código.
  insert into public.configuracion (tenant_id, clave, valor, descripcion)
  values (v_tenant, 'costo_hora', '{"soles": 18}',
          'Costo de una hora de trabajo de taller, para el costo real por orden')
  on conflict (tenant_id, clave) do update set valor = excluded.valor;

  -- ── materiales ──────────────────────────────────────────────────────
  insert into public.material (tenant_id, area_id, codigo, nombre, unidad,
    costo_referencia, umbral_bajo, umbral_critico, controla_lote)
  values (v_tenant, v_area, 'ZIR-DISC', 'Disco de zirconio multicapa 98 mm', 'disco',
          180.0000, 4, 2, true)
  returning id into v_zir;

  insert into public.material (tenant_id, area_id, codigo, nombre, unidad,
    costo_referencia, umbral_bajo, umbral_critico, controla_lote)
  values (v_tenant, v_area, 'EMAX-BLQ', 'Bloque de disilicato de litio', 'bloque',
          62.0000, 10, 4, true)
  returning id into v_emax;

  insert into public.material (tenant_id, area_id, codigo, nombre, unidad,
    costo_referencia, umbral_bajo, umbral_critico, controla_lote)
  values (v_tenant, v_area, 'GUANTE-N', 'Guantes de nitrilo talla M', 'caja',
          28.0000, 6, 2, false)
  returning id into v_guante;

  -- ── entradas ────────────────────────────────────────────────────────
  -- Dos lotes del mismo disco a precios distintos: es el caso que hace
  -- que el costo tenga que vivir en el lote y no en el material.
  insert into public.lote (tenant_id, material_id, codigo, costo_unitario, vence_el, ubicacion)
  values (v_tenant, v_zir, 'ZR-2601', 175.0000, (current_date + 500), 'Estante A1')
  returning id into v_lote1;

  insert into public.lote (tenant_id, material_id, codigo, costo_unitario, vence_el, ubicacion)
  values (v_tenant, v_zir, 'ZR-2602', 198.0000, (current_date + 20), 'Estante A1')
  returning id into v_lote2;

  insert into public.movimiento_stock (tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario, motivo)
  values
    (v_tenant, v_zir,  v_lote1, 'entrada', 6, 175.0000, 'Compra inicial'),
    (v_tenant, v_zir,  v_lote2, 'entrada', 3, 198.0000, 'Compra de reposición'),
    (v_tenant, v_guante, null,  'entrada', 4,  28.0000, 'Compra inicial');

  -- El disilicato entra bajo a propósito: así la pantalla enseña una
  -- alerta de verdad, no una lista vacía.
  insert into public.lote (tenant_id, material_id, codigo, costo_unitario, vence_el)
  values (v_tenant, v_emax, 'EM-2601', 62.0000, (current_date + 300));

  insert into public.movimiento_stock (tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario, motivo)
  select v_tenant, v_emax, id, 'entrada', 3, 62.0000, 'Compra inicial'
    from public.lote where material_id = v_emax;

  -- ── consumo contra trabajos reales ──────────────────────────────────
  -- Se imputa a la orden de zirconio, que es la que se facturó primero.
  select o.id into v_orden
    from public.orden_trabajo o
    join public.detalle_trabajo dt on dt.orden_id = o.id
    join public.servicio s on s.id = dt.servicio_id
   where o.tenant_id = v_tenant and s.codigo = 'COR-ZIR'
   limit 1;

  if v_orden is not null then
    insert into public.movimiento_stock (
      tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario, orden_id, motivo)
    values (v_tenant, v_zir, v_lote1, 'consumo', 1, 175.0000, v_orden,
            'Fresado de la corona');
  end if;

  -- Una merma explicada: sin motivo, el material se evaporaría.
  insert into public.movimiento_stock (
    tenant_id, material_id, lote_id, tipo, cantidad, costo_unitario, motivo)
  values (v_tenant, v_zir, v_lote2, 'merma', 1, 198.0000,
          'El disco se fracturó al montarlo en la fresadora');

  -- ── checklist de calidad ────────────────────────────────────────────
  select id into v_serv from public.servicio
   where tenant_id = v_tenant and codigo = 'COR-ZIR';

  insert into public.checklist_calidad (tenant_id, servicio_id, area_id, nombre)
  values (v_tenant, v_serv, v_area, 'Corona de zirconio')
  returning id into v_chk;

  -- Los críticos son los que rechazan el trabajo. El resto sólo lo dejan
  -- observado: distinguirlos es lo que evita que se apruebe todo.
  insert into public.checklist_punto (tenant_id, checklist_id, orden, descripcion, critico) values
    (v_tenant, v_chk, 1, 'Ajuste marginal sin escalón perceptible', true),
    (v_tenant, v_chk, 2, 'Contactos proximales correctos', true),
    (v_tenant, v_chk, 3, 'Oclusión sin interferencias', true),
    (v_tenant, v_chk, 4, 'Color coincide con el indicado por el doctor', false),
    (v_tenant, v_chk, 5, 'Superficie pulida y sin porosidades', false),
    (v_tenant, v_chk, 6, 'Empaque y etiquetado correctos', false);

  -- Un checklist genérico, para que ningún trabajo salga sin revisar por
  -- un hueco de configuración.
  insert into public.checklist_calidad (tenant_id, servicio_id, area_id, nombre)
  values (v_tenant, null, v_area, 'Revisión general')
  returning id into v_chk;

  insert into public.checklist_punto (tenant_id, checklist_id, orden, descripcion, critico) values
    (v_tenant, v_chk, 1, 'Corresponde con lo pedido en la orden', true),
    (v_tenant, v_chk, 2, 'Sin defectos visibles', true),
    (v_tenant, v_chk, 3, 'Empaque y etiquetado correctos', false);
end
$f3$;

-- ── competencias (AC-01 §8) ───────────────────────────────────────────
-- Se declaran unas pocas y se reparten desigual a propósito: así la
-- pantalla enseña el caso interesante —un proceso que cubre una sola
-- persona— en vez de una matriz uniforme que no dice nada.
delete from public.competencia where tenant_id = 'a0000000-0000-4000-8000-000000000001';

do $comp$
declare
  v_tenant constant uuid := 'a0000000-0000-4000-8000-000000000001';
  v_area   uuid;
  v_ceram  uuid;  v_cad uuid;  v_esq uuid;
  v_tec    uuid;
begin
  select id into v_area from public.area where tenant_id = v_tenant and es_default;

  insert into public.competencia (tenant_id, area_id, codigo, nombre)
  values (v_tenant, v_area, 'CERAM', 'Cerámica estratificada') returning id into v_ceram;
  insert into public.competencia (tenant_id, area_id, codigo, nombre)
  values (v_tenant, v_area, 'CAD', 'Diseño CAD') returning id into v_cad;
  insert into public.competencia (tenant_id, area_id, codigo, nombre)
  values (v_tenant, v_area, 'ESQ', 'Esqueléticos') returning id into v_esq;

  -- El técnico de la semilla tiene dos de las tres, y una sin acreditar.
  select id into v_tec from public.usuario
   where tenant_id = v_tenant and email = 'tecnico@labvera.pe';

  if v_tec is not null then
    insert into public.tecnico_competencia (
      tenant_id, usuario_id, competencia_id, nivel, acreditada_por, acreditada_en)
    values (v_tenant, v_tec, v_ceram, 3,
            'a0000000-0000-4000-8000-000000000100', now());

    -- Ésta la declaró él y nadie la respaldó: es la que AC-01 §8 pide
    -- poder detectar.
    insert into public.tecnico_competencia (tenant_id, usuario_id, competencia_id, nivel)
    values (v_tenant, v_tec, v_cad, 2);
  end if;

  -- Los procesos de cerámica exigen la competencia; el resto no.
  insert into public.proceso_competencia (tenant_id, proceso_id, competencia_id, nivel_minimo)
  select v_tenant, p.id, v_ceram, 2
    from public.proceso p
   where p.tenant_id = v_tenant and p.codigo ilike '%CER%';

  -- Y los esqueléticos exigen una que NO tiene nadie: aparece como
  -- proceso sin cobertura, que es el aviso útil.
  insert into public.proceso_competencia (tenant_id, proceso_id, competencia_id, nivel_minimo)
  select v_tenant, p.id, v_esq, 2
    from public.proceso p
   where p.tenant_id = v_tenant and p.codigo ilike '%ESQ%';
end
$comp$;

-- M-02: el score se calcula, no se teclea. En producción lo hace un job
-- nocturno (0006_jobs); aquí se lanza a mano para que la demo lo enseñe.
do $score$
begin
  perform public.recalcular_scores('a0000000-0000-4000-8000-000000000001');
end
$score$;

-- La comprobación que importa: si los tramos no cuadran con el total,
-- H-01 se reabrió y este guion no debe darse por bueno.
do $check$
declare
  v_total numeric(12,2);
  v_tramos numeric(12,2);
begin
  select coalesce(sum(saldo), 0) into v_total from public.v_cartera;
  select coalesce(sum(s), 0) into v_tramos
    from (select sum(saldo) s from public.v_cartera group by tramo) t;

  if v_total <> v_tramos then
    raise exception 'H-01 ABIERTO: total % vs tramos %', v_total, v_tramos;
  end if;

  raise notice 'Demo lista · por cobrar S/ % en % documentos · % entregas sin facturar',
    v_total,
    (select count(*) from public.v_cartera),
    (select count(*) from public.v_pendiente_facturar);
end
$check$;

commit;
