-- ═══════════════════════════════════════════════════════════════════════
-- MEFLAB · datos semilla para DESARROLLO LOCAL
--
-- No es el seed de producción: crea un usuario con contraseña conocida.
-- El seed real de un laboratorio nuevo son los catálogos (docs/03 §8), sin
-- cuentas — los usuarios los crea el Administrador (docs/03 §4).
-- ═══════════════════════════════════════════════════════════════════════

-- ── laboratorio ───────────────────────────────────────────────────────
insert into public.tenant (id, nombre, ruc) values
  ('a0000000-0000-4000-8000-000000000001', 'Laboratorio Dental Vera', '20512345671');

insert into public.sede (id, tenant_id, codigo, nombre, direccion) values
  ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001',
   'PRINCIPAL', 'Sede principal', 'San Isidro, Lima');

-- D-06: un área única por defecto. Cuando el laboratorio defina las suyas
-- (FIJA, PPR, DIGITAL…) se crean junto a ésta y se reasignan los servicios.
insert into public.area (id, tenant_id, codigo, nombre, es_default, color) values
  ('a0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001',
   'GENERAL', 'General', true, '#0f766e');

-- ── parámetros ────────────────────────────────────────────────────────
-- Nunca en el código: el IGV cambia por decreto, no por despliegue.
insert into public.configuracion (tenant_id, clave, valor, descripcion) values
  ('a0000000-0000-4000-8000-000000000001', 'igv',
   '{"tasa": 0.18}', 'Tasa de IGV vigente'),
  -- Sin esto la mano de obra vale cero y los margenes salen mas altos de lo
  -- que son. No da error: da una cifra tranquilizadora y falsa, que es peor.
  ('a0000000-0000-4000-8000-000000000001', 'costo_hora',
   '{"soles": 18}', 'Costo de una hora de taller, para el costo real por orden'),
  ('a0000000-0000-4000-8000-000000000001', 'dias_credito_default',
   '{"dias": 30}', 'Días de crédito por defecto para un cliente nuevo'),
  ('a0000000-0000-4000-8000-000000000001', 'score_pesos',
   '{"puntualidad":0.40,"morosidad":0.25,"frecuencia":0.15,"recencia":0.10,"volumen":0.10,"retrabajo":-0.20}',
   'Pesos de la fórmula de score (M-02)');

-- Sin serie de FACTURA y BOLETA no se puede emitir nada, y la pantalla de
-- facturación queda inservible sin decir por qué. Las series de venta las
-- autoriza SUNAT: éstas son las de desarrollo, no valen para producción.
insert into public.serie (tenant_id, tipo_doc, serie) values
  ('a0000000-0000-4000-8000-000000000001', 'OT', to_char(now(), 'YYYY')),
  ('a0000000-0000-4000-8000-000000000001', 'FACTURA', 'F001'),
  ('a0000000-0000-4000-8000-000000000001', 'BOLETA', 'B001'),
  ('a0000000-0000-4000-8000-000000000001', 'NOTA_CREDITO', 'FC01'),
  ('a0000000-0000-4000-8000-000000000001', 'NOTA_DEBITO', 'FD01');

-- ── los 10 estados del ciclo real (M-01) ──────────────────────────────
-- Cada uno con su GLIFO: es el glifo, no el color, lo que permite leer el
-- tablero impreso en gris y con daltonismo.
insert into public.estado_trabajo (tenant_id, codigo, nombre, fase, orden, glifo, color) values
  ('a0000000-0000-4000-8000-000000000001', 'recibido',    'Recibido',           'inicial',    1,  '○', '#64748b'),
  ('a0000000-0000-4000-8000-000000000001', 'modelo',      'Modelo / Vaciado',   'productiva', 2,  '◔', '#a16207'),
  ('a0000000-0000-4000-8000-000000000001', 'cad',         'Diseño CAD',         'productiva', 3,  '◑', '#2563eb'),
  ('a0000000-0000-4000-8000-000000000001', 'fabricacion', 'En fabricación',     'productiva', 4,  '◕', '#0f766e'),
  ('a0000000-0000-4000-8000-000000000001', 'ceramica',    'Cerámica / Montaje', 'productiva', 5,  '●', '#7c3aed'),
  ('a0000000-0000-4000-8000-000000000001', 'prueba',      'Prueba en clínica',  'productiva', 6,  '◇', '#c2410c'),
  ('a0000000-0000-4000-8000-000000000001', 'acabado',     'Acabado',            'productiva', 7,  '◈', '#4d7c0f'),
  ('a0000000-0000-4000-8000-000000000001', 'calidad',     'Control de calidad', 'control',    8,  '◆', '#be123c'),
  ('a0000000-0000-4000-8000-000000000001', 'listo',       'Listo para entrega', 'final',      9,  '▣', '#15803d'),
  ('a0000000-0000-4000-8000-000000000001', 'entregado',   'Entregado',          'final',     10,  '■', '#475569');

-- ── listas de precio (D-07) ───────────────────────────────────────────
-- Dos listas capturadas de forma distinta a propósito: es el caso que la
-- decisión pretende soportar.
insert into public.lista_precio (id, tenant_id, nombre, precios_incluyen_igv, es_default) values
  ('a0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000001',
   'Lista base', false, true),
  ('a0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001',
   'Convenio A', true, false);

-- ── catálogo de servicios ─────────────────────────────────────────────
-- Los precios se teclean como los tiene el laboratorio en su tarifario.
-- La lista por defecto captura SIN IGV, así que se guardan tal cual; si
-- mañana se cambia la lista a captura con IGV, el trigger normaliza.
insert into public.categoria_servicio (id, tenant_id, nombre, orden) values
  ('a0000000-0000-4000-8000-000000000050', 'a0000000-0000-4000-8000-000000000001', 'Prótesis fija', 1),
  ('a0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000001', 'Prótesis removible', 2),
  ('a0000000-0000-4000-8000-000000000052', 'a0000000-0000-4000-8000-000000000001', 'Estética', 3),
  ('a0000000-0000-4000-8000-000000000053', 'a0000000-0000-4000-8000-000000000001', 'Implantes', 4),
  ('a0000000-0000-4000-8000-000000000054', 'a0000000-0000-4000-8000-000000000001', 'Ortodoncia', 5);

insert into public.servicio (tenant_id, categoria_id, area_id, codigo, nombre, precio_capturado)
select 'a0000000-0000-4000-8000-000000000001', s.categoria,
       'a0000000-0000-4000-8000-000000000020', s.codigo, s.nombre, s.precio
from (values
  ('a0000000-0000-4000-8000-000000000050'::uuid, 'COR-ZIR',  'Corona de zirconio monolítica',       620.00),
  ('a0000000-0000-4000-8000-000000000050'::uuid, 'COR-EMAX', 'Corona de disilicato de litio',        680.00),
  ('a0000000-0000-4000-8000-000000000050'::uuid, 'COR-MET',  'Corona metal-porcelana',               380.00),
  ('a0000000-0000-4000-8000-000000000050'::uuid, 'INC-ONL',  'Incrustación / onlay',                 340.00),
  ('a0000000-0000-4000-8000-000000000050'::uuid, 'PUE-ZIR',  'Puente de zirconio (por unidad)',      590.00),
  ('a0000000-0000-4000-8000-000000000051'::uuid, 'PPR-ACR',  'Prótesis parcial removible acrílica',  450.00),
  ('a0000000-0000-4000-8000-000000000051'::uuid, 'PPR-CRO',  'Prótesis parcial removible cromo',     880.00),
  ('a0000000-0000-4000-8000-000000000051'::uuid, 'PTO-ACR',  'Prótesis total acrílica',              720.00),
  ('a0000000-0000-4000-8000-000000000052'::uuid, 'CAR-EMAX', 'Carilla de disilicato de litio',       540.00),
  ('a0000000-0000-4000-8000-000000000052'::uuid, 'CAR-COMP', 'Carilla de composite',                 260.00),
  ('a0000000-0000-4000-8000-000000000053'::uuid, 'COR-IMP',  'Corona sobre implante atornillada',    980.00),
  ('a0000000-0000-4000-8000-000000000053'::uuid, 'BAR-HIB',  'Barra híbrida sobre implantes',       2400.00),
  ('a0000000-0000-4000-8000-000000000054'::uuid, 'RET-FIJ',  'Retenedor fijo lingual',               180.00),
  ('a0000000-0000-4000-8000-000000000054'::uuid, 'ALI-TRA',  'Alineador termoformado (por juego)',   320.00)
) as s(categoria, codigo, nombre, precio);

-- ── procesos y flujos de producción (D-04) ────────────────────────────
-- El proceso es el paso; el flujo es la receta de un tipo de trabajo. Sin
-- flujo asignado a un servicio, la orden entra en producción sin ninguna
-- tarea y el tablero se queda vacío.
insert into public.proceso (id, tenant_id, area_id, codigo, nombre, horas_estimadas) values
  ('a0000000-0000-4000-8000-000000000060', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'MODELO',  'Modelo / vaciado',      1.00),
  ('a0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'ESCANEO', 'Escaneo del modelo',    0.50),
  ('a0000000-0000-4000-8000-000000000062', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'CAD',     'Diseño CAD',            1.50),
  ('a0000000-0000-4000-8000-000000000063', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'FRESADO', 'Fresado / sinterizado', 3.00),
  ('a0000000-0000-4000-8000-000000000064', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'CERAMICA','Cerámica y montaje',    2.50),
  ('a0000000-0000-4000-8000-000000000065', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'PRUEBA',  'Prueba en clínica',     0.25),
  ('a0000000-0000-4000-8000-000000000066', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'ENCERADO','Encerado diagnóstico',  1.75),
  ('a0000000-0000-4000-8000-000000000067', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'ACRILIZA','Acrilizado',            2.00),
  ('a0000000-0000-4000-8000-000000000068', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'ACABADO', 'Acabado y pulido',      0.75);

insert into public.flujo_produccion (id, tenant_id, area_id, nombre) values
  ('a0000000-0000-4000-8000-000000000070', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'Corona de zirconio (CAD-CAM)'),
  ('a0000000-0000-4000-8000-000000000071', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'Corona metal-porcelana'),
  ('a0000000-0000-4000-8000-000000000072', 'a0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000020', 'Prótesis removible');

insert into public.flujo_etapa (tenant_id, flujo_id, proceso_id, orden)
select 'a0000000-0000-4000-8000-000000000001', f.flujo, f.proceso, f.orden
from (values
  ('a0000000-0000-4000-8000-000000000070'::uuid, 'a0000000-0000-4000-8000-000000000060'::uuid, 1),
  ('a0000000-0000-4000-8000-000000000070'::uuid, 'a0000000-0000-4000-8000-000000000061'::uuid, 2),
  ('a0000000-0000-4000-8000-000000000070'::uuid, 'a0000000-0000-4000-8000-000000000062'::uuid, 3),
  ('a0000000-0000-4000-8000-000000000070'::uuid, 'a0000000-0000-4000-8000-000000000063'::uuid, 4),
  ('a0000000-0000-4000-8000-000000000070'::uuid, 'a0000000-0000-4000-8000-000000000068'::uuid, 5),
  ('a0000000-0000-4000-8000-000000000071'::uuid, 'a0000000-0000-4000-8000-000000000060'::uuid, 1),
  ('a0000000-0000-4000-8000-000000000071'::uuid, 'a0000000-0000-4000-8000-000000000066'::uuid, 2),
  ('a0000000-0000-4000-8000-000000000071'::uuid, 'a0000000-0000-4000-8000-000000000064'::uuid, 3),
  ('a0000000-0000-4000-8000-000000000071'::uuid, 'a0000000-0000-4000-8000-000000000065'::uuid, 4),
  ('a0000000-0000-4000-8000-000000000071'::uuid, 'a0000000-0000-4000-8000-000000000068'::uuid, 5),
  ('a0000000-0000-4000-8000-000000000072'::uuid, 'a0000000-0000-4000-8000-000000000060'::uuid, 1),
  ('a0000000-0000-4000-8000-000000000072'::uuid, 'a0000000-0000-4000-8000-000000000066'::uuid, 2),
  ('a0000000-0000-4000-8000-000000000072'::uuid, 'a0000000-0000-4000-8000-000000000067'::uuid, 3),
  ('a0000000-0000-4000-8000-000000000072'::uuid, 'a0000000-0000-4000-8000-000000000068'::uuid, 4)
) as f(flujo, proceso, orden);

-- Los servicios que ya tienen receta. Los que no, se ven en el catálogo
-- con el aviso de que entrarían en producción sin ninguna tarea.
update public.servicio set flujo_id = 'a0000000-0000-4000-8000-000000000070'
 where codigo in ('COR-ZIR', 'COR-EMAX', 'PUE-ZIR', 'INC-ONL', 'CAR-EMAX', 'COR-IMP');
update public.servicio set flujo_id = 'a0000000-0000-4000-8000-000000000071'
 where codigo = 'COR-MET';
update public.servicio set flujo_id = 'a0000000-0000-4000-8000-000000000072'
 where codigo in ('PPR-ACR', 'PPR-CRO', 'PTO-ACR');

-- ── escala de color (M-09) ────────────────────────────────────────────
insert into public.escala_color (id, tenant_id, nombre) values
  ('a0000000-0000-4000-8000-000000000040', 'a0000000-0000-4000-8000-000000000001',
   'VITA Classical');

insert into public.color (tenant_id, escala_id, codigo, hex, orden)
select 'a0000000-0000-4000-8000-000000000001',
       'a0000000-0000-4000-8000-000000000040',
       c.codigo, c.hex, c.orden
from (values
  ('A1','#e8ded0',1),('A2','#e2d5c2',2),('A3','#dbcbb2',3),('A3.5','#d2bfa2',4),
  ('A4','#c7b092',5),('B1','#ece4d8',6),('B2','#e5dac6',7),('B3','#ddceb0',8),
  ('B4','#d4c2a0',9),('C1','#ded6ca',10),('C2','#d3c8b8',11),('C3','#c8bba6',12),
  ('C4','#b9a891',13),('D2','#dcd2c4',14),('D3','#d1c5b3',15),('D4','#c5b7a3',16)
) as c(codigo, hex, orden);

-- ── cuenta del sponsor ────────────────────────────────────────────────
-- Ejerce de Gerente General Y de Administrador (AC-01 §2.2, decisión del
-- 16/08). Dos roles sobre una sola cuenta: es exactamente el caso para el
-- que se diseñó el modelo N:M, sin inventar un rol compuesto.
--
-- Recordatorio del riesgo aceptado: la bitácora no podrá distinguir una
-- decisión gerencial de un mantenimiento, y la operación queda sin
-- respaldo. Hay que nombrar un segundo Administrador antes de producción.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  -- GoTrue lee estas columnas como texto: un NULL rompe el login con
  -- "converting NULL to string is unsupported". Han de ir vacías, no nulas.
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000100',
  'authenticated', 'authenticated',
  'sponsor@labvera.pe',
  extensions.crypt('meflab-local-2026', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', false, false,
  '', '', '', '', '', '', '', ''
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  'a0000000-0000-4000-8000-000000000100',
  'a0000000-0000-4000-8000-000000000100',
  '{"sub":"a0000000-0000-4000-8000-000000000100","email":"sponsor@labvera.pe","email_verified":true,"phone_verified":false}',
  'email', now(), now(), now()
);

insert into public.usuario (id, tenant_id, sede_id, area_id, nombre, email) values (
  'a0000000-0000-4000-8000-000000000100',
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000010',
  'a0000000-0000-4000-8000-000000000020',
  'Alberto Vera Ramos', 'sponsor@labvera.pe'
);

insert into public.usuario_rol (tenant_id, usuario_id, rol) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000100', 'gerencia'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000100', 'administrador');

-- Un técnico, para poder probar que ve MENOS que el administrador.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  -- GoTrue lee estas columnas como texto: un NULL rompe el login con
  -- "converting NULL to string is unsupported". Han de ir vacías, no nulas.
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000101',
  'authenticated', 'authenticated',
  'tecnico@labvera.pe',
  extensions.crypt('meflab-local-2026', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', false, false,
  '', '', '', '', '', '', '', ''
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  'a0000000-0000-4000-8000-000000000101',
  'a0000000-0000-4000-8000-000000000101',
  '{"sub":"a0000000-0000-4000-8000-000000000101","email":"tecnico@labvera.pe","email_verified":true,"phone_verified":false}',
  'email', now(), now(), now()
);

insert into public.usuario (id, tenant_id, sede_id, area_id, nombre, email) values (
  'a0000000-0000-4000-8000-000000000101',
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000010',
  'a0000000-0000-4000-8000-000000000020',
  'Carlos Quispe Ninaja', 'tecnico@labvera.pe'
);

insert into public.usuario_rol (tenant_id, usuario_id, rol) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000101', 'tecnico');
