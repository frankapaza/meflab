# MEFLAB — ERP + CRM para laboratorios dentales

> **Lee también `AGENTS.md`.** Lo genera `next dev` y avisa de algo importante:
> este proyecto usa **Next.js 16**, cuyas APIs y convenciones cambiaron respecto
> de lo que la mayoría de modelos conoce. Antes de escribir código de App
> Router, consulta `node_modules/next/dist/docs/`.
>
> Los tres cambios que más afectan aquí:
> - `middleware.ts` → **`proxy.ts`**, con función exportada `proxy`. Corre en
>   runtime **nodejs**, no edge.
> - `cookies()`, `headers()`, `params` y `searchParams` son **asíncronos**. No
>   existe el acceso síncrono.
> - Turbopack es el bundler por defecto en `dev` y en `build`.

Software de gestión para laboratorios que fabrican coronas, puentes, prótesis y
carillas por encargo de odontólogos y clínicas. Cubre el ciclo completo: recepción
de la orden, producción por etapas, control de calidad, entrega, facturación y
cobranza.

**Estado a 21/08/2026:** Fases 0, 1 y 2 terminadas. El **ciclo del dinero
cierra de punta a punta**: se emite el documento, nace su cuenta por cobrar,
se cobra en caja repartiendo lo más antiguo primero, se corrige con notas de
crédito y débito, se gestiona la cobranza con agenda de promesas, y la cartera
cuadra al céntimo en las cinco pantallas que la muestran. **H‑01 está cerrado
y hay una prueba que falla si se reabre.** De la Fase 2 sólo queda 2.9
(integraciones), bloqueada hasta que el laboratorio abra las cuentas de PSE,
Resend y WhatsApp. De la **Fase 3** hay ocho de nueve módulos terminados. Sólo queda 3.6:
los 9 KPIs del §26 **no están enumerados en este repositorio** y hay que
recuperarlos del SRS antes de construirlos. Detalle en `docs/04-fases-y-mvp.md`.

---

## Reglas inviolables

1. Toda tabla lleva `tenant_id` y política RLS. Sin excepción.
2. La deuda se lee SIEMPRE de `v_cartera`. Nunca se calcula sumando saldos de
   trabajos. *(Es el hallazgo H‑01: el sistema anterior mostraba tres cifras
   distintas para la misma deuda.)*
3. La cuenta por cobrar nace del documento de venta, jamás del trabajo.
4. `detalle_trabajo` (venta) y `tarea_produccion` (producción) son cosas
   distintas y viven en tablas distintas.
5. Lo que se ALMACENA es siempre valor de venta **sin IGV**. Si una lista de
   precios captura con IGV, se normaliza al guardar — nunca al leer.
6. Dinero en `numeric(12,2)`. Nunca `float`.
7. Las reglas de negocio se implementan en la base de datos primero: constraint
   o trigger. Después la Server Action, para dar un mensaje comprensible.
   Después la UI, para dar feedback inmediato. Una regla que sólo vive en el
   front no es una regla.
8. La `service_role` de Supabase nunca llega al navegador.
9. Toda tabla de producción o catálogo lleva `area_id`, aunque las áreas no se
   usen todavía en la interfaz. Es una decisión de esquema, no una
   funcionalidad.
10. Un usuario tiene **varios** roles. El permiso se concede si alguno lo
    otorga. Nunca se inventa un rol compuesto tipo "Recepción‑Caja".

## Convenciones

- **Base de datos** en español, `snake_case`, singular (`orden_trabajo`,
  `cuenta_cobrar`). Toda tabla de negocio: `id uuid`, `tenant_id uuid`,
  `created_at`, `created_by`, `updated_at`, `updated_by`.
- **Código**: inglés para el framework, español para el dominio
  (`calcularAging`, `OrdenTrabajo`).
- **Fechas** `timestamptz` siempre; se muestran en `America/Lima`, formato
  `dd/mm/aaaa`. Primer día de la semana, lunes.
- **Moneda** `S/`. Todo importe con `font-variant-numeric: tabular-nums`.
- **Diseño**: todo color, tipografía, espaciado y radio sale de
  `styles/tokens.css`. Un `px` literal en un componente es un error de
  revisión, no una preferencia.
- **Accesibilidad**: ningún dato se transmite sólo por color. Estado, semáforo
  y nivel llevan glifo o etiqueta además del color. Contraste mínimo 4,5:1.
- **Server Actions** verifican permiso, no sólo sesión.

## Antes de diseñar una pantalla, ábrela en el prototipo

```bash
cd docs/prototipo && npx http-server -p 8777
# http://localhost:8777/MEFLAB%20Prototipo.dc.html
```

26 pantallas, dos temas, tres densidades, 12 componentes de dominio y los
estados vacíos ya redactados. **No se abre con doble clic**: el runtime hace
`fetch` del propio archivo y `file://` lo bloquea por CORS.

Es probable que lo que vayas a diseñar ya esté resuelto ahí.

## Mapa de documentos

| Documento | Para qué |
|---|---|
| `docs/01-decisiones-de-diseno.md` | Las 7 decisiones cerradas. **No reabrir sin acuerdo** |
| `docs/02-stack-tecnologico.md` | Stack, arquitectura, seguridad, estructura del repo |
| `docs/03-supabase-proyecto.md` | Migraciones, RLS, Auth, Storage, seed, verificación |
| `docs/04-fases-y-mvp.md` | **Qué toca construir ahora.** Fases, backlog y lo que está en espera |
| `docs/05-actores-y-permisos.md` | Los 7 roles reales y la matriz de permisos |
| `docs/06-brief-claude-design.md` | El encargo de diseño y qué se entregó |
| `docs/07-skills-y-agentes.md` | Skills de Claude Code a crear para este repo |
| `docs/Analisis_Software_MEFLAB_v1.md` | Análisis de origen. Histórico: no se actualiza |

## Qué está decidido y qué no

**Decidido** (`docs/01-decisiones-de-diseno.md`): el cliente es el sujeto
comercial y el doctor su contacto · la CxC nace del documento · precios sin IGV
con captura administrable · producción con etapas medidas · multi‑tenant desde
el día 1 · áreas en el esquema pero no en la interfaz.

**Abierto**, sin bloquear el arranque (`docs/04-fases-y-mvp.md` §8):

- Cuántas áreas productivas hay realmente. **Límite: semana 12.**
- Quién hace el control de calidad. Límite: semana 21.
- Qué competencias tiene cada técnico. Límite: semana 21.
- Quién será el segundo Administrador. **Límite: semana 12.**

## Trampas conocidas

- **Dos cifras de deuda.** Si el aging no suma exactamente el KPI "Por cobrar",
  H‑01 sigue abierto. Cuadra al céntimo o está mal.
- **Flechas de variación que mienten.** La flecha ▲▼ sigue a la dirección real
  del dato; el color dice si eso es bueno. "Atrasados bajó 25 %" es ▼ verde,
  nunca ▲ verde.
- **Metas que son techos.** "Capacidad utilizada" por debajo de la meta es
  bueno, no malo. No todo indicador mejora subiendo.
- **El técnico abandona si son más de dos toques.** Es el requisito de mayor
  riesgo del proyecto: si registrar una etapa cuesta, el módulo de producción
  queda vacío y con él la mitad de los indicadores.
