# MEFLAB — Stack tecnológico

**Documento:** ST-01
**Versión:** 1.1 — roles como conjunto en el JWT, tokens de diseño y estructura de repo actualizada
**Fecha:** 16/08/2026
**Estado:** propuesta para aprobación

---

## 1. Resumen ejecutivo

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | **Next.js 16 (App Router) + React 19.2 + TypeScript** | Renderizado en servidor para listados grandes, un solo despliegue, ecosistema maduro. Se instaló la 16 (y no la 15 que decía la v1.0) porque es la versión que entrega `create-next-app@latest` y arrancar un proyecto de 9 meses en n‑1 obliga a migrar a mitad de camino |
| Estilos | **Tailwind CSS v4 + shadcn/ui + Radix UI** | Sistema de diseño consistente, accesible por defecto (Radix), componentes propiedad del proyecto y no de un vendor |
| Estado de datos | **TanStack Query v5** | Caché, revalidación e invalidación por mutación: crítico en un ERP donde una acción cambia cifras en cinco pantallas |
| Formularios | **React Hook Form + Zod** | Validación declarativa reutilizada íntegramente en el servidor |
| Gráficos | **Recharts** | Ya usado en el prototipo, suficiente para los KPIs del dashboard |
| Tablas | **TanStack Table v8** | Grillas con orden, filtro, paginación en servidor y exportación |
| Backend / BD | **Supabase (PostgreSQL 17 + Auth + Storage + Realtime + Edge Functions)** | Postgres real con RLS: la seguridad multi‑tenant vive en la base, no en el código. Reduce a la mitad el backend a construir |
| ORM / acceso | **supabase-js + @supabase/ssr** y SQL directo para reportes | Tipos generados desde el esquema; SQL crudo donde importa el rendimiento |
| Hosting | **Vercel** | Integración nativa con Next.js, TLS automático, preview por rama |
| Archivos | **Supabase Storage** | Fotografías, STL, PDF y vouchers con las mismas políticas RLS |
| Emails | **Resend** | Estados de cuenta y notificaciones; API simple y buena entregabilidad |
| WhatsApp | **WhatsApp Business Cloud API (Meta)** | Fase 2. Plantillas aprobadas para cobranza |
| Facturación electrónica | **PSE peruano vía API (Nubefact / Efact / Bizlinks)** | Fase 2. Evita homologar directamente contra SUNAT |
| Observabilidad | **Sentry + Vercel Analytics + Supabase Logs** | Errores, rendimiento real de usuario y trazas de base de datos |
| CI/CD | **GitHub + Vercel + Supabase CLI** | Migraciones versionadas, despliegue por PR |

---

## 2. Por qué Supabase y no un backend propio

| Necesidad de MEFLAB | Cómo lo resuelve Supabase | Qué costaría construirlo |
|---|---|---|
| Aislamiento multi‑laboratorio | RLS en Postgres, imposible de saltar desde el cliente | Middleware propio en cada endpoint, con riesgo de olvido |
| Autenticación y recuperación de contraseña | Auth incluido, con hashing, sesiones y tokens | 2–3 semanas de desarrollo y mantenimiento indefinido |
| Archivos (STL, fotos, vouchers) | Storage con las mismas políticas de seguridad | Servicio de archivos + firma de URLs |
| Auditoría | Triggers nativos de Postgres | Interceptores en cada capa |
| Kanban en vivo entre técnicos | Realtime sobre cambios de tabla | WebSockets propios |
| Reportes y KPIs | Vistas materializadas y funciones SQL | Capa de agregación propia |
| Backups y recuperación | Automáticos (PITR en plan Pro) | Procedimiento propio + pruebas |

**Contrapartida honesta:** Supabase implica dependencia de un proveedor. Se mitiga porque debajo hay **PostgreSQL estándar**: el esquema, las funciones y los datos son portables a cualquier Postgres administrado (RDS, Cloud SQL, Neon) si alguna vez hace falta. Lo único específico de Supabase es Auth y Storage, ambos reemplazables.

---

## 3. Arquitectura

```
                      ┌──────────────────────────────┐
   Navegador ────────►│  Next.js 16 en Vercel        │
   (HTTPS/TLS 1.3)    │  · Server Components (RSC)   │
                      │  · Server Actions            │
                      │  · Route Handlers (API)      │
                      │  · proxy.ts de sesión        │
                      └───────────┬──────────────────┘
                                  │ HTTPS + JWT
                      ┌───────────▼──────────────────┐
                      │  Supabase                    │
                      │  ┌────────────────────────┐  │
                      │  │ PostgreSQL 17 + RLS    │  │
                      │  │  · esquema meflab      │  │
                      │  │  · triggers auditoría  │  │
                      │  │  · vistas KPI          │  │
                      │  └────────────────────────┘  │
                      │  Auth · Storage · Realtime   │
                      │  Edge Functions (webhooks)   │
                      └───────────┬──────────────────┘
                                  │
      ┌───────────────┬───────────┴────────┬──────────────────┐
      ▼               ▼                    ▼                  ▼
   Resend        WhatsApp Cloud       PSE / SUNAT        Sentry
   (email)          (Meta)          (facturación)      (errores)
```

### Lo que cambia por usar Next 16

Next 16 rompe con lo que la mayoría de documentación y modelos dan por sentado. Los tres cambios que afectan a este proyecto:

| Cambio | Consecuencia aquí |
|---|---|
| `middleware.ts` → **`proxy.ts`**, función exportada `proxy` | Es donde vive la sesión de Supabase y las guardas de ruta. Corre en runtime **nodejs**, no edge — mejor para `@supabase/ssr`, que en edge tenía limitaciones |
| `cookies()`, `headers()`, `params`, `searchParams` son **asíncronos** | Todo cliente de Supabase en servidor se construye con `await cookies()`. El acceso síncrono ya no existe |
| **Turbopack** por defecto en `dev` y `build` | Sin configuración de webpack. Si algún día hiciera falta, `--webpack` la reactiva |

Antes de escribir código de App Router, consultar `node_modules/next/dist/docs/` — la documentación viaja con el paquete y corresponde a la versión instalada.

**Reglas de arquitectura:**

1. **El cliente nunca escribe directo a tablas sensibles.** Facturación, pagos, caja, inventario y cambios de estado pasan por *Server Actions* o funciones de Postgres que aplican las reglas de negocio en una transacción.
2. **Lectura optimista, escritura pesimista.** Los listados leen vía RLS con `supabase-js`; toda mutación con efecto financiero es una transacción atómica del lado servidor.
3. **Las reglas de negocio inviolables viven en la base** (constraints, triggers, funciones): saldo no negativo, correlativos sin salto, no entregar con calidad rechazada. La UI las repite para dar buen feedback, pero la base es la que manda.
4. **Los KPIs se calculan en vistas SQL**, no en JavaScript sobre datos traídos al cliente.

---

## 4. SSL / TLS y seguridad de transporte

Esto es lo que pediste sobre SSL, con el detalle de qué es automático y qué hay que configurar.

### 4.1 Certificados — automático

- **Vercel** provisiona y renueva certificados TLS gratuitos (Let's Encrypt) para el dominio `*.vercel.app` y para cualquier dominio propio que agregues. No hay que comprar ni instalar nada.
- **Supabase** expone su API únicamente por HTTPS con certificado gestionado.
- El redireccionamiento HTTP → HTTPS es automático en ambos.

### 4.2 Dominio propio — pasos

1. En Vercel → *Project* → *Settings* → *Domains* → añadir `app.meflab.pe` (y `meflab.pe` si va la web pública).
2. En el proveedor DNS crear el registro que indique Vercel: `CNAME app → cname.vercel-dns.com` (o registro `A` para el dominio raíz).
3. Vercel valida y emite el certificado en minutos. Renovación automática.
4. Opcional recomendado: dominio propio también para Supabase (*Custom Domain*, plan Pro) → `api.meflab.pe`, para no exponer la URL del proyecto.

### 4.3 Endurecimiento — configurar explícitamente

**a) HSTS y cabeceras de seguridad** en `next.config.ts`:

```ts
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
]

export default {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}
```

**b) Content Security Policy**: se añade tras estabilizar el front (necesita afinar los orígenes de Supabase, Sentry y fuentes). Debe hacerse antes de salir a producción, no después.

**c) Conexión a la base de datos**: cualquier conexión directa a Postgres (migraciones, scripts, backups) debe usar `sslmode=require`. En el panel de Supabase, *Database → Settings*, activar **Enforce SSL on incoming connections**.

**d) Cookies de sesión**: `Secure`, `HttpOnly`, `SameSite=Lax` — es el comportamiento por defecto de `@supabase/ssr`, pero hay que verificarlo en producción.

**e) Claves**: la `service_role` de Supabase **jamás** puede llegar al navegador. Vive sólo en variables de entorno del servidor (Vercel → *Environment Variables*, ámbito *Server*). En el cliente sólo va la `anon key`, que sin RLS correcto no sirve de nada — y por eso RLS es obligatorio en todas las tablas.

**f) TLS mínimo**: Vercel ya negocia TLS 1.2/1.3 y rechaza versiones anteriores. No requiere configuración.

**g) Verificación**: antes de salir a producción, pasar el dominio por SSL Labs y comprobar calificación A o superior.

---

## 5. Seguridad de aplicación

| Control | Implementación |
|---|---|
| Autenticación | Supabase Auth, email + contraseña; MFA opcional para Administrador y Finanzas |
| Contraseñas | Hashing bcrypt gestionado por Supabase (RNF‑003) |
| Autorización | RLS por `tenant_id` + **conjunto de roles** (`roles[]`) y áreas en el JWT, más chequeo de permisos por acción en Server Actions. El permiso se concede si alguno de los roles lo otorga |
| Sesiones | JWT de 1 h con refresh token; expiración por inactividad configurable (RNF‑004) |
| Datos de pacientes | Columnas sensibles restringidas por política RLS según rol (RNF‑006) |
| Auditoría | Trigger genérico sobre tablas críticas con usuario, IP, valor anterior y nuevo (RF‑210) |
| Backups | Automáticos diarios; PITR de 7 días en plan Pro (RNF‑009) |
| Rate limiting | En Route Handlers de login y endpoints públicos del portal |
| Secretos | Variables de entorno en Vercel y Supabase; nunca en el repositorio |

---

## 6. Estructura del repositorio

```
meflab/
├─ app/
│  ├─ (auth)/login/                    # público
│  ├─ (app)/                           # protegido por middleware
│  │  ├─ dashboard/
│  │  ├─ trabajos/                     # kanban + detalle
│  │  ├─ produccion/                   # mis tareas, capacidad
│  │  ├─ calidad/
│  │  ├─ clientes/  doctores/  pacientes/
│  │  ├─ inventario/  compras/
│  │  ├─ facturacion/  pagos/  caja/
│  │  ├─ cobranzas/
│  │  ├─ reportes/
│  │  └─ configuracion/
│  ├─ (portal)/                        # portal del doctor (Fase 3)
│  └─ api/webhooks/                    # PSE, WhatsApp, pagos
├─ components/
│  ├─ ui/                              # shadcn: primitivos
│  ├─ dominio/                         # OdontogramaPicker, KanbanBoard, SelectorColor…
│  └─ layout/
├─ proxy.ts                            # sesión y guardas de ruta (era middleware.ts)
├─ lib/
│  ├─ supabase/{client,server,proxy}.ts
│  ├─ validaciones/                    # esquemas Zod compartidos
│  ├─ acciones/                        # Server Actions por módulo
│  ├─ negocio/                         # cálculos: IGV, aging, score, costos
│  └─ tipos/database.ts                # generado por Supabase CLI
├─ styles/
│  └─ tokens.css                       # tokens del sistema de diseño (@theme de Tailwind v4)
├─ supabase/
│  ├─ migrations/                      # SQL versionado (0001…0004 en Fase 0)
│  ├─ functions/                       # Edge Functions
│  └─ seed.sql                         # catálogos base + área GENERAL
├─ docs/                               # los documentos de este proyecto
│  ├─ prototipo/                       # prototipo navegable de 26 pantallas
│  └─ _superseded/                     # versiones reemplazadas
├─ CLAUDE.md                           # reglas inviolables y convenciones
└─ tests/
   ├─ unit/                            # Vitest: reglas de negocio
   └─ e2e/                             # Playwright: CU críticos
```

---

## 7. Convenciones

- **Base de datos**: español, `snake_case`, singular (`orden_trabajo`, `cuenta_cobrar`). Toda tabla de negocio: `id uuid`, `tenant_id uuid`, `created_at`, `created_by`, `updated_at`, `updated_by`.
- **Código**: inglés para el framework, español para el dominio (`calcularAging`, `OrdenTrabajo`). Consistente con lo que ya lee el equipo.
- **Dinero**: `numeric(12,2)`. **Nunca** `float`.
- **Fechas**: `timestamptz` siempre; se muestran en `America/Lima`.
- **Migraciones**: una por cambio, con `supabase migration new`. Prohibido editar el esquema desde el panel en producción.
- **Diseño**: todo valor de color, tipografía, espaciado o radio sale de `styles/tokens.css`. Un `px` literal en un componente es un error de revisión, no una preferencia.
- **Accesibilidad**: ningún dato se transmite sólo por color. Estado, semáforo y nivel llevan glifo o etiqueta además del color.
- **Tests obligatorios** sobre: cálculo de IGV, **normalización de precios con IGV incluido**, aplicación de pagos, aging, score, correlativos y transiciones de estado.

---

## 8. Entornos

| Entorno | Front | Base de datos | Uso |
|---|---|---|---|
| Local | `next dev` | Supabase local (Docker) | Desarrollo |
| Preview | Vercel por rama | Proyecto Supabase `meflab-dev` | Revisión por PR |
| Producción | Vercel `main` | Proyecto Supabase `meflab-prod` | Operación real |

Se recomiendan **dos proyectos Supabase separados** (dev y prod). Nunca compartir la base entre entornos.

---

## 9. Costo de operación estimado (referencial)

| Servicio | Plan | Costo mensual |
|---|---|---|
| Vercel | Hobby → Pro | US$ 0 → 20 |
| Supabase | Free → Pro | US$ 0 → 25 |
| Resend | Free (3 000 emails) → Pro | US$ 0 → 20 |
| Sentry | Developer | US$ 0 |
| Dominio | .pe anual | ≈ US$ 3/mes |
| WhatsApp Cloud API | por conversación | variable, desde Fase 2 |
| PSE facturación | por comprobante | variable, desde Fase 2 |

**Fases 1–2 operan bajo US$ 50/mes.** Se recomienda pasar a los planes Pro antes de salir a producción con datos reales, por los backups PITR y el soporte.
