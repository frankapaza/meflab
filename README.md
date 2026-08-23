# MEFLAB

ERP + CRM para laboratorios dentales. Cubre el ciclo completo de un trabajo
por encargo: recepción de la orden, producción por etapas, control de
calidad, entrega, facturación y cobranza.

## Por qué existe

El sistema anterior mostraba **tres cifras distintas de la misma deuda**
según la pantalla que se mirara: S/ 7 150 en doctores, S/ 4 230 en
cobranzas, S/ 4 970 en facturas. Ése es el hallazgo **H‑01**, y es la razón
de ser del proyecto.

La causa no era un error de cálculo: era que la deuda podía nacer de dos
sitios —del trabajo y de la factura— sin conciliación entre ellos. La
corrección es estructural, no un informe que cuadre las cifras:

- La cuenta por cobrar nace **exclusivamente** del documento de venta.
  `cuenta_cobrar.documento_id` es `unique not null`, y **no existe** ninguna
  columna de deuda en `orden_trabajo`. La estructura hace imposible el
  error en vez de confiar en que nadie lo cometa.
- Toda cifra de deuda se lee de `v_cartera`. Ninguna se calcula sumando
  saldos de trabajos, ni siquiera «sólo para este resumen».
- Hay una prueba que **falla** si la suma de los tramos del aging deja de
  cuadrar al céntimo con el total por cobrar.

El mismo principio se aplica en el almacén: las existencias se derivan de
los movimientos y no hay columna de stock, porque dos fuentes para el mismo
número acaban discrepando.

## Estado

| Fase | Qué es | Estado |
|---|---|---|
| 0 · Cimientos | Esquema, RLS, auth, multi‑tenant | Terminada |
| 1 · MVP | Órdenes, producción por etapas, entregas | Terminada |
| 2 · Ciclo del dinero | Facturación, CxC, pagos, caja, cobranza | Terminada salvo integraciones |
| 3 · Control y calidad | Calidad, retrabajos, inventario, costos, competencias, auditoría | 7 de 9 módulos |
| 4 · Ecosistema | Portal del doctor, compras, BI, móvil | Sin empezar |

Lo que falta y por qué está en [`docs/04-fases-y-mvp.md`](docs/04-fases-y-mvp.md).

## Stack

**Next.js 16** (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4
· **Supabase** (Postgres 17, Auth, Storage) con RLS en todas las tablas.

> Next 16 cambió cosas que la mayoría de modelos y tutoriales aún no
> reflejan: `middleware.ts` pasó a ser **`proxy.ts`** en runtime nodejs, y
> `cookies()`, `headers()`, `params` y `searchParams` son **asíncronos**.

## Arrancar en local

Hace falta Docker Desktop abierto.

```bash
npm install
npm run db:start     # Postgres, Auth, Storage y Studio en Docker
npm run db:demo      # datos de demostración recorribles
npm run dev
```

Entra en http://localhost:3000 con `sponsor@labvera.pe`. La contraseña de
desarrollo está en `supabase/seed.sql`.

## Verificar

```bash
npm run db:test      # 6 suites SQL · 70 comprobaciones
npm test             # 198 pruebas unitarias
npx tsc --noEmit && npx eslint .
```

Las pruebas SQL atacan la base **directamente**, no a través de la
interfaz: una regla que sólo se prueba desde el front no está probada.
Cubren aislamiento entre laboratorios, escalada de privilegios, unión de
roles, inalterabilidad de la bitácora y —la que más importa— que H‑01 siga
cerrado.

## Cómo se toman las decisiones aquí

1. **Las reglas de negocio viven en la base primero.** Constraint o
   trigger; después la Server Action, para dar un mensaje comprensible;
   después la interfaz, para dar respuesta inmediata. Una regla que sólo
   vive en el front no es una regla: se salta llamando a la API.
2. **Ningún dato se transmite sólo por color.** Estado, semáforo y nivel
   llevan glifo o etiqueta: el tablero se imprime, se fotocopia en gris y
   lo lee gente con daltonismo.
3. **Dinero en `numeric(12,2)`**, nunca `float`. Lo almacenado es siempre
   valor de venta sin IGV.

Las siete decisiones cerradas están en
[`docs/01-decisiones-de-diseno.md`](docs/01-decisiones-de-diseno.md) y no se
reabren sin acuerdo.

## Documentación

| Documento | Para qué |
|---|---|
| `CLAUDE.md` | Reglas inviolables y convenciones. Se lee antes de tocar código |
| `docs/01-decisiones-de-diseno.md` | Las decisiones cerradas |
| `docs/02-stack-tecnologico.md` | Arquitectura y seguridad |
| `docs/03-supabase-proyecto.md` | Migraciones, RLS, auth, seed |
| `docs/04-fases-y-mvp.md` | **Qué toca construir ahora** |
| `docs/05-actores-y-permisos.md` | Los 7 roles y la matriz de permisos |
| `docs/prototipo/` | 26 pantallas navegables, dos temas, tres densidades |
