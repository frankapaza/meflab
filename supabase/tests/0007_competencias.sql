-- ═══════════════════════════════════════════════════════════════════════
-- Pruebas de competencias y asignación sugerida (AC-01 §8)
--
-- Lo que se protege aquí es que la sugerencia siga sirviendo cuando la
-- configuración está incompleta. El laboratorio todavía no ha declarado
-- sus competencias —es una decisión abierta— y una función que devuelva
-- vacío en ese caso deja la pantalla de asignación inservible el primer
-- día.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
begin;

insert into tenant (id, nombre) values
  ('e1000000-0000-0000-0000-000000000001', 'Lab Competencias');

insert into area (id, tenant_id, codigo, nombre, es_default)
values ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
        'GENERAL', 'General', true);

insert into proceso (id, tenant_id, area_id, codigo, nombre, horas_estimadas) values
  ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   'e2000000-0000-0000-0000-000000000001', 'CER', 'Ceramica estratificada', 4),
  ('e3000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001',
   'e2000000-0000-0000-0000-000000000001', 'PUL', 'Pulido', 1);

insert into competencia (id, tenant_id, area_id, codigo, nombre)
values ('e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
        'e2000000-0000-0000-0000-000000000001', 'CERAM', 'Ceramica estratificada');

-- Tres tecnicos: uno experto, uno justo en el minimo, y uno que no la
-- tiene declarada.
do $montaje$
declare
  v_ids uuid[] := array[
    'e5000000-0000-0000-0000-000000000001'::uuid,
    'e5000000-0000-0000-0000-000000000002'::uuid,
    'e5000000-0000-0000-0000-000000000003'::uuid];
  v_nombres text[] := array['Ana Experta', 'Beto Justo', 'Caro SinDeclarar'];
  i int;
begin
  for i in 1..3 loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_ids[i],
      'authenticated', 'authenticated', 'tec' || i || '@labcomp.pe',
      extensions.crypt('irrelevante', extensions.gen_salt('bf')),
      now(), now(), now(), '{}', '{}', false, false, '', '', '', '', '', '', '', ''
    );

    insert into usuario (id, tenant_id, area_id, nombre, email)
    values (v_ids[i], 'e1000000-0000-0000-0000-000000000001',
            'e2000000-0000-0000-0000-000000000001', v_nombres[i],
            'tec' || i || '@labcomp.pe');

    insert into usuario_rol (tenant_id, usuario_id, rol)
    values ('e1000000-0000-0000-0000-000000000001', v_ids[i], 'tecnico');
  end loop;
end
$montaje$;

do $$
declare
  n int;
  v_primero text;
  v_cumple boolean;
  v_motivo text;
begin
  perform set_config(
    'request.jwt.claims',
    '{"tenant_id":"e1000000-0000-0000-0000-000000000001","roles":["lider_laboratorio"]}',
    true
  );

  -- ── 1 · sin competencias declaradas, ordena por CARGA ───────────────
  -- Es el estado real del laboratorio hoy. Si aqui devolviera vacio, la
  -- pantalla de asignacion no serviria hasta que alguien configurase
  -- todas las competencias — y nadie configura nada un lunes por la
  -- manana con trabajo esperando.
  select count(*) into n from sugerir_tecnico('e3000000-0000-0000-0000-000000000002');
  if n <> 3 then
    raise exception 'Sin competencias declaradas deberia sugerir a los 3 tecnicos, sugirio %', n;
  end if;

  select cumple, motivo into v_cumple, v_motivo
    from sugerir_tecnico('e3000000-0000-0000-0000-000000000002') limit 1;
  if not v_cumple then
    raise exception 'Sin competencia exigida todos deberian cumplir';
  end if;
  if v_motivo not like '%no exige competencia%' then
    raise exception 'El motivo deberia explicar que el proceso no exige competencia, dice: %', v_motivo;
  end if;

  raise notice 'OK 1 · sin competencias declaradas la sugerencia sigue sirviendo, por carga';

  -- ── 2 · con competencia exigida, los que cumplen van primero ────────
  insert into proceso_competencia (tenant_id, proceso_id, competencia_id, nivel_minimo)
  values ('e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
          'e4000000-0000-0000-0000-000000000001', 2);

  insert into tecnico_competencia (tenant_id, usuario_id, competencia_id, nivel, acreditada_por, acreditada_en)
  values ('e1000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001',
          'e4000000-0000-0000-0000-000000000001', 3,
          'e5000000-0000-0000-0000-000000000001', now());

  -- Beto la tiene al minimo, pero SIN acreditar.
  insert into tecnico_competencia (tenant_id, usuario_id, competencia_id, nivel)
  values ('e1000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000002',
          'e4000000-0000-0000-0000-000000000001', 2);

  select count(*) into n
    from sugerir_tecnico('e3000000-0000-0000-0000-000000000001') where cumple;
  if n <> 2 then
    raise exception 'Deberian cumplir 2 de 3 tecnicos, cumplen %', n;
  end if;

  -- Caro no la tiene: no se la esconde, se la baja y se explica.
  select cumple, motivo into v_cumple, v_motivo
    from sugerir_tecnico('e3000000-0000-0000-0000-000000000001')
   where usuario_id = 'e5000000-0000-0000-0000-000000000003';
  if v_cumple then
    raise exception 'Quien no tiene la competencia no puede aparecer como que cumple';
  end if;
  if v_motivo not like '%No tiene declarada%' then
    raise exception 'El motivo deberia decir que no la tiene declarada, dice: %', v_motivo;
  end if;

  raise notice 'OK 2 · los que cumplen van primero y se explica por que no cumplen los demas';

  -- ── 3 · a igualdad de competencia manda la CARGA, no el nivel ───────
  -- Ordenar por nivel antes que por carga satura siempre al mejor, que
  -- es exactamente como se quema al que mas sabe.
  insert into cliente (id, tenant_id, tipo, razon_social, numero_documento)
  values ('e7000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
          'clinica', 'Cli', '20512345671');

  insert into doctor (id, tenant_id, cliente_id, nombre)
  values ('e8000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
          'e7000000-0000-0000-0000-000000000001', 'Dr');

  insert into paciente (id, tenant_id, nombre, simplificado)
  values ('e9000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
          'Pac', true);

  insert into estado_trabajo (id, tenant_id, codigo, nombre, fase, orden, glifo)
  values ('ea000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
          'REC', 'Rec', 'inicial', 1, 'o');

  insert into orden_trabajo (
    id, tenant_id, codigo, cliente_id, doctor_id, paciente_id, estado_id, fecha_comprometida)
  values ('e6000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
          'OT-COMP-1', 'e7000000-0000-0000-0000-000000000001',
          'e8000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-000000000001',
          'ea000000-0000-0000-0000-000000000001', current_date);

  -- Ana, la experta, queda cargada con 8 horas.
  insert into tarea_produccion (
    tenant_id, orden_id, proceso_id, area_id, tecnico_id, orden_etapa, estado, horas_estimadas)
  values ('e1000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
          'e3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001',
          'e5000000-0000-0000-0000-000000000001', 1, 'asignada', 8);

  select nombre into v_primero
    from sugerir_tecnico('e3000000-0000-0000-0000-000000000001') limit 1;

  if v_primero <> 'Beto Justo' then
    raise exception 'Con Ana cargada, el primero deberia ser Beto (cumple y libre), es %', v_primero;
  end if;

  raise notice 'OK 3 · a igualdad de competencia manda la carga: no se satura al que mas sabe';

  -- ── 4 · la competencia sin acreditar se puede detectar (AC-01 §8) ───
  select count(*) into n from v_competencia_sin_acreditar;
  if n <> 1 then
    raise exception 'Deberia haber 1 competencia sin acreditar (la de Beto), hay %', n;
  end if;

  select motivo into v_motivo
    from sugerir_tecnico('e3000000-0000-0000-0000-000000000001')
   where usuario_id = 'e5000000-0000-0000-0000-000000000002';
  if v_motivo not like '%SIN acreditar%' then
    raise exception 'La sugerencia deberia avisar de que no esta acreditada, dice: %', v_motivo;
  end if;

  raise notice 'OK 4 · una competencia declarada y sin respaldo se detecta y se avisa';

  -- ── 5 · un proceso que cubre uno o nadie es un riesgo visible ───────
  -- El dia que esa persona falte, ese proceso se para. Verlo antes es
  -- toda la diferencia.
  select count(*) into n
    from v_proceso_sin_cobertura where proceso_id = 'e3000000-0000-0000-0000-000000000001';
  if n <> 0 then
    raise exception 'Con 2 tecnicos que cubren no deberia figurar como riesgo';
  end if;

  -- Se sube el minimo a 3: solo Ana lo cubre.
  update proceso_competencia set nivel_minimo = 3
   where proceso_id = 'e3000000-0000-0000-0000-000000000001';

  select tecnicos_que_cubren into n
    from v_proceso_sin_cobertura where proceso_id = 'e3000000-0000-0000-0000-000000000001';
  if n <> 1 then
    raise exception 'Con nivel minimo 3 solo deberia cubrirlo 1 tecnico, cubren %', n;
  end if;

  raise notice 'OK 5 · un proceso que cubre una sola persona aparece como riesgo';

  -- ── 6 · el nivel solo admite 1 a 3 ──────────────────────────────────
  begin
    update tecnico_competencia set nivel = 0
     where usuario_id = 'e5000000-0000-0000-0000-000000000001';
    raise exception 'Se acepto un nivel de competencia fuera de 1-3';
  exception
    when check_violation then null;
  end;

  raise notice 'OK 6 · el nivel de competencia solo admite 1, 2 o 3';
end $$;

rollback;

\echo '  ✓ 0007_competencias · las 6 comprobaciones pasan'
