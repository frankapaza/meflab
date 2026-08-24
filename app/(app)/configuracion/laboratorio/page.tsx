import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { Identidad, Parametro } from "./formularios";

export const metadata = { title: "Laboratorio y parámetros · MEFLAB" };

/**
 * El índice de la configuración (3.9).
 *
 * Reúne lo que hasta ahora sólo se podía cambiar por SQL —la identidad
 * del laboratorio y sus parámetros numéricos— y enlaza el resto de
 * catálogos, que ya tenían su pantalla. No los absorbe: una pantalla
 * única con seis catálogos dentro se convierte en una pantalla que nadie
 * termina de leer.
 */
export default async function LaboratorioPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: lab }, { data: sede }, { data: parametros }, { count: servicios }, { count: usuarios }] =
    await Promise.all([
      supabase.from("tenant").select("id, nombre, ruc").maybeSingle(),
      supabase.from("sede").select("id, nombre, direccion").order("created_at").limit(1).maybeSingle(),
      supabase.from("configuracion").select("clave, valor"),
      supabase.from("servicio").select("*", { count: "exact", head: true }),
      supabase.from("usuario").select("*", { count: "exact", head: true }).eq("activo", true),
    ]);

  const valorDe = (clave: string, campo: string): number => {
    const fila = (parametros ?? []).find((p) => p.clave === clave);
    const v = fila?.valor as Record<string, number> | null;
    return Number(v?.[campo] ?? 0);
  };

  const igv = valorDe("igv", "tasa");
  const costoHora = valorDe("costo_hora", "soles");
  const diasCredito = valorDe("dias_credito_default", "dias");

  const puedeEditar = ctx.roles.includes("administrador");

  const CATALOGOS = [
    {
      href: "/configuracion",
      titulo: "Catálogo y tarifas",
      nota: `${servicios ?? 0} servicios`,
      que: "Qué fabrica el laboratorio y a qué precio base.",
    },
    {
      href: "/configuracion/listas",
      titulo: "Listas de precio",
      nota: "por cliente o convenio",
      que: "Tarifas distintas para clínicas con acuerdo. Cada lista decide si captura con IGV o sin él.",
    },
    {
      href: "/configuracion/produccion",
      titulo: "Procesos y flujos",
      nota: "la receta de cada trabajo",
      que: "Las etapas por las que pasa cada servicio. Sin flujo, una orden entra en producción sin ninguna tarea.",
    },
    {
      href: "/configuracion/areas",
      titulo: "Áreas y competencias",
      nota: "quién sabe hacer qué",
      que: "La matriz competencia × técnico y qué exige cada proceso.",
    },
    {
      href: "/configuracion/usuarios",
      titulo: "Usuarios y permisos",
      nota: `${usuarios ?? 0} activos`,
      que: "Quién entra y con qué roles. Un usuario puede tener varios.",
    },
    {
      href: "/auditoria",
      titulo: "Auditoría",
      nota: "quién cambió qué",
      que: "La bitácora completa. Nadie puede editarla ni borrarla.",
    },
  ];

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Configuración
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Laboratorio y parámetros
        </h1>
      </header>

      {/* ── identidad ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <div className="flex flex-wrap items-baseline justify-between gap-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Datos del laboratorio
          </h2>
          <span className="font-mono text-xs text-ink-3">
            se imprimen en cada comprobante
          </span>
        </div>

        <Identidad
          nombre={lab?.nombre ?? ""}
          ruc={lab?.ruc ?? null}
          direccion={sede?.direccion ?? null}
          sedeId={sede?.id ?? ""}
          puedeEditar={puedeEditar}
        />
      </section>

      {/* ── parámetros ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <div className="flex flex-wrap items-baseline justify-between gap-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Parámetros
          </h2>
          <span className="font-mono text-xs text-ink-3">
            viven en la base, no en el código
          </span>
        </div>

        <p className="max-w-[760px] text-sm leading-relaxed text-ink-2">
          El IGV cambia por decreto y el costo de la hora con los sueldos.
          Ninguno de los dos puede exigir un despliegue, así que se guardan
          como dato del laboratorio.
        </p>

        <div className="grid gap-s3 lg:grid-cols-3">
          <Parametro
            clave="igv"
            etiqueta="Tasa de IGV"
            valor={igv}
            paso="0.01"
            sufijo={`= ${(igv * 100).toFixed(0)} %`}
            ayuda="Se congela en cada documento al emitirlo: cambiarla no altera lo ya facturado."
            puedeEditar={puedeEditar}
            alerta={igv === 0 ? "Sin IGV configurado se facturaría a tasa cero." : undefined}
          />

          <Parametro
            clave="costo_hora"
            etiqueta="Costo de la hora"
            valor={costoHora}
            paso="0.5"
            sufijo="S/ / hora"
            ayuda="Con esto se valora la mano de obra de cada etapa en el costo real."
            puedeEditar={puedeEditar}
            alerta={
              costoHora === 0
                ? "Sin configurar, la mano de obra vale cero y los márgenes salen más altos de lo que son. No da error: da una cifra tranquilizadora y falsa."
                : undefined
            }
          />

          <Parametro
            clave="dias_credito_default"
            etiqueta="Crédito por defecto"
            valor={diasCredito}
            paso="1"
            sufijo="días"
            ayuda="Lo que se propone al dar de alta un cliente nuevo. Cada uno puede tener el suyo."
            puedeEditar={puedeEditar}
          />
        </div>

        {!puedeEditar ? (
          <p className="text-sm text-ink-3">
            Sólo el Administrador puede cambiar estos parámetros.
          </p>
        ) : null}
      </section>

      {/* ── el resto de catálogos ────────────────────────────────────── */}
      <section className="flex flex-col gap-s3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-3">
          Catálogos
        </h2>
        <div className="grid gap-s3 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOGOS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="flex flex-col gap-s1 rounded-r2 border border-line bg-card p-s4 shadow-e1 transition hover:border-acc"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-s2">
                <span className="text-base font-medium">{c.titulo}</span>
                <span className="font-mono text-xs text-ink-3">{c.nota}</span>
              </div>
              <span className="text-sm leading-relaxed text-ink-2">{c.que}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
