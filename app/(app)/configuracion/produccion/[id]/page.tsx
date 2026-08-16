import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { EditorEtapas, type OpcionProceso } from "./editor-etapas";

export const metadata = { title: "Flujo de producción · MEFLAB" };

export default async function FlujoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: flujo }, { data: procesos }, { data: etapas }, { data: servicios }] =
    await Promise.all([
      supabase
        .from("flujo_produccion")
        .select("id, nombre, activo")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("proceso")
        .select("id, codigo, nombre, horas_estimadas")
        .eq("activo", true)
        .order("codigo"),
      supabase
        .from("flujo_etapa")
        .select("proceso_id, orden")
        .eq("flujo_id", id)
        .order("orden"),
      supabase.from("servicio").select("id, codigo, nombre").eq("flujo_id", id).order("codigo"),
    ]);

  if (!flujo) notFound();

  const opciones: OpcionProceso[] = (procesos ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    horasEstimadas: Number(p.horas_estimadas),
  }));

  const secuencia = (etapas ?? []).map((e) => e.proceso_id);
  const puedeEditar = ctx.roles.includes("administrador");
  const usanEsteFlujo = servicios ?? [];

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          <Link href="/configuracion/produccion" className="hover:text-acc">
            Procesos y flujos
          </Link>
        </span>
        <div className="flex flex-wrap items-center gap-s3">
          <h1 className="text-2xl font-semibold tracking-tight">{flujo.nombre}</h1>
          {!flujo.activo ? (
            <span className="rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-3">
              RETIRADO
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-04
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Al registrar una orden, estas etapas se <b className="font-semibold text-ink">copian</b> como
          tareas concretas. Es lo que llena el tablero y lo que sostiene los
          indicadores de tiempo: sin etapas, el kanban es decorativo.
        </p>
      </div>

      {opciones.length === 0 ? (
        <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
          No hay procesos activos. Crea los pasos del taller antes de armar el
          flujo.
        </p>
      ) : (
        <EditorEtapas
          flujoId={flujo.id}
          procesos={opciones}
          secuenciaInicial={secuencia}
          puedeEditar={puedeEditar}
        />
      )}

      <div className="flex flex-col gap-s2 rounded-r2 border border-line bg-card p-s4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Servicios que siguen este flujo
        </h2>
        {usanEsteFlujo.length === 0 ? (
          <p className="text-sm leading-relaxed text-ink-3">
            Ninguno todavía. Un flujo sin servicios asignados no se instancia
            nunca: la receta existe pero no la usa nadie. Se asigna desde{" "}
            <Link href="/configuracion" className="text-acc hover:underline">
              el catálogo
            </Link>
            , al editar cada servicio.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-s2">
            {usanEsteFlujo.map((s) => (
              <li
                key={s.id}
                className="rounded-r1 border border-line bg-card-2 px-s3 py-s1 text-sm"
              >
                <span className="font-mono text-xs text-ink-3">{s.codigo}</span>{" "}
                {s.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
