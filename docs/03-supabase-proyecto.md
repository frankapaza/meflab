# MEFLAB — Definición y puesta en marcha del proyecto Supabase

**Documento:** SB-01
**Versión:** 1.1 — añade la migración `0004_areas_y_roles.sql`, el claim `roles[]` y la normalización de IGV
**Fecha:** 16/08/2026

> **Nota:** el proyecto Supabase debe crearlo tú desde tu cuenta (requiere tus credenciales y define la facturación). Este documento deja listo todo lo demás: nombre, región, esquema, políticas, buckets, jobs y el orden exacto de ejecución.

---

## 1. Proyectos a crear

| Proyecto | Nombre | Región | Plan | Uso |
|---|---|---|---|---|
| Desarrollo | `meflab-dev` | `sa-east-1` (São Paulo) | Free | Previews y pruebas |
| Producción | `meflab-prod` | `sa-east-1` (São Paulo) | Pro (US$ 25) | Operación real |

**Región:** São Paulo es la más cercana a Lima con presencia de Supabase (≈40 ms). No usar `us-east-1`.

**Plan Pro en producción es obligatorio** por dos razones: backups con recuperación a un punto en el tiempo (RNF‑009/010) y ausencia de pausa automática por inactividad, que en el plan Free apaga el proyecto tras 7 días sin uso.

---

## 2. Orden de puesta en marcha

```bash
# 1. Instalar CLI
npm install -g supabase

# 2. Inicializar en el repositorio
supabase init

# 3. Vincular al proyecto remoto (pide el project-ref del panel)
supabase link --project-ref <project-ref>

# 4. Copiar las migraciones a supabase/migrations/ y aplicarlas
supabase db push

# 5. Cargar catálogos base
supabase db execute --file supabase/seed.sql

# 6. Generar los tipos TypeScript para el front
supabase gen types typescript --linked > lib/tipos/database.ts
```

Para desarrollo local con Docker: `supabase start` levanta Postgres, Auth, Storage y Studio en tu máquina.

---

## 3. Migraciones incluidas

| Archivo | Contenido | Tablas |
|---|---|---|
| `0001_core.sql` | Tenant, sedes, usuarios, roles y permisos, configuración, series y correlativos, auditoría por trigger, funciones de contexto RLS | 8 |
| `0002_operacion.sql` | Cliente/doctor/paciente, catálogo y tarifas, listas de precio con captura de IGV, colores, procesos y flujos, estados, orden de trabajo, detalle de venta, tareas de producción, archivos y entregas | 20 |
| `0003_finanzas.sql` *(Fase 2)* | Documentos, cuentas por cobrar, pagos y aplicaciones, anticipos, caja y arqueo, cobranza, promesas, notificaciones, vistas de KPI, funciones transaccionales | 15 + 7 vistas |
**Aplicadas en Fase 0:  y  — 29 tablas, 55 políticas, 15 funciones.**  entra en la Fase 2 y  en la Fase 3: **las migraciones siguen las fases**, no se escribe hoy un esquema que no se estrena hasta dentro de seis meses.

> **Ya no existe `0004_areas_y_roles.sql`.** Ese archivo era un parche sobre un anexo SQL que se daba por existente, y ese anexo nunca existió: las migraciones se escribieron desde cero en la Fase 0. Escribir `usuario.rol` en `0001` para reemplazarlo en `0004` habría sido escribir código que ya sabemos que está mal, así que **los roles N:M y `area_id` entran correctos desde `0001`**, y `lista_precio.precios_incluyen_igv` desde `0002`.
>
> Lo que sí se mantiene es el motivo: aunque las áreas no se usen en la interfaz del MVP (D‑06), la columna tiene que existir antes de que haya datos. Y `usuario_rol` hace falta desde el primer login, porque el sponsor ejerce de Gerente y Administrador a la vez.

### Dos reglas que toda migración nueva debe repetir

1. **RLS y `GRANT` son cosas distintas y hacen falta las dos.** RLS filtra *filas*; el `GRANT` da acceso a la *tabla*. Sin grant, la política ni siquiera se evalúa y Postgres responde `permission denied`. Se descubrió probando, no leyendo.
2. **Nada de asumir que toda tabla tiene columna `id`.** `configuracion` es `(tenant_id, clave)` y `usuario_rol` es `(usuario_id, rol)`. El trigger de auditoría deriva la clave primaria de `pg_index`.

### Pruebas de la base

```bash
npm run db:start   # levanta Postgres, Auth, Storage y Studio en Docker
npm run db:test    # reset + pruebas de RLS y auditoría
npm run db:studio  # http://127.0.0.1:54323
```

`supabase/tests/` ataca la base **directamente**, no a través de la interfaz: una regla que sólo se prueba desde el front no está probada. Hoy cubre aislamiento entre laboratorios, escalada de privilegios, unión de roles e inalterabilidad de la bitácora.

Las decisiones del documento DD‑01 están implementadas en el esquema, no sólo documentadas:

- **D‑01** → tablas `cliente` y `doctor` separadas, con `doctor.cliente_id` obligatorio.
- **D‑02** → `cuenta_cobrar.documento_id` es `unique not null`; **no existe** ninguna columna de deuda en `orden_trabajo`. La vista `v_cartera` es la única fuente de verdad.
- **D‑03** → `servicio.precio_base` sin IGV, `afectacion` por línea, importes desagregados en `documento` con los campos que exige SUNAT.
- **D‑04** → `detalle_trabajo` (venta) y `tarea_produccion` (producción) son tablas distintas.
- **D‑05** → `tenant_id` en las 63 tablas, con política RLS generada en bucle.
- **D‑06** → `area_id not null default (área GENERAL del tenant)` en `servicio`, `detalle_trabajo`, `tarea_produccion`, `proceso`, `flujo_produccion` y `usuario`. El seed crea un área `GENERAL` por laboratorio.
- **D‑07** → `lista_precio.precios_incluyen_igv boolean not null default false`; la normalización a valor de venta se hace en la función de guardado, nunca al leer.

---

## 4. Autenticación y custom claims

Toda la seguridad depende de que el JWT lleve `tenant_id` y el **conjunto** de roles. Se configura con el **Custom Access Token Hook** (Supabase → *Authentication → Hooks*).

> **Ojo:** un usuario tiene **varios** roles (AC‑01 §7.2), así que el claim es `roles` (array), no `rol`. Es el caso real desde el día 1: el sponsor es Gerente y Administrador a la vez. Un claim escalar obligaría a inventar roles compuestos, que es justo lo que AC‑01 §4 descarta.

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable
as $$
declare claims jsonb; u record; r text[]; a text[];
begin
  select tenant_id, sede_id, area_id into u
    from public.usuario where id = (event ->> 'user_id')::uuid;

  select array_agg(rol::text) into r
    from public.usuario_rol where usuario_id = (event ->> 'user_id')::uuid;

  -- área principal + áreas en las que puede apoyar
  select array_agg(distinct x) into a from (
    select u.area_id::text as x
    union
    select area_id::text from public.usuario_area_apoyo
     where usuario_id = (event ->> 'user_id')::uuid
  ) s where x is not null;

  claims := event -> 'claims';
  if u.tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(u.tenant_id::text));
    claims := jsonb_set(claims, '{roles}',     to_jsonb(coalesce(r, '{}')));
    claims := jsonb_set(claims, '{areas}',     to_jsonb(coalesce(a, '{}')));
    claims := jsonb_set(claims, '{sede_id}',   to_jsonb(coalesce(u.sede_id::text,'')));
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
```

Las políticas RLS leen ese conjunto con `tiene_rol('administrador','gerencia')`, que concede el permiso si **alguno** de los roles lo otorga.

Configuración de Auth recomendada:

| Parámetro | Valor |
|---|---|
| Proveedores | Email + contraseña. Sin registro público (`Disable signup`): los usuarios los crea el Administrador |
| JWT expiry | 3600 s |
| Refresh token rotation | Activado |
| Longitud mínima de contraseña | 10 caracteres |
| MFA | Activado (TOTP) — **obligatorio para `administrador` y `gerencia`**. Como el sponsor ejerce de ambos desde una sola cuenta, MFA es obligatorio desde el primer login |
| Enforce SSL on incoming connections | **Activado** (*Database → Settings*) |

---

## 5. Storage

| Bucket | Público | Contenido | Límite |
|---|---|---|---|
| `ordenes` | No | Fotos, prescripciones, indicaciones del doctor | 10 MB/archivo |
| `modelos` | No | STL, OBJ, PLY, escaneos | 100 MB/archivo |
| `documentos` | No | PDF de facturas, XML SUNAT | 5 MB |
| `comprobantes` | No | Vouchers de pago, evidencias de entrega | 5 MB |
| `publico` | Sí | Logos de laboratorio | 2 MB |

Todos los buckets privados llevan política por tenant. Ejemplo:

```sql
create policy "archivos del propio tenant"
on storage.objects for all
using (
  bucket_id in ('ordenes','modelos','documentos','comprobantes')
  and (storage.foldername(name))[1] = current_tenant_id()::text
);
```

**Convención de rutas:** `{tenant_id}/{ot_id}/{uuid}-{nombre}`. El `tenant_id` como primer segmento es lo que hace efectiva la política.

Acceso desde el front: siempre por **signed URL** con expiración de 60 minutos; nunca URL pública.

---

## 6. Jobs programados (pg_cron)

```sql
-- Activar la extensión desde el panel: Database → Extensions → pg_cron

select cron.schedule('cxc-vencidas',  '5 0 * * *',  $$ select marcar_cxc_vencidas() $$);
select cron.schedule('promesas',      '10 0 * * *', $$ select evaluar_promesas_vencidas() $$);
select cron.schedule('score-clientes','30 0 * * *', $$ select recalcular_scores() $$);
select cron.schedule('alertas-stock', '0 7 * * *',  $$ select generar_alertas_stock() $$);
select cron.schedule('alertas-entrega','0 7 * * *', $$ select generar_alertas_entrega() $$);
```

> `recalcular_scores()`, `generar_alertas_stock()` y `generar_alertas_entrega()` se implementan en la migración `0005_jobs.sql` durante la Fase 2, con la fórmula de M‑02. *(Era `0004` antes de que ese número lo ocupara `0004_areas_y_roles.sql`.)*

---

## 7. Edge Functions

| Función | Disparador | Propósito | Fase |
|---|---|---|---|
| `emitir-comprobante` | Server Action | Envía el documento al PSE y guarda hash, XML y PDF | 2 |
| `webhook-pse` | HTTP entrante | Recibe la respuesta de SUNAT y actualiza `estado_sunat` | 2 |
| `enviar-whatsapp` | Server Action / cron | Envía plantillas de cobranza por WhatsApp Cloud API | 2 |
| `enviar-email` | cron / evento | Estados de cuenta y notificaciones vía Resend | 2 |
| `generar-estado-cuenta` | Server Action | Arma el PDF del estado de cuenta (RF‑177) | 2 |

Las credenciales de PSE, Meta y Resend van en *Edge Function Secrets*, nunca en el repositorio.

---

## 8. Datos semilla (`seed.sql`)

Se cargan al crear cada laboratorio:

0. **Área `GENERAL`** — un área por laboratorio, que es el valor por defecto de `area_id` en las 6 tablas que lo llevan (D‑06). Cuando el laboratorio defina sus áreas reales, se crean junto a ésta y se reasignan los servicios.
1. **Servicios y precios** — los 12 del prototipo (Corona de Porcelana S/450, Zirconio S/550, Metal‑Porcelana S/380, Carilla de Porcelana S/350, Carilla de Resina S/180, Inlay S/280, Onlay S/320, Prótesis Parcial Acrílica S/450, Metálica S/850, Prótesis Total S/650, Puente Fijo por pieza S/420, Implante sobre Corona S/520). **Ya no hace falta averiguar si incluyen IGV antes de cargarlos** (D‑07): la lista base se marca con `precios_incluyen_igv` según cómo estén capturados y el sistema normaliza al guardar.
2. **Procesos** — Diseño CAD, Impresión 3D, Fresado, Colado, Modelo, Encerado, Cerámica, Acrilizado, Pulido, Glaseado, Acabado.
3. **Flujos por tipo de trabajo** — p. ej. Corona Zirconio: Modelo → Diseño CAD → Fresado → Cerámica → Glaseado → Acabado → Calidad.
4. **Estados de trabajo** con su fase canónica (M‑01).
5. **Materiales** — los 15 del prototipo con su categoría, marca, unidad y costo.
6. **Medios de pago** — Efectivo (`afecta_caja = true`), Transferencia, Yape, Plin, Tarjeta, Depósito.
7. **Escalas de color** — VITA Classical (A1‑D4), VITA 3D‑Master.
8. **Permisos por rol** — la matriz del documento AC‑01.
9. **Series** — `F001` factura, `B001` boleta, `FC01` nota de crédito.
10. **Configuración** — pesos del score, umbrales de segmento, IGV 18 %, días de crédito por defecto.

---

## 9. Verificación posterior al despliegue

Lista de comprobación antes de dar por buena la instalación:

- [ ] Ninguna tabla sin RLS: `select tablename from pg_tables where schemaname='public' and tablename not in (select tablename from pg_policies)` devuelve vacío.
- [ ] Un usuario del tenant A no ve datos del tenant B (probar con dos sesiones).
- [ ] **El JWT lleva `roles` como array.** Una cuenta con dos roles obtiene la unión de ambos permisos, no el más restrictivo.
- [ ] **Ninguna fila queda con `area_id` nulo** tras el seed: `select count(*) from servicio where area_id is null` devuelve 0.
- [ ] **Un precio capturado con IGV se guarda sin IGV.** Cargar S/ 590.00 en una lista marcada `precios_incluyen_igv = true` debe almacenar S/ 500.00.
- [ ] Un técnico sólo ve sus tareas asignadas.
- [ ] Emitir dos documentos en paralelo no produce correlativos duplicados.
- [ ] Un pago mayor al saldo es rechazado por la base, no sólo por la UI.
- [ ] Cambiar una orden a "Entregado" con tareas obligatorias pendientes falla.
- [ ] Un pago en efectivo genera movimiento de caja; uno por Yape, no.
- [ ] `v_cartera` y el dashboard devuelven **la misma cifra de deuda**.
- [ ] La tabla `auditoria` registra un UPDATE sobre `documento`.
- [ ] Enforce SSL activado; conexión sin SSL rechazada.

El punto 8 es la prueba de que el hallazgo H‑01 quedó cerrado.
