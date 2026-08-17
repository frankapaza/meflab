-- ═══════════════════════════════════════════════════════════════════════
-- 0003 · ALMACENAMIENTO DE ADJUNTOS  (Fase 1)
--
-- Fotos del color, escaneos STL y prescripciones firmadas. Es lo que hace
-- que la orden se entienda sin llamar al doctor.
--
-- La regla 1 no se suspende porque el dato viva en Storage y no en una
-- tabla: el aislamiento entre laboratorios tiene que valer también para
-- los archivos. Y aquí el mecanismo es distinto —no hay `tenant_id`, hay
-- una ruta—, así que la convención de ruta NO es cosmética: el primer
-- segmento es el laboratorio, y es lo que hace efectiva la política.
--
--   {tenant_id}/{orden_id}/{uuid}-{nombre}
--
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · EL BUCKET ─────────────────────────────────────────────────────
-- Privado. Un adjunto de una orden lleva el nombre del paciente y a veces
-- su boca: no puede estar tras una URL adivinable. Se sirve con URLs
-- firmadas y de vida corta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adjuntos',
  'adjuntos',
  false,
  104857600,  -- 100 MiB · un STL de arcada completa pesa 40-80 MB
  array[
    -- lo que manda la clínica desde el móvil
    'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp',
    -- escaneo intraoral y modelos
    'model/stl', 'application/sla', 'application/vnd.ms-pki.stl',
    'model/obj', 'text/plain',
    'application/octet-stream',   -- .stl y .ply llegan así desde muchos escáneres
    'application/dicom',
    'application/zip', 'application/x-zip-compressed',
    -- la prescripción firmada
    'application/pdf'
  ]
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- (No se comenta `storage.buckets`: la tabla es de Supabase y el rol que
-- aplica migraciones no la posee. La prueba 1 comprueba lo que importa —
-- que el bucket sea privado y admita 100 MiB.)

-- ── 2 · POLÍTICAS ─────────────────────────────────────────────────────
-- `storage.foldername(name)` parte la ruta por barras. El [1] es el
-- laboratorio. Si mañana alguien cambia la convención de ruta sin tocar
-- esto, el aislamiento se cae en silencio — por eso la prueba 1 de la
-- suite de esta migración ataca justamente ese caso.

drop policy if exists adjuntos_lectura on storage.objects;
create policy adjuntos_lectura on storage.objects
  for select to authenticated
  using (
    bucket_id = 'adjuntos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- Sube quien registra la orden. Producción los lee, no los escribe: un
-- técnico no añade la prescripción de un doctor.
drop policy if exists adjuntos_subida on storage.objects;
create policy adjuntos_subida on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'adjuntos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.tiene_rol('recepcion','administrador','lider_laboratorio')
  );

-- Borrar un adjunto es perder la prueba de lo que pidió el doctor. Sólo
-- el Administrador, y queda el registro en la tabla `archivo`.
drop policy if exists adjuntos_borrado on storage.objects;
create policy adjuntos_borrado on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'adjuntos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.tiene_rol('administrador')
  );

-- ── 3 · LA EVIDENCIA DE ENTREGA ───────────────────────────────────────
-- `entrega.evidencia_id` ya existía apuntando a `archivo`. Lo que faltaba
-- es que el archivo de evidencia pertenezca a la MISMA orden que se
-- entrega: sin esto se podría adjuntar como prueba la foto de otro
-- trabajo, que es peor que no tener ninguna.
create or replace function public.tg_evidencia_es_de_la_orden()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.evidencia_id is not null and not exists (
    select 1 from public.archivo a
     where a.id = new.evidencia_id and a.orden_id = new.orden_id
  ) then
    raise exception 'La evidencia tiene que ser un adjunto de esa misma orden'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger entrega_evidencia_coherente
  before insert or update of evidencia_id on public.entrega
  for each row execute function public.tg_evidencia_es_de_la_orden();

-- ── 4 · PREFERENCIAS DE PANEL ─────────────────────────────────────────
-- Qué gráficos quiere ver cada persona en su dashboard. Va en la fila del
-- usuario y no en una tabla aparte porque es un dato por usuario y no
-- crece: una tabla para esto sería una junta más en cada carga.
--
-- Nullable a propósito: null significa "nunca lo he tocado" y entonces
-- manda lo que corresponde a sus roles. Un array vacío es una decisión
-- distinta —"no quiero ver nada"— y hay que poder distinguirlas.
alter table public.usuario
  add column if not exists paneles jsonb;

comment on column public.usuario.paneles is
  'Gráficos elegidos para su dashboard. null = usar los de sus roles; [] = no quiere ninguno.';

-- Cada quien cambia SÓLO su propia preferencia, y no tendría sentido
-- pedirle permiso al Administrador para elegir qué gráficos ve uno.
--
-- Pero una política `for update` concedería la FILA entera: con ella, un
-- usuario podría cambiarse el nombre, el correo o el área. RLS no sabe de
-- columnas, así que —igual que con `cambiar_estado_orden`— esto es una
-- función que comprueba la identidad y toca UNA columna.
create or replace function public.fijar_paneles(p_paneles jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
begin
  if v_tenant is null or auth.uid() is null then
    raise exception 'Sin sesión válida' using errcode = '42501';
  end if;

  if p_paneles is not null and jsonb_typeof(p_paneles) <> 'array' then
    raise exception 'La selección de paneles tiene que ser una lista'
      using errcode = '22023';
  end if;

  -- security definer salta RLS, así que el laboratorio y la identidad se
  -- comprueban aquí a mano.
  update public.usuario
     set paneles = p_paneles
   where id = auth.uid() and tenant_id = v_tenant;

  if not found then
    raise exception 'Esa cuenta no existe en este laboratorio' using errcode = '42501';
  end if;
end;
$$;

comment on function public.fijar_paneles is
  'Guarda la selección de gráficos del propio usuario. Toca una columna, sin abrirle la fila entera.';

-- ── 5 · GRANTS ────────────────────────────────────────────────────────
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- OBLIGATORIO al final de toda migración: el `grant ... on all tables` de
-- arriba acaba de reabrir la escritura sobre las bitácoras que las
-- migraciones anteriores cerraron. Esto lo deshace.
select public.asegurar_append_only();
