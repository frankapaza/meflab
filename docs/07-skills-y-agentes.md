# MEFLAB — Skills y agentes para el desarrollo

**Documento:** SK-01
**Versión:** 1.1 — `CLAUDE.md` actualizado con las reglas 5, 9 y 10 y con el prototipo
**Fecha:** 16/08/2026

Skills de Claude Code a crear en el repositorio `meflab/.claude/skills/` para que el desarrollo del proyecto sea repetible y consistente. Complementan a las que ya usas (`sql-script`, `documentador`, `brainstorming`, `writing-plans`).

> Si lo que buscabas con "skills" eran las **competencias de los técnicos dentales** (para la asignación de trabajos), están en el documento `05-actores-y-permisos.md` §4.

---

## 1. Skills propuestas

### `meflab-migracion` — Crear una migración de base de datos
**Cuándo se dispara:** "crea la tabla…", "agrega el campo…", "necesito una migración", cualquier cambio de esquema.

**Qué hace:**
1. Genera el archivo en `supabase/migrations/NNNN_descripcion.sql` con numeración correlativa.
2. Aplica las convenciones obligatorias: `tenant_id` con FK a `tenant`, `id uuid` con `gen_random_uuid()`, `created_at`/`created_by`/`updated_at`/`updated_by`, nombres en español snake_case singular, `numeric(12,2)` para dinero, `timestamptz` para fechas.
3. **Añade siempre la política RLS** por `tenant_id` — ninguna tabla nueva puede quedar sin ella.
4. Registra la tabla en auditoría si es de las críticas (documentos, pagos, inventario, precios, órdenes).
5. Regenera los tipos con `supabase gen types typescript`.
6. Recuerda ejecutar `supabase db push` en dev antes de tocar prod.

**Por qué:** una tabla sin RLS es una fuga de datos entre laboratorios. Es el error más caro y el más fácil de cometer.

---

### `meflab-modulo` — Andamiaje de un módulo completo
**Cuándo se dispara:** "crea el módulo de…", "necesito el CRUD de…".

**Qué genera:**
```
app/(app)/<modulo>/page.tsx           listado con filtros y paginación en servidor
app/(app)/<modulo>/[id]/page.tsx      detalle
components/<modulo>/                  formulario, tabla, tarjetas
lib/validaciones/<modulo>.ts          esquemas Zod (cliente + servidor)
lib/acciones/<modulo>.ts              Server Actions con verificación de permisos
tests/unit/<modulo>.test.ts           reglas de negocio
```

Cada Server Action generada incluye: verificación de sesión, llamada a `tiene_permiso(modulo, accion)`, validación Zod, transacción y `revalidatePath`.

---

### `meflab-regla-negocio` — Implementar una regla RN‑xxx
**Cuándo se dispara:** "implementa la RN‑012", "valida que el pago no exceda el saldo".

**Qué hace:** implementa la regla **en tres capas**, en este orden:
1. **Base de datos** — constraint o trigger. Es la que manda: nadie la puede saltar.
2. **Server Action** — para devolver un mensaje comprensible en vez de un error de Postgres.
3. **UI** — validación en el formulario para dar feedback inmediato.

Y genera el test que prueba que la regla se cumple **atacándola desde la base de datos directamente**, no sólo desde la UI.

**Por qué:** el análisis mostró que el prototipo permite estados imposibles (pagos que no cuadran, trabajos entregados sin control de calidad). Las reglas que sólo viven en el front no son reglas.

---

### `meflab-kpi` — Añadir un indicador
**Cuándo se dispara:** "agrega el KPI de…", "necesito el indicador de rentabilidad por doctor".

**Qué hace:** crea el indicador como **vista SQL** (nunca como cálculo en JavaScript), lo documenta con su fórmula en un comentario `comment on view`, genera el componente de tarjeta o gráfico, y añade el test que verifica la fórmula con datos conocidos.

**Regla que hace cumplir:** ningún indicador de deuda se calcula fuera de `v_cartera`. Es la salvaguarda contra el hallazgo H‑01.

---

### `meflab-componente` — Componente de dominio
**Cuándo se dispara:** "crea el componente OdontogramaPicker", "necesito el selector de color".

**Qué hace:** **primero busca el componente en `docs/prototipo/`** — los 12 de dominio ya están diseñados con sus estados. Luego lo traduce a React siguiendo el sistema de diseño (tokens, no valores literales), con sus estados (normal, hover, foco, deshabilitado, cargando, error, vacío), accesible por teclado, con `aria-label`, y con su historia de uso documentada.

**Regla que hace cumplir:** ningún dato se transmite sólo por color. Todo estado lleva glifo, icono o etiqueta además del color — es lo que permite que el tablero se lea impreso en gris y con daltonismo.

---

### `meflab-revision` — Revisión antes de PR
**Cuándo se dispara:** "revisa antes del PR", "¿está listo para merge?".

**Lista de comprobación:**
- [ ] ¿Toda tabla nueva tiene RLS y `tenant_id`?
- [ ] ¿Las Server Actions verifican permisos, no sólo sesión?
- [ ] ¿Hay algún cálculo de dinero en `float`?
- [ ] ¿Algún importe se calcula en el cliente en lugar de en SQL?
- [ ] ¿Se usa `v_cartera` para cualquier cifra de deuda?
- [ ] ¿Las fechas son `timestamptz` y se muestran en `America/Lima`?
- [ ] ¿Las operaciones críticas quedan auditadas?
- [ ] ¿La `service_role` está fuera del bundle del cliente?
- [ ] ¿Hay estados vacíos, de carga y de error en las pantallas nuevas?
- [ ] ¿Los textos están en español, sin cadenas hardcodeadas en inglés?

---

### `meflab-seed` — Datos de prueba realistas
**Cuándo se dispara:** "genera datos de prueba", "necesito poblar dev".

**Qué hace:** genera un laboratorio completo con datos coherentes entre sí: 20 clientes, 35 doctores, 150 pacientes, 400 órdenes en distintos estados y fechas, sus etapas, consumos, documentos, pagos, cuentas por cobrar y gestiones de cobranza — **cuadrando**: la suma de `v_cartera` debe coincidir con los documentos emitidos menos los pagos aplicados. Nombres y precios verosímiles del rubro dental peruano.

---

### `meflab-caso-uso` — Documentar un caso de uso
**Cuándo se dispara:** "documenta el CU‑011", "escribe el caso de uso de facturación".

**Qué hace:** genera el caso de uso con el formato del SRS (actor principal, precondición, flujo principal numerado, postcondición, excepciones) **más** los criterios de aceptación en Given/When/Then listos para Playwright.

---

## 2. Subagentes recomendados

| Agente | Uso |
|---|---|
| `meflab-arquitecto` | Decisiones de modelo de datos y arquitectura. Conoce DD‑01 y rechaza propuestas que contradigan las decisiones cerradas (p. ej., agregar una columna de deuda a `orden_trabajo`) |
| `meflab-auditor-seguridad` | Revisa que ninguna tabla quede sin RLS, que no haya claves filtradas y que los permisos se verifiquen en servidor |
| `meflab-tester` | Genera pruebas Playwright de los casos de uso críticos: CU‑005, CU‑014, CU‑015, CU‑016 |
| `documentador` *(ya existente)* | Manual de usuario por rol al cerrar cada fase |

---

## 3. Archivo `CLAUDE.md` del repositorio

Contenido mínimo que debe llevar el repositorio `meflab/` para que cualquier sesión de Claude Code parta con el contexto correcto:

```markdown
# MEFLAB — ERP + CRM para laboratorios dentales

## Reglas inviolables
1. Toda tabla lleva `tenant_id` y política RLS. Sin excepción.
2. La deuda se lee SIEMPRE de `v_cartera`. Nunca se calcula sumando saldos de trabajos.
3. La cuenta por cobrar nace del documento de venta, jamás del trabajo.
4. `detalle_trabajo` (venta) y `tarea_produccion` (producción) son cosas distintas.
5. Lo que se ALMACENA es siempre valor de venta sin IGV. Si una lista de precios
   captura con IGV, se normaliza al guardar — nunca al leer.
6. Dinero en `numeric(12,2)`. Nunca `float`.
7. Las reglas de negocio se implementan en la base de datos primero.
8. La `service_role` de Supabase nunca llega al navegador.
9. Toda tabla de producción o catálogo lleva `area_id`, aunque las áreas no se
   usen todavía en la interfaz. Es esquema, no funcionalidad.
10. Un usuario tiene VARIOS roles. El permiso se concede si alguno lo otorga.
    Nunca se inventa un rol compuesto.

## Convenciones
- BD en español, snake_case, singular.
- Fechas `timestamptz`, se muestran en `America/Lima`, formato dd/mm/aaaa.
- Componentes con tokens del sistema de diseño, nunca valores literales.
  Ni un `px` de tipografía, color o radio suelto en un componente.
- Server Actions verifican permiso, no sólo sesión.
- Ningún dato que se transmita sólo por color: siempre glifo, icono o etiqueta.

## Antes de diseñar una pantalla, mírala en el prototipo
`docs/prototipo/MEFLAB Prototipo.dc.html` tiene 26 pantallas ya resueltas.
Necesita servidor (`npx http-server -p 8777`), no se abre con doble clic.

## Documentos de referencia
- `docs/01-decisiones-de-diseno.md` — decisiones cerradas, no reabrir sin acuerdo
- `docs/02-stack-tecnologico.md`
- `docs/03-supabase-proyecto.md` — migraciones, RLS, seed
- `docs/04-fases-y-mvp.md` — qué toca construir ahora, y qué está en espera
- `docs/05-actores-y-permisos.md` — matriz de permisos
- `docs/06-brief-claude-design.md` — el encargo de diseño y qué se entregó
```

---

## 4. Orden de creación

| Momento | Skills a crear |
|---|---|
| Antes de la Fase 0 | `CLAUDE.md`, `meflab-migracion` |
| Durante la Fase 0 | `meflab-modulo`, `meflab-revision` |
| Durante la Fase 1 | `meflab-componente`, `meflab-regla-negocio`, `meflab-seed` |
| Durante la Fase 2 | `meflab-kpi`, `meflab-caso-uso` |
