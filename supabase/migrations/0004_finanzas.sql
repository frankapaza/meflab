-- ═══════════════════════════════════════════════════════════════════════
-- 0004 · CICLO DEL DINERO  (Fase 2)
--
-- Este archivo existe para cerrar H-01: el sistema anterior enseñaba TRES
-- cifras distintas de deuda para el mismo negocio, según la pantalla que
-- se mirara (S/ 7 150 en doctores, S/ 4 230 en cobranzas, S/ 4 970 en
-- facturas). La causa raíz era que la deuda podía nacer del TRABAJO y
-- también de la FACTURA, sin conciliación entre las dos.
--
-- La corrección es estructural, no un informe que cuadre las cifras:
--
--   D-02 · La cuenta por cobrar nace EXCLUSIVAMENTE del documento de
--          venta. El saldo de un trabajo no es deuda: es información
--          operativa sobre anticipos.
--
--   Regla de oro · Ningún indicador de deuda se calcula sumando saldos de
--          trabajos. Todo lee de `v_cartera`.
--
-- Por eso `cuenta_cobrar` cuelga de `documento_venta` con una FK NOT NULL
-- y no tiene ninguna columna que apunte a `orden_trabajo`. La estructura
-- hace imposible el error, en vez de confiar en que nadie lo cometa.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · TIPOS ─────────────────────────────────────────────────────────

create type tipo_documento as enum ('factura', 'boleta', 'nota_credito', 'nota_debito');

-- El documento nace 'emitido'. 'anulado' elimina su CxC (RN-013).
create type estado_documento as enum ('emitido', 'anulado');

-- 'cerrada' la pone un trigger cuando el saldo llega a cero (RN-014):
-- nadie la cierra a mano, porque a mano se olvida.
create type estado_cxc as enum ('abierta', 'cerrada', 'anulada');

create type medio_pago as enum (
  'efectivo', 'transferencia', 'deposito', 'yape_plin', 'tarjeta', 'cheque', 'otro'
);

create type estado_caja as enum ('abierta', 'cerrada');

-- El signo lo lleva el tipo, no el importe: un importe negativo en una
-- tabla de dinero es una invitación a que alguien lo sume mal.
create type tipo_movimiento_caja as enum ('ingreso', 'egreso');

create type resultado_gestion as enum (
  'promesa_pago', 'sin_respuesta', 'volver_a_llamar', 'reclamo', 'pagado', 'negativa'
);

create type estado_promesa as enum ('vigente', 'cumplida', 'incumplida');

-- ── 2 · DOCUMENTO DE VENTA ────────────────────────────────────────────
-- D-03: lo que se ALMACENA en el catálogo es valor de venta sin IGV. El
-- IGV se calcula AQUÍ, al emitir, y se congela: la tasa puede cambiar por
-- ley mañana y un documento ya emitido no puede cambiar de importe.

create table public.documento_venta (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  sede_id           uuid references public.sede(id),
  cliente_id        uuid not null references public.cliente(id) on delete restrict,
  tipo              tipo_documento not null,
  serie             text not null,
  correlativo       integer not null,
  -- Denormalizado a propósito: 'F001-000123' se busca, se imprime y se
  -- dicta por teléfono. Recomponerlo en cada consulta es trabajo inútil.
  numero            text not null,
  estado            estado_documento not null default 'emitido',
  fecha_emision     date not null default (now() at time zone 'America/Lima')::date,
  fecha_vencimiento date not null,

  -- La tasa se congela en el documento. Si el IGV baja al 16 % el año que
  -- viene, esta factura sigue valiendo lo que valía.
  tasa_igv          numeric(5,4) not null,

  -- Los tres importes se guardan calculados y NO se recalculan al leer.
  -- Un total que se recalcula es un total que puede dar distinto según
  -- quién lo lea — que es exactamente el mecanismo de H-01.
  subtotal          numeric(12,2) not null,
  igv               numeric(12,2) not null,
  total             numeric(12,2) not null,

  -- Una nota de crédito/débito siempre modifica a un documento anterior.
  documento_ref_id  uuid references public.documento_venta(id) on delete restrict,
  motivo            text,

  observaciones     text,

  -- Quién autorizó emitir por encima de la línea de crédito del cliente.
  -- Nulo en el caso normal. Si está lleno, alguien se hizo responsable de
  -- darle más crédito del pactado, y eso tiene que poder preguntarse.
  autorizado_por    uuid references public.usuario(id),
  motivo_autorizacion text,

  anulado_en        timestamptz,
  anulado_por       uuid,
  motivo_anulacion  text,

  created_at        timestamptz not null default now(),
  created_by        uuid,
  updated_at        timestamptz not null default now(),
  updated_by        uuid,

  unique (tenant_id, tipo, serie, correlativo),
  unique (tenant_id, numero),

  constraint documento_importes_no_negativos
    check (subtotal >= 0 and igv >= 0 and total >= 0),
  -- El total tiene que cuadrar con sus partes. Es una suma de dos
  -- números: si esto falla, hay un error de cálculo en la emisión.
  constraint documento_total_cuadra
    check (total = subtotal + igv),
  constraint documento_vence_despues_de_emitir
    check (fecha_vencimiento >= fecha_emision),
  -- Una nota SIEMPRE referencia el documento que corrige; una factura o
  -- boleta nunca lo hace.
  constraint documento_nota_referencia
    check (
      (tipo in ('nota_credito','nota_debito') and documento_ref_id is not null)
      or (tipo in ('factura','boleta') and documento_ref_id is null)
    ),
  constraint documento_anulacion_completa
    check (
      (estado = 'anulado' and anulado_en is not null and motivo_anulacion is not null)
      or estado = 'emitido'
    )
);

create index documento_venta_cliente_idx on public.documento_venta (cliente_id, fecha_emision desc);
create index documento_venta_tenant_idx on public.documento_venta (tenant_id, fecha_emision desc);

comment on table public.documento_venta is
  'D-02: la CxC nace de aquí y de ningún otro sitio. Ninguna columna apunta a orden_trabajo por diseño.';
comment on column public.documento_venta.tasa_igv is
  'Congelada al emitir. Un documento ya emitido no cambia de importe porque cambie la ley.';

-- ── 3 · DETALLE DEL DOCUMENTO ─────────────────────────────────────────
-- Une el documento con lo que se está cobrando. La FK a detalle_trabajo
-- es lo que impide facturar dos veces la misma línea (RF-145).

create table public.documento_detalle (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenant(id) on delete cascade,
  documento_id        uuid not null references public.documento_venta(id) on delete cascade,
  -- Nullable: una nota de crédito puede ser por un concepto libre
  -- ("descuento comercial") sin línea de trabajo detrás.
  detalle_trabajo_id  uuid references public.detalle_trabajo(id) on delete restrict,
  descripcion         text not null,
  cantidad            numeric(8,2) not null,
  precio_unitario     numeric(12,2) not null,
  afectacion          afectacion_tributaria not null default 'gravado',
  subtotal            numeric(12,2) not null,
  igv                 numeric(12,2) not null,
  total               numeric(12,2) not null,

  -- Denormalizado porque un índice único parcial no puede mirar otra
  -- tabla, y aquí hace falta que lo sea: es lo que da seguridad ante
  -- concurrencia, cosa que un trigger de comprobación no da.
  --
  -- Vale `true` mientras esta línea "consuma" el trabajo, es decir,
  -- mientras impida volver a facturarlo. Lo pone a `false` la anulación
  -- del documento, y nace `false` en las notas de crédito y débito: una
  -- nota referencia una línea ya facturada, no la factura otra vez.
  consume_trabajo     boolean not null default true,

  constraint detalle_doc_cantidad_positiva check (cantidad > 0),
  constraint detalle_doc_importes_no_negativos
    check (precio_unitario >= 0 and subtotal >= 0 and igv >= 0 and total >= 0),
  constraint detalle_doc_total_cuadra check (total = subtotal + igv)
);

create index documento_detalle_doc_idx on public.documento_detalle (documento_id);

-- RF-145: una línea de trabajo se factura UNA vez... mientras esa factura
-- exista. Si se anula, el trabajo tiene que poder volver a facturarse: si
-- no, una factura emitida por error deja el trabajo imposible de cobrar y
-- el laboratorio regala lo que ya fabricó.
--
-- Por eso el índice mira `consume_trabajo` y no sólo la FK. Una nota de
-- crédito referencia la misma línea sin chocar, porque nace en `false`.
create unique index documento_detalle_no_doble_facturacion
  on public.documento_detalle (detalle_trabajo_id)
  where detalle_trabajo_id is not null and consume_trabajo;

comment on index public.documento_detalle_no_doble_facturacion is
  'RF-145: bloquea la doble facturación de una línea, salvo que el documento que la facturaba se haya anulado.';

-- ── 4 · CUENTA POR COBRAR ─────────────────────────────────────────────
-- El corazón de la corrección de H-01.

create table public.cuenta_cobrar (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  -- NOT NULL y única: cada documento tiene exactamente una CxC, y ninguna
  -- CxC existe sin documento. Esto es D-02 escrito en el esquema.
  documento_id      uuid not null unique references public.documento_venta(id) on delete cascade,
  cliente_id        uuid not null references public.cliente(id) on delete restrict,

  importe_original  numeric(12,2) not null,
  -- `saldo` lo mantiene un trigger a partir de las aplicaciones de pago.
  -- No se escribe a mano desde la aplicación: un saldo escrito a mano es
  -- un saldo que puede discrepar de sus pagos.
  saldo             numeric(12,2) not null,
  estado            estado_cxc not null default 'abierta',
  fecha_vencimiento date not null,
  cerrada_en        timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint cxc_importes_no_negativos check (importe_original >= 0 and saldo >= 0),
  -- Nadie puede deber MÁS de lo que se le facturó.
  constraint cxc_saldo_no_supera_original check (saldo <= importe_original),
  constraint cxc_cerrada_sin_saldo check (estado <> 'cerrada' or saldo = 0)
);

create index cuenta_cobrar_cliente_idx on public.cuenta_cobrar (cliente_id, estado);
create index cuenta_cobrar_vencimiento_idx on public.cuenta_cobrar (tenant_id, fecha_vencimiento)
  where estado = 'abierta';

comment on table public.cuenta_cobrar is
  'ÚNICA fuente de deuda del sistema (D-02). Cuelga del documento; no tiene ninguna referencia a orden_trabajo.';
comment on column public.cuenta_cobrar.saldo is
  'Lo mantiene tg_recalcular_saldo_cxc a partir de pago_aplicacion. La aplicación nunca lo escribe.';

-- ── 5 · PAGOS Y SU APLICACIÓN ─────────────────────────────────────────
-- Un pago es dinero que ENTRÓ. Una aplicación es a qué documento se
-- imputa. Son dos cosas distintas: un doctor puede pagar S/ 1 000 que se
-- reparten entre tres facturas, o pagar por adelantado sin factura aún.

create table public.pago (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  cliente_id    uuid not null references public.cliente(id) on delete restrict,
  fecha         date not null default (now() at time zone 'America/Lima')::date,
  medio         medio_pago not null,
  -- El número de operación de la transferencia, el voucher del depósito.
  -- Sin esto no se puede conciliar con el banco.
  referencia    text,
  importe       numeric(12,2) not null,
  -- Lo que aún no se ha imputado a ningún documento: el anticipo.
  -- Lo mantiene el mismo trigger que reparte las aplicaciones.
  sin_aplicar   numeric(12,2) not null,
  evidencia_id  uuid references public.archivo(id),
  observaciones text,
  anulado       boolean not null default false,

  created_at    timestamptz not null default now(),
  created_by    uuid,

  constraint pago_importe_positivo check (importe > 0),
  constraint pago_sin_aplicar_valido check (sin_aplicar >= 0 and sin_aplicar <= importe)
);

create index pago_cliente_idx on public.pago (cliente_id, fecha desc);
create index pago_anticipo_idx on public.pago (cliente_id)
  where sin_aplicar > 0 and not anulado;

comment on column public.pago.sin_aplicar is
  'Anticipo: dinero recibido que todavía no se imputó a ningún documento. Es saldo A FAVOR del cliente, no deuda.';

create table public.pago_aplicacion (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenant(id) on delete cascade,
  pago_id         uuid not null references public.pago(id) on delete cascade,
  cuenta_cobrar_id uuid not null references public.cuenta_cobrar(id) on delete cascade,
  importe         numeric(12,2) not null,
  created_at      timestamptz not null default now(),
  created_by      uuid,

  constraint aplicacion_importe_positivo check (importe > 0),
  -- Un mismo pago no se aplica dos veces a la misma CxC: se aplica una
  -- vez por el total. Dos filas serían dos asientos para un solo hecho.
  unique (pago_id, cuenta_cobrar_id)
);

create index pago_aplicacion_cxc_idx on public.pago_aplicacion (cuenta_cobrar_id);

-- ── 6 · CAJA ──────────────────────────────────────────────────────────
-- Sólo efectivo. Lo que entra por banco no pasa por caja: mezclarlos hace
-- que el arqueo no cuadre nunca y que la caja deje de servir.

create table public.caja_sesion (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  sede_id           uuid references public.sede(id),
  abierta_en        timestamptz not null default now(),
  abierta_por       uuid not null references public.usuario(id),
  monto_apertura    numeric(12,2) not null,
  estado            estado_caja not null default 'abierta',
  cerrada_en        timestamptz,
  cerrada_por       uuid references public.usuario(id),
  -- Lo que el sistema dice que debería haber.
  monto_teorico     numeric(12,2),
  -- Lo que la persona contó de verdad.
  monto_fisico      numeric(12,2),
  -- Se guarda calculada para que quede congelada en el momento del cierre.
  diferencia        numeric(12,2),
  autorizada_por    uuid references public.usuario(id),
  observaciones     text,

  constraint caja_apertura_no_negativa check (monto_apertura >= 0),
  constraint caja_cierre_completo
    check (
      estado = 'abierta'
      or (cerrada_en is not null and monto_fisico is not null and monto_teorico is not null)
    )
);

-- Una sola caja abierta por sede a la vez. Dos cajas abiertas hacen que
-- el efectivo no se sepa en cuál está.
create unique index caja_una_abierta_por_sede
  on public.caja_sesion (tenant_id, coalesce(sede_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where estado = 'abierta';

create table public.caja_movimiento (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenant(id) on delete cascade,
  sesion_id     uuid not null references public.caja_sesion(id) on delete cascade,
  tipo          tipo_movimiento_caja not null,
  categoria     text not null,
  concepto      text not null,
  importe       numeric(12,2) not null,
  -- Si el movimiento viene de un pago en efectivo, queda enlazado: así el
  -- arqueo y la cobranza cuentan el mismo billete una sola vez.
  pago_id       uuid references public.pago(id) on delete set null,
  created_at    timestamptz not null default now(),
  created_by    uuid,

  constraint movimiento_importe_positivo check (importe > 0)
);

create index caja_movimiento_sesion_idx on public.caja_movimiento (sesion_id);

comment on column public.caja_movimiento.importe is
  'SIEMPRE positivo. El signo lo lleva `tipo`: un importe negativo es una invitación a sumarlo mal.';

-- ── 7 · COBRANZA ──────────────────────────────────────────────────────

create table public.gestion_cobranza (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenant(id) on delete cascade,
  cliente_id      uuid not null references public.cliente(id) on delete cascade,
  -- Nullable: se puede gestionar la cartera de un cliente en bloque, sin
  -- referirse a una factura concreta.
  cuenta_cobrar_id uuid references public.cuenta_cobrar(id) on delete set null,
  gestionado_en   timestamptz not null default now(),
  gestionado_por  uuid references public.usuario(id),
  canal           text not null,
  resultado       resultado_gestion not null,
  notas           text,
  created_at      timestamptz not null default now()
);

create index gestion_cobranza_cliente_idx
  on public.gestion_cobranza (cliente_id, gestionado_en desc);

create table public.promesa_pago (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenant(id) on delete cascade,
  gestion_id      uuid not null references public.gestion_cobranza(id) on delete cascade,
  cliente_id      uuid not null references public.cliente(id) on delete cascade,
  fecha_prometida date not null,
  importe         numeric(12,2) not null,
  estado          estado_promesa not null default 'vigente',
  cumplida_en     timestamptz,
  created_at      timestamptz not null default now(),

  constraint promesa_importe_positivo check (importe > 0)
);

create index promesa_pago_seguimiento_idx
  on public.promesa_pago (tenant_id, fecha_prometida)
  where estado = 'vigente';

-- ── 8 · TRIGGERS QUE SOSTIENEN LAS REGLAS ─────────────────────────────

-- El saldo de una CxC es la resta de sus aplicaciones. NO se escribe
-- desde la aplicación: si dos pantallas pudieran escribirlo, volverían
-- las dos cifras distintas.
--
-- Vive en una función y no dentro del trigger porque hay DOS caminos que
-- mueven una CxC: aplicar un pago y emitir una nota. Si cada uno hiciera
-- su propia resta, tarde o temprano discreparían — que es literalmente
-- H-01. Los dos llaman aquí.
create or replace function public.recalcular_cxc(p_cxc uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_original numeric(12,2);
  v_aplicado numeric(12,2);
  v_saldo numeric(12,2);
begin
  select importe_original into v_original
    from public.cuenta_cobrar where id = p_cxc;

  if v_original is null then
    return;
  end if;

  select coalesce(sum(a.importe), 0) into v_aplicado
    from public.pago_aplicacion a
    join public.pago p on p.id = a.pago_id
   where a.cuenta_cobrar_id = p_cxc
     and not p.anulado;

  v_saldo := round(v_original - v_aplicado, 2);

  if v_saldo < 0 then
    raise exception 'Los pagos aplicados (%) superan el importe del documento (%)',
      v_aplicado, v_original
      using errcode = '23514';
  end if;

  -- RN-014: una CxC saldada se cierra sola. A mano se olvida, y una CxC
  -- con saldo cero pero abierta sigue apareciendo en la cartera.
  update public.cuenta_cobrar
     set saldo = v_saldo,
         estado = case
           when estado = 'anulada' then 'anulada'::public.estado_cxc
           when v_saldo = 0 then 'cerrada'::public.estado_cxc
           else 'abierta'::public.estado_cxc
         end,
         cerrada_en = case when v_saldo = 0 then coalesce(cerrada_en, now()) else null end,
         updated_at = now()
   where id = p_cxc;
end;
$$;

create or replace function public.tg_recalcular_saldo_cxc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recalcular_cxc(coalesce(new.cuenta_cobrar_id, old.cuenta_cobrar_id));
  return null;
end;
$$;

create trigger pago_aplicacion_recalcula_cxc
  after insert or update or delete on public.pago_aplicacion
  for each row execute function public.tg_recalcular_saldo_cxc();

-- Lo mismo por el otro lado: cuánto de un pago queda sin imputar.
create or replace function public.tg_recalcular_sin_aplicar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago uuid := coalesce(new.pago_id, old.pago_id);
  v_importe numeric(12,2);
  v_aplicado numeric(12,2);
begin
  select importe into v_importe from public.pago where id = v_pago;

  select coalesce(sum(importe), 0) into v_aplicado
    from public.pago_aplicacion where pago_id = v_pago;

  if v_aplicado > v_importe then
    raise exception 'No se puede aplicar % de un pago de %', v_aplicado, v_importe
      using errcode = '23514';
  end if;

  update public.pago
     set sin_aplicar = round(v_importe - v_aplicado, 2)
   where id = v_pago;

  return null;
end;
$$;

create trigger pago_aplicacion_recalcula_pago
  after insert or update or delete on public.pago_aplicacion
  for each row execute function public.tg_recalcular_sin_aplicar();

-- RN-013: anular un documento anula su CxC. Sin esto, una factura anulada
-- seguiría contando como deuda.
create or replace function public.tg_anular_cxc_con_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'anulado' and old.estado <> 'anulado' then
    if exists (
      select 1 from public.cuenta_cobrar c
       join public.pago_aplicacion a on a.cuenta_cobrar_id = c.id
      where c.documento_id = new.id
    ) then
      raise exception 'Ese documento ya tiene pagos aplicados: primero hay que revertirlos'
        using errcode = '23514';
    end if;

    update public.cuenta_cobrar
       set estado = 'anulada', saldo = 0, updated_at = now()
     where documento_id = new.id;

    -- Y se liberan los trabajos que facturaba, para que puedan volver a
    -- facturarse. Sin esto, anular por un error de emisión condenaría el
    -- trabajo a no cobrarse nunca — el peor final posible para RF-145.
    -- No se borran las líneas: la factura anulada sigue siendo historia.
    update public.documento_detalle
       set consume_trabajo = false
     where documento_id = new.id;
  end if;
  return new;
end;
$$;

create trigger documento_anulado_anula_cxc
  after update of estado on public.documento_venta
  for each row execute function public.tg_anular_cxc_con_documento();

do $$
declare t text;
begin
  foreach t in array array['documento_venta','cuenta_cobrar','caja_sesion']
  loop
    execute format(
      'create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.tg_touch_updated_at();', t);
  end loop;

  -- Se audita todo lo que mueve dinero.
  foreach t in array array['documento_venta','pago','pago_aplicacion','caja_sesion','caja_movimiento']
  loop
    execute format(
      'create trigger %1$s_auditar after insert or update or delete on public.%1$s
         for each row execute function public.tg_auditar();', t);
  end loop;
end;
$$;

-- ── 9 · v_cartera · LA ÚNICA FUENTE DE DEUDA ──────────────────────────
-- Regla 2 de CLAUDE.md: la deuda se lee SIEMPRE de aquí. Nunca se calcula
-- sumando saldos de trabajos.
--
-- Los tramos de aging son EXCLUYENTES y cubren todo el rango: cada CxC
-- cae en uno y sólo uno. Es lo que hace que la suma de los tramos cuadre
-- al céntimo con el total — la prueba concreta de que H-01 está cerrado.
--
-- security_invoker: respeta la RLS de las tablas de las que lee.
create or replace view public.v_cartera
with (security_invoker = true) as
select
  c.id                as cuenta_cobrar_id,
  c.tenant_id,
  c.cliente_id,
  cli.razon_social,
  cli.tipo            as tipo_cliente,
  c.documento_id,
  d.numero            as documento,
  d.tipo              as tipo_documento,
  d.fecha_emision,
  c.fecha_vencimiento,
  c.importe_original,
  c.saldo,
  c.estado,
  -- Negativo = aún no vence. Positivo = días de mora.
  ((now() at time zone 'America/Lima')::date - c.fecha_vencimiento)::int as dias_mora,
  case
    when ((now() at time zone 'America/Lima')::date - c.fecha_vencimiento) <  1  then 'por_vencer'
    when ((now() at time zone 'America/Lima')::date - c.fecha_vencimiento) <= 30 then '1_30'
    when ((now() at time zone 'America/Lima')::date - c.fecha_vencimiento) <= 60 then '31_60'
    when ((now() at time zone 'America/Lima')::date - c.fecha_vencimiento) <= 90 then '61_90'
    else 'mas_90'
  end as tramo
from public.cuenta_cobrar c
join public.documento_venta d on d.id = c.documento_id
join public.cliente cli on cli.id = c.cliente_id
where c.estado = 'abierta'
  and c.saldo > 0;

comment on view public.v_cartera is
  'ÚNICA fuente de deuda del sistema (regla 2). Los tramos son excluyentes y exhaustivos: su suma cuadra al céntimo con el total.';

-- Deuda por cliente, para el CRM y el bloqueo comercial. Lee de v_cartera
-- y no de las tablas: si leyera aparte, podría discrepar.
create or replace view public.v_deuda_cliente
with (security_invoker = true) as
select
  cliente_id,
  tenant_id,
  razon_social,
  sum(saldo)                                            as deuda_total,
  sum(saldo) filter (where tramo = 'por_vencer')        as por_vencer,
  sum(saldo) filter (where tramo <> 'por_vencer')       as vencido,
  count(*)                                              as documentos_abiertos,
  max(dias_mora)                                        as mora_maxima
from public.v_cartera
group by cliente_id, tenant_id, razon_social;

-- RF-145: trabajos entregados que todavía no se han facturado. NO es
-- deuda —y por eso vive en su propia vista, no en v_cartera— pero es el
-- control operativo que evita regalar trabajo.
create or replace view public.v_pendiente_facturar
with (security_invoker = true) as
select
  o.id            as orden_id,
  o.tenant_id,
  o.codigo,
  o.cliente_id,
  cli.razon_social,
  o.fecha_entrega,
  sum(dt.cantidad * dt.precio_unitario) as valor_venta
from public.orden_trabajo o
join public.cliente cli on cli.id = o.cliente_id
join public.detalle_trabajo dt on dt.orden_id = o.id
join public.estado_trabajo e on e.id = o.estado_id
where e.fase = 'final'
  -- `consume_trabajo`, no la simple existencia de la línea: si la factura
  -- que la cobraba se anuló, el trabajo vuelve a estar pendiente y tiene
  -- que reaparecer aquí. Si no, se queda entregado y sin cobrar para
  -- siempre, sin que nadie se entere.
  and not exists (
    select 1 from public.documento_detalle dd
     where dd.detalle_trabajo_id = dt.id and dd.consume_trabajo
  )
group by o.id, o.tenant_id, o.codigo, o.cliente_id, cli.razon_social, o.fecha_entrega;

comment on view public.v_pendiente_facturar is
  'RF-145. NO es deuda: es trabajo entregado sin facturar. Vive aparte de v_cartera a propósito (D-02).';

-- ── 10 · EMITIR UN DOCUMENTO ──────────────────────────────────────────
-- Cabecera, detalle, correlativo y CxC en una sola transacción. A medias
-- no es medio documento: es un correlativo quemado, o una factura que no
-- genera deuda, o deuda sin factura.

create or replace function public.emitir_documento(
  p_cliente        uuid,
  p_tipo           text,
  p_serie          text,
  p_lineas         jsonb,
  p_dias_credito   integer default null,
  p_observaciones  text default null,
  p_documento_ref  uuid default null,
  p_motivo         text default null,
  p_autorizado_por uuid default null,
  p_motivo_autorizacion text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant    uuid := public.current_tenant_id();
  v_tasa      numeric(5,4);
  v_correl    integer;
  v_doc       uuid;
  v_linea     jsonb;
  v_dias      integer;
  v_sub       numeric(12,2) := 0;
  v_igv       numeric(12,2) := 0;
  v_l_sub     numeric(12,2);
  v_l_igv     numeric(12,2);
  v_afect     public.afectacion_tributaria;
  v_cxc_ref    uuid;
  v_orig_ref   numeric(12,2);
  v_nuevo_orig numeric(12,2);
  v_total_nota numeric(12,2);
  v_aplicado   numeric(12,2);
  v_liberar    numeric(12,2);
  v_ap_id      uuid;
  v_ap_imp     numeric(12,2);
  v_linea_cred numeric(12,2);
  v_bloqueado  boolean;
  v_motivo_bloq text;
  v_deuda      numeric(12,2);
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  if jsonb_array_length(coalesce(p_lineas, '[]'::jsonb)) = 0 then
    raise exception 'Un documento sin líneas no es un documento' using errcode = '23514';
  end if;

  if not exists (select 1 from public.cliente where id = p_cliente and tenant_id = v_tenant) then
    raise exception 'Ese cliente no existe en este laboratorio' using errcode = '42501';
  end if;

  -- Una nota corrige un documento concreto, y tiene que ser del MISMO
  -- cliente: una nota cruzada rebajaría la deuda de quien no corresponde.
  -- Y no se corrige lo que ya no existe.
  if p_tipo in ('nota_credito', 'nota_debito') then
    if not exists (
      select 1 from public.documento_venta
       where id = p_documento_ref
         and tenant_id = v_tenant
         and cliente_id = p_cliente
         and tipo in ('factura', 'boleta')
    ) then
      raise exception 'La nota tiene que corregir una factura o boleta de ese mismo cliente'
        using errcode = '23514';
    end if;

    if exists (
      select 1 from public.documento_venta
       where id = p_documento_ref and estado = 'anulado'
    ) then
      raise exception 'Ese documento está anulado: ya no hay nada que corregir'
        using errcode = '23514';
    end if;

    if btrim(coalesce(p_motivo, '')) = '' then
      raise exception 'Una nota sin motivo no vale: SUNAT lo exige y el cliente lo pregunta'
        using errcode = '23514';
    end if;
  end if;

  v_tasa := public.tasa_igv(v_tenant);

  select coalesce(p_dias_credito, dias_credito, 0) into v_dias
    from public.cliente where id = p_cliente;

  v_correl := public.siguiente_correlativo(v_tenant, upper(p_tipo), p_serie);

  insert into public.documento_venta (
    tenant_id, cliente_id, tipo, serie, correlativo, numero,
    fecha_vencimiento, tasa_igv, subtotal, igv, total,
    documento_ref_id, motivo, observaciones, created_by
  ) values (
    v_tenant, p_cliente, p_tipo::public.tipo_documento, p_serie, v_correl,
    p_serie || '-' || lpad(v_correl::text, 6, '0'),
    ((now() at time zone 'America/Lima')::date + v_dias),
    v_tasa, 0, 0, 0,
    p_documento_ref, p_motivo, p_observaciones, auth.uid()
  )
  returning id into v_doc;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    v_afect := coalesce(v_linea ->> 'afectacion', 'gravado')::public.afectacion_tributaria;

    -- D-03: el precio que llega es valor de venta SIN IGV. El impuesto se
    -- calcula aquí, por línea, y se redondea por línea — sumar primero y
    -- redondear después da un céntimo distinto.
    v_l_sub := round(
      (v_linea ->> 'cantidad')::numeric * (v_linea ->> 'precio_unitario')::numeric, 2);
    v_l_igv := case when v_afect = 'gravado' then round(v_l_sub * v_tasa, 2) else 0 end;

    insert into public.documento_detalle (
      tenant_id, documento_id, detalle_trabajo_id, descripcion,
      cantidad, precio_unitario, afectacion, subtotal, igv, total,
      consume_trabajo
    ) values (
      v_tenant, v_doc,
      nullif(v_linea ->> 'detalle_trabajo_id', '')::uuid,
      v_linea ->> 'descripcion',
      (v_linea ->> 'cantidad')::numeric,
      (v_linea ->> 'precio_unitario')::numeric,
      v_afect, v_l_sub, v_l_igv, v_l_sub + v_l_igv,
      -- Sólo factura y boleta consumen el trabajo. Una nota referencia una
      -- línea ya facturada; si también la consumiera, chocaría con la
      -- factura que corrige.
      upper(p_tipo) in ('FACTURA', 'BOLETA')
    );

    v_sub := v_sub + v_l_sub;
    v_igv := v_igv + v_l_igv;
  end loop;

  update public.documento_venta
     set subtotal = v_sub, igv = v_igv, total = v_sub + v_igv
   where id = v_doc;

  -- RF · Línea de crédito. Se comprueba AQUÍ, en la base, y no en el
  -- formulario: un control que sólo vive en la pantalla se salta llamando
  -- a la API, y lo que está en juego es cuánto se le fía a un cliente.
  --
  -- Sólo aplica a factura y boleta: una nota de crédito BAJA la deuda, y
  -- rechazarla por exceso de crédito sería absurdo.
  if p_tipo in ('factura', 'boleta') then
    select linea_credito, bloqueado, coalesce(motivo_bloqueo, '')
      into v_linea_cred, v_bloqueado, v_motivo_bloq
      from public.cliente where id = p_cliente;

    -- Un cliente bloqueado no recibe trabajo nuevo (eso lo impide
    -- registrar_orden), pero SÍ se le factura lo ya entregado: no
    -- facturarlo sería regalarlo. Lo que no se le da es más crédito.
    if v_linea_cred is not null then
      -- La deuda sale de v_cartera, como en todas partes. Calcularla
      -- aquí de otra forma sería abrir H-01 otra vez.
      select coalesce(sum(saldo), 0) into v_deuda
        from public.v_cartera where cliente_id = p_cliente;

      if v_deuda + (v_sub + v_igv) > v_linea_cred then
        if p_autorizado_por is null then
          raise exception
            'Excede la línea de crédito: debe % y esta emisión suma %, sobre un límite de %. Hace falta autorización.',
            v_deuda, v_sub + v_igv, v_linea_cred
            using errcode = '23514';
        end if;

        -- Autorizado: se emite, pero queda escrito quién lo permitió.
        if btrim(coalesce(p_motivo_autorizacion, '')) = '' then
          raise exception 'Pasar de la línea de crédito necesita un motivo escrito'
            using errcode = '23514';
        end if;

        update public.documento_venta
           set autorizado_por = p_autorizado_por,
               motivo_autorizacion = p_motivo_autorizacion
         where id = v_doc;
      end if;
    end if;
  end if;

  -- D-02: la CxC nace AQUÍ, del documento. Una nota de crédito no genera
  -- deuda: rebaja la del documento al que corrige.
  if p_tipo in ('factura', 'boleta') then
    insert into public.cuenta_cobrar (
      tenant_id, documento_id, cliente_id,
      importe_original, saldo, fecha_vencimiento
    )
    select v_tenant, v_doc, p_cliente, d.total, d.total, d.fecha_vencimiento
      from public.documento_venta d where d.id = v_doc;

  else
    -- Una nota mueve la CxC del documento al que referencia. Se bloquea
    -- la fila: dos notas simultáneas sobre la misma factura podrían
    -- dejarla debiendo menos de lo que corresponde.
    select id, importe_original into v_cxc_ref, v_orig_ref
      from public.cuenta_cobrar
     where documento_id = p_documento_ref and tenant_id = v_tenant
     for update;

    if v_cxc_ref is null then
      raise exception 'El documento que se corrige no tiene cuenta por cobrar'
        using errcode = '23514';
    end if;

    v_total_nota := v_sub + v_igv;

    if p_tipo = 'nota_debito' then
      -- Cobra de más: sube lo facturado. El saldo lo deriva recalcular_cxc.
      v_nuevo_orig := v_orig_ref + v_total_nota;
    else
      -- Rebaja lo facturado, nunca por debajo de cero.
      v_nuevo_orig := greatest(v_orig_ref - v_total_nota, 0);

      -- Si el cliente ya había pagado más de lo que la factura vale
      -- ahora, ese dinero es suyo. NO se inventa un pago nuevo: se
      -- des-aplica lo que sobra del pago original, y su "sin_aplicar"
      -- sube solo por su propio trigger. Eso ES el saldo a favor, y así
      -- el dinero recibido se sigue contando una sola vez.
      select coalesce(sum(a.importe), 0) into v_aplicado
        from public.pago_aplicacion a
        join public.pago pg on pg.id = a.pago_id
       where a.cuenta_cobrar_id = v_cxc_ref and not pg.anulado;

      v_liberar := v_aplicado - v_nuevo_orig;

      -- Se deshacen las aplicaciones más recientes primero: lo viejo se
      -- dio por pagado antes, y deshacer eso resucitaría deuda antigua.
      for v_ap_id, v_ap_imp in
        select a.id, a.importe
          from public.pago_aplicacion a
         where a.cuenta_cobrar_id = v_cxc_ref
         order by a.created_at desc
      loop
        exit when v_liberar <= 0;

        if v_ap_imp <= v_liberar then
          delete from public.pago_aplicacion where id = v_ap_id;
          v_liberar := v_liberar - v_ap_imp;
        else
          update public.pago_aplicacion
             set importe = v_ap_imp - v_liberar
           where id = v_ap_id;
          v_liberar := 0;
        end if;
      end loop;
    end if;

    -- El saldo se acota EN LA MISMA sentencia, no porque aquí se calcule
    -- —lo calcula recalcular_cxc, dos líneas más abajo— sino porque
    -- `cxc_saldo_no_supera_original` se comprueba fila a fila y en Postgres
    -- un CHECK no se puede diferir. Bajar el original dejando el saldo
    -- viejo rompería la invariante a mitad de la operación.
    update public.cuenta_cobrar
       set importe_original = v_nuevo_orig,
           saldo            = least(saldo, v_nuevo_orig),
           updated_at       = now()
     where id = v_cxc_ref;

    -- Un solo sitio calcula el saldo de verdad, y es éste.
    perform public.recalcular_cxc(v_cxc_ref);
  end if;

  return v_doc;
end;
$$;

comment on function public.emitir_documento is
  'D-02: emite el documento y crea su CxC en la misma transacción. Es el único sitio donde nace deuda.';

-- ── 11 · REGISTRAR UN PAGO Y APLICARLO ────────────────────────────────
-- El pago y su imputación van juntos: un pago registrado sin aplicar y
-- una aplicación sin pago son dos formas de descuadrar la cartera.

create or replace function public.registrar_pago(
  p_cliente       uuid,
  p_importe       numeric,
  p_medio         text,
  p_aplicaciones  jsonb default '[]'::jsonb,
  p_referencia    text default null,
  p_evidencia     uuid default null,
  p_observaciones text default null,
  p_sesion_caja   uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_pago   uuid;
  v_ap     jsonb;
  v_total_ap numeric(12,2) := 0;
  v_saldo  numeric(12,2);
  v_imp    numeric(12,2);
  v_quien  text;
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  if p_importe <= 0 then
    raise exception 'El importe de un pago tiene que ser mayor que cero'
      using errcode = '23514';
  end if;

  insert into public.pago (
    tenant_id, cliente_id, importe, sin_aplicar, medio,
    referencia, evidencia_id, observaciones, created_by
  ) values (
    v_tenant, p_cliente, p_importe, p_importe, p_medio::public.medio_pago,
    p_referencia, p_evidencia, p_observaciones, auth.uid()
  )
  returning id into v_pago;

  for v_ap in select * from jsonb_array_elements(coalesce(p_aplicaciones, '[]'::jsonb))
  loop
    v_imp := (v_ap ->> 'importe')::numeric;

    select saldo into v_saldo
      from public.cuenta_cobrar
     where id = (v_ap ->> 'cuenta_cobrar_id')::uuid
       and tenant_id = v_tenant
       and estado = 'abierta'
     for update;

    if v_saldo is null then
      raise exception 'Esa cuenta por cobrar no existe o ya está cerrada'
        using errcode = '23514';
    end if;

    if v_imp > v_saldo then
      raise exception 'No se puede aplicar % a un saldo de %', v_imp, v_saldo
        using errcode = '23514';
    end if;

    insert into public.pago_aplicacion (
      tenant_id, pago_id, cuenta_cobrar_id, importe, created_by
    ) values (v_tenant, v_pago, (v_ap ->> 'cuenta_cobrar_id')::uuid, v_imp, auth.uid());

    v_total_ap := v_total_ap + v_imp;
  end loop;

  if v_total_ap > p_importe then
    raise exception 'Se está aplicando % de un pago de %', v_total_ap, p_importe
      using errcode = '23514';
  end if;

  -- Sólo el efectivo entra a caja. Una transferencia no pasa por el
  -- cajón, y meterla haría que el arqueo no cuadre nunca.
  if p_medio = 'efectivo' and p_sesion_caja is not null then
    -- El concepto lleva el nombre porque el cajero lee esta lista al
    -- cuadrar: cinco líneas que digan «Pago de cliente» no le dicen a
    -- quién le falta un recibo.
    select razon_social into v_quien
      from public.cliente where id = p_cliente and tenant_id = v_tenant;

    insert into public.caja_movimiento (
      tenant_id, sesion_id, tipo, categoria, concepto, importe, pago_id, created_by
    ) values (
      v_tenant, p_sesion_caja, 'ingreso', 'cobranza',
      'Pago de ' || coalesce(v_quien, 'cliente'), p_importe, v_pago, auth.uid()
    );
  end if;

  return v_pago;
end;
$$;

-- ── 12 · CIERRE DE CAJA CON ARQUEO ────────────────────────────────────

create or replace function public.cerrar_caja(
  p_sesion        uuid,
  p_monto_fisico  numeric,
  p_observaciones text default null
)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant   uuid := public.current_tenant_id();
  v_apertura numeric(12,2);
  v_ingresos numeric(12,2);
  v_egresos  numeric(12,2);
  v_teorico  numeric(12,2);
  v_dif      numeric(12,2);
begin
  select monto_apertura into v_apertura
    from public.caja_sesion
   where id = p_sesion and tenant_id = v_tenant and estado = 'abierta'
   for update;

  if v_apertura is null then
    raise exception 'Esa caja no existe o ya está cerrada' using errcode = '23514';
  end if;

  select
    coalesce(sum(importe) filter (where tipo = 'ingreso'), 0),
    coalesce(sum(importe) filter (where tipo = 'egreso'), 0)
    into v_ingresos, v_egresos
    from public.caja_movimiento where sesion_id = p_sesion;

  v_teorico := v_apertura + v_ingresos - v_egresos;
  -- Positivo = sobra dinero. Negativo = falta. Se guarda con signo porque
  -- las dos cosas significan cosas distintas y hay que poder distinguirlas.
  v_dif := round(p_monto_fisico - v_teorico, 2);

  update public.caja_sesion
     set estado = 'cerrada',
         cerrada_en = now(),
         cerrada_por = auth.uid(),
         monto_teorico = v_teorico,
         monto_fisico = p_monto_fisico,
         diferencia = v_dif,
         observaciones = p_observaciones
   where id = p_sesion;

  return v_dif;
end;
$$;

comment on function public.cerrar_caja is
  'Arqueo: teórico (apertura + ingresos - egresos) contra físico. La diferencia se congela con signo.';

-- ── 13 · RLS ──────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'documento_venta','documento_detalle','cuenta_cobrar','pago','pago_aplicacion',
    'caja_sesion','caja_movimiento','gestion_cobranza','promesa_pago'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    -- Lectura: el dinero lo ven Gerencia, Administrador y Recepción.
    -- Producción no tiene por qué ver lo que debe cada doctor.
    execute format($f$
      create policy %1$s_lectura on public.%1$s
        for select using (
          tenant_id = public.current_tenant_id()
          and public.tiene_rol('administrador','gerencia','recepcion')
        );
    $f$, t);

    execute format($f$
      create policy %1$s_escritura on public.%1$s
        for all
        using (tenant_id = public.current_tenant_id()
               and public.tiene_rol('recepcion','administrador'))
        with check (tenant_id = public.current_tenant_id()
               and public.tiene_rol('recepcion','administrador'));
    $f$, t);
  end loop;
end;
$$;

-- ── 14 · GRANTS ───────────────────────────────────────────────────────
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- OBLIGATORIO al final de toda migración: el `grant ... on all tables` de
-- arriba acaba de reabrir la escritura sobre las bitácoras que las
-- migraciones anteriores cerraron. Esto lo deshace.
select public.asegurar_append_only();

-- ── 13 · APLICAR UN SALDO A FAVOR ─────────────────────────────────────
-- El anticipo ya es dinero del laboratorio; lo que falta es decir a qué
-- documento se imputa. Es una aplicación más: NO se crea un pago nuevo,
-- porque el dinero entró una sola vez y contarlo dos sería inventarlo.

create or replace function public.aplicar_anticipo(
  p_pago          uuid,
  p_aplicaciones  jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_ap     jsonb;
  v_imp    numeric(12,2);
  v_libre  numeric(12,2);
  v_saldo  numeric(12,2);
  v_cliente uuid;
begin
  if v_tenant is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  select sin_aplicar, cliente_id into v_libre, v_cliente
    from public.pago
   where id = p_pago and tenant_id = v_tenant and not anulado
   for update;

  if v_libre is null then
    raise exception 'Ese pago no existe o está anulado' using errcode = '23514';
  end if;

  for v_ap in select * from jsonb_array_elements(coalesce(p_aplicaciones, '[]'::jsonb))
  loop
    v_imp := (v_ap ->> 'importe')::numeric;

    if v_imp <= 0 then
      raise exception 'Una aplicación tiene que ser mayor que cero' using errcode = '23514';
    end if;

    -- Sólo a deudas del MISMO cliente. Aplicar el anticipo de uno a la
    -- factura de otro descuadraría las dos cuentas a la vez.
    select saldo into v_saldo
      from public.cuenta_cobrar
     where id = (v_ap ->> 'cuenta_cobrar_id')::uuid
       and tenant_id = v_tenant
       and cliente_id = v_cliente
       and estado = 'abierta'
     for update;

    if v_saldo is null then
      raise exception 'Esa cuenta por cobrar no existe, ya está cerrada, o es de otro cliente'
        using errcode = '23514';
    end if;

    if v_imp > v_saldo then
      raise exception 'No se puede aplicar % a un saldo de %', v_imp, v_saldo
        using errcode = '23514';
    end if;

    v_libre := v_libre - v_imp;
    if v_libre < 0 then
      raise exception 'El saldo a favor no alcanza para todas las aplicaciones'
        using errcode = '23514';
    end if;

    -- Si ya había una aplicación de este pago a esta CxC, se suma en vez
    -- de chocar con el único (pago_id, cuenta_cobrar_id).
    insert into public.pago_aplicacion (
      tenant_id, pago_id, cuenta_cobrar_id, importe, created_by
    ) values (v_tenant, p_pago, (v_ap ->> 'cuenta_cobrar_id')::uuid, v_imp, auth.uid())
    on conflict (pago_id, cuenta_cobrar_id)
      do update set importe = public.pago_aplicacion.importe + excluded.importe;
  end loop;
end;
$$;

comment on function public.aplicar_anticipo is
  'Imputa saldo a favor ya existente a documentos abiertos. No crea dinero: reparte el que ya entró.';

-- ── 14 · SCORE DE PAGO (M-02) ─────────────────────────────────────────
-- La fórmula está en docs/01, decisión M-02. Vive AQUÍ y no en el código
-- porque la calcula un job nocturno y porque los pesos son parámetros del
-- laboratorio, no del programa.
--
-- El término de retrabajo de M-02 se deja en 0: la tabla de retrabajos
-- entra en la Fase 3. El resto de la fórmula es la de la decisión, sin
-- reinterpretar.

alter table public.cliente
  add column if not exists score smallint,
  add column if not exists segmento text,
  add column if not exists score_calculado_en timestamptz;

comment on column public.cliente.score is
  'M-02. 1 a 5. Lo calcula recalcular_scores(); nadie lo escribe a mano.';

create or replace function public.recalcular_scores(p_tenant uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  n int := 0;
begin
  with base as (
    select
      c.id,
      c.tenant_id,
      c.created_at,

      -- puntualidad = 1 - (dias de atraso medio / 30), acotado a [0,1].
      -- Se mide sobre documentos ya saldados: los abiertos todavia no
      -- dicen si se pagaron tarde.
      coalesce((
        select greatest(0, least(1,
          1 - avg(greatest(0, (cc.cerrada_en at time zone 'America/Lima')::date
                              - cc.fecha_vencimiento)) / 30.0))
          from public.cuenta_cobrar cc
         where cc.cliente_id = c.id and cc.estado = 'cerrada' and cc.cerrada_en is not null
      ), 1) as puntualidad,

      -- morosidad = deuda vencida / deuda total. Sale de v_cartera, como
      -- todo lo demas: el score no puede usar otra cifra de deuda.
      coalesce((
        select case when sum(v.saldo) > 0
               then sum(v.saldo) filter (where v.tramo <> 'por_vencer') / sum(v.saldo)
               else 0 end
          from public.v_cartera v where v.cliente_id = c.id
      ), 0) as morosidad,

      coalesce((
        select least(count(*) / 10.0, 1)
          from public.orden_trabajo o
         where o.cliente_id = c.id and o.fecha_recepcion >= (v_hoy - 90)
      ), 0) as frecuencia,

      coalesce((
        select case
          when max(o.fecha_recepcion) >= (v_hoy - 30) then 1.0
          when max(o.fecha_recepcion) >= (v_hoy - 90) then 0.5
          else 0 end
          from public.orden_trabajo o where o.cliente_id = c.id
      ), 0) as recencia,

      coalesce((
        select sum(d.total) from public.documento_venta d
         where d.cliente_id = c.id and d.estado = 'emitido'
           and d.fecha_emision >= (v_hoy - 365)
           and d.tipo in ('factura','boleta')
      ), 0) as facturado_12m
    from public.cliente c
    where p_tenant is null or c.tenant_id = p_tenant
  ),
  -- volumen = percentil de facturacion DENTRO de su laboratorio. Un
  -- percentil global mezclaria laboratorios de tamanos distintos.
  con_volumen as (
    select b.*,
           coalesce(percent_rank() over (
             partition by b.tenant_id order by b.facturado_12m), 0) as volumen
    from base b
  ),
  calculado as (
    select
      cv.*,
      greatest(0, least(1,
          0.40 * cv.puntualidad
        + 0.25 * (1 - cv.morosidad)
        + 0.15 * cv.frecuencia
        + 0.10 * cv.recencia
        + 0.10 * cv.volumen
      )) as bruto
    from con_volumen cv
  )
  update public.cliente c
     set score = round(1 + 4 * k.bruto)::smallint,
         segmento = case
           -- El orden importa: moroso gana sobre todo lo demas, porque es
           -- lo que cambia la decision de aceptarle trabajo.
           when exists (
             select 1 from public.v_cartera v
              where v.cliente_id = c.id and v.dias_mora > 60
           ) or round(1 + 4 * k.bruto) <= 2 then 'moroso'
           when c.created_at > (now() - interval '90 days') then 'nuevo'
           when k.volumen >= 0.9 and round(1 + 4 * k.bruto) >= 4 then 'premium'
           when k.frecuencia >= 0.4 then 'frecuente'
           when not exists (
             select 1 from public.orden_trabajo o
              where o.cliente_id = c.id and o.fecha_recepcion >= (v_hoy - 180)
           ) then 'inactivo'
           else 'regular'
         end,
         score_calculado_en = now()
    from calculado k
   where k.id = c.id;

  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.recalcular_scores is
  'M-02. Recalcula score 1-5 y segmento de cada cliente. La deuda sale de v_cartera, como en todas partes.';

grant execute on function public.recalcular_scores(uuid) to authenticated;
grant execute on function public.aplicar_anticipo(uuid, jsonb) to authenticated;
