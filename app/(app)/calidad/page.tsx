import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { CAUSAS, POLITICAS, RESULTADOS } from "@/lib/dominio/calidad";

import { Inspeccionar, type ChecklistOpcion, type OrdenInspeccionable } from "./inspeccionar";
import { CerrarRetrabajo, NuevoRetrabajo } from "./retrabajo";

export const metadata = { title: "Calidad · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const hora = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

export default async function CalidadPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [
    { data: ordenes },
    { data: checklists },
    { data: inspecciones },
    { data: retrabajos },
  ] = await Promise.all([
    // Se inspecciona lo que está en producción o listo, no lo entregado:
    // revisar algo que ya salió del laboratorio llega tarde.
    supabase
      .from("orden_trabajo")
      .select(
        "id, codigo, fecha_comprometida, estado:estado_id(nombre, fase), cliente:cliente_id(razon_social), detalle_trabajo(servicio_id, servicio:servicio_id(nombre))",
      )
      .order("fecha_comprometida")
      .limit(80),
    supabase
      .from("checklist_calidad")
      .select("id, nombre, servicio_id, punto:checklist_punto(id, orden, descripcion, critico)")
      .eq("activo", true),
    supabase
      .from("inspeccion")
      .select(
        "id, resultado, observaciones, inspeccionado_en, orden:orden_id(id, codigo), usuario:inspeccionado_por(nombre)",
      )
      .order("inspeccionado_en", { ascending: false })
      .limit(15),
    supabase
      .from("retrabajo")
      .select(
        "id, causa, politica, descripcion, importe_facturable, costo_generado, abierto_en, cerrado_en, orden:orden_id(id, codigo)",
      )
      .order("abierto_en", { ascending: false })
      .limit(15),
  ]);

  type Chk = {
    id: string;
    nombre: string;
    servicio_id: string | null;
    punto: { id: string; orden: number; descripcion: string; critico: boolean }[];
  };

  const listaChecklists = (checklists ?? []) as unknown as Chk[];

  const opciones: ChecklistOpcion[] = listaChecklists.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    servicioId: c.servicio_id,
    puntos: [...c.punto]
      .sort((a, b) => a.orden - b.orden)
      .map((p) => ({
        id: p.id,
        descripcion: p.descripcion,
        critico: p.critico,
      })),
  }));

  const inspeccionables: OrdenInspeccionable[] = ((ordenes ?? []) as unknown as {
    id: string;
    codigo: string;
    estado: { nombre: string; fase: string } | null;
    cliente: { razon_social: string } | null;
    detalle_trabajo: { servicio_id: string; servicio: { nombre: string } | null }[];
  }[])
    .filter((o) => o.estado?.fase !== "anulada")
    .map((o) => ({
      id: o.id,
      codigo: o.codigo,
      cliente: o.cliente?.razon_social ?? "—",
      estado: o.estado?.nombre ?? "—",
      servicioIds: o.detalle_trabajo.map((d) => d.servicio_id),
      trabajo: o.detalle_trabajo[0]?.servicio?.nombre ?? "Trabajo",
    }));

  const listaInsp = (inspecciones ?? []) as unknown as {
    id: string;
    resultado: keyof typeof RESULTADOS;
    observaciones: string | null;
    inspeccionado_en: string;
    orden: { id: string; codigo: string } | null;
    usuario: { nombre: string } | null;
  }[];

  const listaRetr = (retrabajos ?? []) as unknown as {
    id: string;
    causa: string;
    politica: string;
    descripcion: string;
    importe_facturable: number;
    costo_generado: number | null;
    abierto_en: string;
    cerrado_en: string | null;
    orden: { id: string; codigo: string } | null;
  }[];

  // KPI de retrabajo: cuántos trabajos inspeccionados acabaron rehechos.
  // Es la cifra que dice si la calidad mejora o se está degradando.
  const inspeccionadas = new Set(listaInsp.map((i) => i.orden?.id).filter(Boolean)).size;
  const rehechas = new Set(listaRetr.map((r) => r.orden?.id).filter(Boolean)).size;
  const tasaRetrabajo = inspeccionadas > 0 ? Math.round((rehechas / inspeccionadas) * 100) : 0;

  const costoMalaCalidad = listaRetr.reduce((s, r) => s + Number(r.costo_generado ?? 0), 0);
  const abiertos = listaRetr.filter((r) => !r.cerrado_en);

  const puedeInspeccionar = ctx.roles.some((r) =>
    ["administrador", "lider_laboratorio", "lider_area"].includes(r),
  );

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Producción
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Control de calidad</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          Veredicto
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          El resultado <b className="font-semibold text-ink">lo deduce el
          checklist</b>, no lo elige quien inspecciona: si falla un punto
          crítico es rechazo, siempre. Dejarlo a criterio abre la puerta a
          «apruebo aunque falló el ajuste, que ya lo arreglan en clínica».
        </p>
      </div>

      <div className="grid gap-s3 sm:grid-cols-3">
        <Kpi
          etiqueta="Tasa de retrabajo"
          valor={`${tasaRetrabajo} %`}
          nota={`${rehechas} de ${inspeccionadas} inspeccionados`}
          alerta={tasaRetrabajo > 5}
        />
        <Kpi
          etiqueta="Costo de la mala calidad"
          valor={soles.format(costoMalaCalidad)}
          nota="material consumido al rehacer"
          alerta={costoMalaCalidad > 0}
        />
        <Kpi
          etiqueta="Retrabajos abiertos"
          valor={String(abiertos.length)}
          nota={abiertos.length > 0 ? "▲ sin cerrar" : "■ ninguno pendiente"}
          alerta={abiertos.length > 0}
        />
      </div>

      {puedeInspeccionar ? (
        <div className="flex flex-wrap gap-s2">
          <Inspeccionar ordenes={inspeccionables} checklists={opciones} />
          <NuevoRetrabajo ordenes={inspeccionables} />
        </div>
      ) : null}

      {/* ── inspecciones ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Últimas inspecciones
          </h2>
          <span className="font-mono text-xs text-ink-3">{listaInsp.length} registradas</span>
        </div>

        {listaInsp.length === 0 ? (
          <div className="grid min-h-[180px] place-items-center p-s6">
            <div className="flex max-w-[420px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                Todavía no se ha inspeccionado nada
              </h3>
              <p className="text-base leading-relaxed text-ink-2">
                Sin inspecciones, la tasa de retrabajo será siempre cero y el
                costo de la mala calidad, invisible. Es así como se vuelve
                crónica.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col px-pad-x">
            {listaInsp.map((i) => {
              const r = RESULTADOS[i.resultado] ?? RESULTADOS.aprobado;
              return (
                <li
                  key={i.id}
                  className="flex flex-col gap-[2px] border-b border-line py-s3 last:border-0"
                >
                  <div className="flex flex-wrap items-baseline gap-s3">
                    <span className={`font-mono text-sm ${r.clase}`}>
                      <span aria-hidden="true">{r.glifo}</span> {r.etiqueta}
                    </span>
                    <span className="font-mono text-sm">{i.orden?.codigo ?? "—"}</span>
                    <span className="min-w-0 flex-1" />
                    <span className="font-mono text-xs text-ink-3">
                      {i.usuario?.nombre ?? "—"} · {hora.format(new Date(i.inspeccionado_en))}
                    </span>
                  </div>
                  {i.observaciones ? (
                    <p className="text-sm leading-relaxed text-ink-2">{i.observaciones}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── retrabajos ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Retrabajos
          </h2>
          <span className="font-mono text-xs text-ink-3">
            cuelgan de la orden original
          </span>
        </div>

        {listaRetr.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            No hay retrabajos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Trabajo</th>
                  <th className="px-pad-x py-s2 font-medium">Causa</th>
                  <th className="px-pad-x py-s2 font-medium">Garantía</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Se le cobra</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Nos costó</th>
                  <th className="px-pad-x py-s2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {listaRetr.map((r) => {
                  const causa = CAUSAS.find((c) => c.valor === r.causa);
                  const pol = POLITICAS.find((p) => p.valor === r.politica);
                  return (
                    <tr key={r.id} className="border-b border-line last:border-0 align-top">
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="font-mono text-sm">{r.orden?.codigo ?? "—"}</span>
                          <span className="max-w-[280px] text-sm text-ink-2">
                            {r.descripcion}
                          </span>
                        </div>
                      </td>
                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        {causa?.etiqueta ?? r.causa}
                      </td>
                      <td className="px-pad-x py-s3">
                        <span className="font-mono text-xs uppercase text-ink-2">
                          {pol?.etiqueta ?? r.politica}
                        </span>
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {Number(r.importe_facturable) > 0
                          ? soles.format(Number(r.importe_facturable))
                          : <span className="text-ink-3">—</span>}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {r.costo_generado === null ? (
                          <span className="text-ink-3">sin cerrar</span>
                        ) : (
                          <span className="text-warn">
                            {soles.format(Number(r.costo_generado))}
                          </span>
                        )}
                      </td>
                      <td className="px-pad-x py-s3">
                        {r.cerrado_en ? (
                          <span className="font-mono text-xs text-ok">
                            <span aria-hidden="true">■</span> cerrado
                          </span>
                        ) : (
                          <CerrarRetrabajo retrabajoId={r.id} codigo={r.orden?.codigo ?? "—"} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  nota,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-s1 rounded-r2 border bg-card p-s4 shadow-e1 ${
        alerta ? "border-warn" : "border-line"
      }`}
    >
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</span>
      <span className={`font-mono text-xs ${alerta ? "text-warn" : "text-ink-3"}`}>
        {nota}
      </span>
    </div>
  );
}
