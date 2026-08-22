import { redirect } from "next/navigation";

import { Barras } from "@/components/graficos";
import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata = { title: "Reportes · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const solesCorto = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

/**
 * Rentabilidad por trabajo, doctor y servicio.
 *
 * Todo sale de `v_rentabilidad_orden`, que suma las cuatro patas del
 * costo: materiales, mano de obra, procesos externos y retrabajo. Un
 * margen calculado sin alguna de las cuatro sale alto y tranquiliza —
 * que es peor que no calcularlo.
 */
export default async function ReportesPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: rentabilidad }, { data: ordenes }] = await Promise.all([
    supabase.from("v_rentabilidad_orden").select("*"),
    supabase
      .from("orden_trabajo")
      .select(
        "id, codigo, fecha_recepcion, doctor:doctor_id(nombre), cliente:cliente_id(razon_social), detalle_trabajo(servicio:servicio_id(nombre))",
      ),
  ]);

  type Fila = {
    orden_id: string;
    codigo: string;
    valor_venta: number;
    costo_materiales: number;
    costo_mano_obra: number;
    costo_externo: number;
    costo_retrabajo: number;
    costo_total: number;
    margen: number;
    margen_pct: number | null;
  };

  const filas = ((rentabilidad ?? []) as unknown as Fila[]).filter(
    (f) => Number(f.valor_venta) > 0,
  );

  const meta = new Map(
    ((ordenes ?? []) as unknown as {
      id: string;
      fecha_recepcion: string;
      doctor: { nombre: string } | null;
      cliente: { razon_social: string } | null;
      detalle_trabajo: { servicio: { nombre: string } | null }[];
    }[]).map((o) => [
      o.id,
      {
        doctor: o.doctor?.nombre ?? "—",
        cliente: o.cliente?.razon_social ?? "—",
        servicio: o.detalle_trabajo[0]?.servicio?.nombre ?? "—",
        fecha: o.fecha_recepcion,
      },
    ]),
  );

  const venta = filas.reduce((s, f) => s + Number(f.valor_venta), 0);
  const costo = filas.reduce((s, f) => s + Number(f.costo_total), 0);
  const margen = venta - costo;
  const margenPct = venta > 0 ? Math.round((margen / venta) * 1000) / 10 : 0;

  // Composición del costo: es lo que dice dónde se va el dinero. Sin
  // desglosarlo, «cuesta mucho» no lleva a ninguna decisión.
  const composicion = [
    { etiqueta: "Materiales", valor: filas.reduce((s, f) => s + Number(f.costo_materiales), 0) },
    { etiqueta: "Mano de obra", valor: filas.reduce((s, f) => s + Number(f.costo_mano_obra), 0) },
    { etiqueta: "Procesos externos", valor: filas.reduce((s, f) => s + Number(f.costo_externo), 0) },
    { etiqueta: "Retrabajo", valor: filas.reduce((s, f) => s + Number(f.costo_retrabajo), 0) },
  ].filter((c) => c.valor > 0);

  const agrupar = (clave: "doctor" | "servicio" | "cliente") => {
    const m = new Map<string, { venta: number; costo: number }>();
    for (const f of filas) {
      const k = meta.get(f.orden_id)?.[clave] ?? "—";
      const a = m.get(k) ?? { venta: 0, costo: 0 };
      a.venta += Number(f.valor_venta);
      a.costo += Number(f.costo_total);
      m.set(k, a);
    }
    return [...m.entries()]
      .map(([etiqueta, v]) => ({
        etiqueta,
        venta: v.venta,
        costo: v.costo,
        margen: v.venta - v.costo,
        pct: v.venta > 0 ? Math.round(((v.venta - v.costo) / v.venta) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.margen - a.margen);
  };

  const porDoctor = agrupar("doctor");
  const porServicio = agrupar("servicio");

  // Los peores márgenes primero: es lo accionable. Un listado por importe
  // enseña los trabajos grandes, no los que pierden dinero.
  const peores = [...filas]
    .filter((f) => f.margen_pct !== null)
    .sort((a, b) => Number(a.margen_pct) - Number(b.margen_pct))
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Análisis
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Rentabilidad</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          Costo real
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          El margen suma las <b className="font-semibold text-ink">cuatro
          patas</b> del costo: materiales consumidos, mano de obra por
          etapa, procesos externos y retrabajo. Falta cualquiera y el
          margen sale alto y tranquiliza, que es peor que no calcularlo.
          Los trabajos sin consumo registrado sólo llevan mano de obra.
        </p>
      </div>

      <div className="grid gap-s3 sm:grid-cols-4">
        <Kpi etiqueta="Valor de venta" valor={soles.format(venta)} nota="sin IGV" />
        <Kpi etiqueta="Costo real" valor={soles.format(costo)} nota={`${filas.length} trabajos`} />
        <Kpi etiqueta="Margen" valor={soles.format(margen)} nota="venta − costo" destacado />
        <Kpi
          etiqueta="Margen medio"
          valor={`${margenPct} %`}
          nota={margenPct < 30 ? "▲ por debajo de lo sano" : "■ dentro de lo esperado"}
          alerta={margenPct < 30}
        />
      </div>

      {filas.length === 0 ? (
        <div className="grid min-h-[240px] place-items-center rounded-r2 border border-dashed border-line-2 p-s6">
          <div className="flex max-w-[440px] flex-col items-center gap-s3 text-center">
            <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
              ○
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Todavía no hay nada que medir</h3>
            <p className="text-base leading-relaxed text-ink-2">
              La rentabilidad aparece cuando hay trabajos con precio y con
              consumo registrado. Registra material en Inventario y consúmelo
              contra un trabajo.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-s3 lg:grid-cols-2">
            <Barras
              titulo="Dónde se va el dinero"
              descripcion="Composición del costo real de todo lo producido."
              datos={composicion}
              formato={(n) => solesCorto.format(n)}
            />
            <Barras
              titulo="Margen por servicio"
              descripcion="Qué tipo de trabajo deja más. Es la base para revisar la tarifa."
              datos={porServicio.slice(0, 6).map((s) => ({
                etiqueta: s.etiqueta,
                valor: s.margen,
              }))}
              formato={(n) => solesCorto.format(n)}
            />
          </div>

          <Tabla
            titulo="Margen por doctor"
            nota="quién deja más, no quién pide más"
            filas={porDoctor}
          />

          <Tabla
            titulo="Margen por servicio"
            nota="para revisar la tarifa"
            filas={porServicio}
          />

          {/* Lo accionable: los peores márgenes, no los importes mayores. */}
          <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
            <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
                Trabajos con peor margen
              </h2>
              <span className="font-mono text-xs text-ink-3">de menor a mayor</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                    <th className="px-pad-x py-s2 font-medium">Trabajo</th>
                    <th className="px-pad-x py-s2 font-medium">Doctor</th>
                    <th className="px-pad-x py-s2 text-right font-medium">Venta</th>
                    <th className="px-pad-x py-s2 text-right font-medium">Material</th>
                    <th className="px-pad-x py-s2 text-right font-medium">Mano de obra</th>
                    <th className="px-pad-x py-s2 text-right font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {peores.map((f) => {
                    const m = meta.get(f.orden_id);
                    const pct = Number(f.margen_pct);
                    return (
                      <tr key={f.orden_id} className="border-b border-line last:border-0">
                        <td className="px-pad-x py-s3">
                          <div className="flex min-w-0 flex-col">
                            <span className="font-mono text-sm">{f.codigo}</span>
                            <span className="truncate font-mono text-xs text-ink-3">
                              {m?.servicio ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-pad-x py-s3 text-sm text-ink-2">{m?.doctor ?? "—"}</td>
                        <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                          {soles.format(Number(f.valor_venta))}
                        </td>
                        <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                          {soles.format(Number(f.costo_materiales))}
                        </td>
                        <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                          {soles.format(Number(f.costo_mano_obra))}
                        </td>
                        {/* El glifo lleva el signo: un margen negativo
                            impreso en gris tiene que seguir leyéndose. */}
                        <td
                          className={`px-pad-x py-s3 text-right font-mono text-sm font-semibold tabular-nums ${
                            pct < 0 ? "text-err" : pct < 25 ? "text-warn" : "text-ok"
                          }`}
                        >
                          <span aria-hidden="true">
                            {pct < 0 ? "▼" : pct < 25 ? "◔" : "■"}
                          </span>{" "}
                          {soles.format(Number(f.margen))} · {pct} %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tabla({
  titulo,
  nota,
  filas,
}: {
  titulo: string;
  nota: string;
  filas: { etiqueta: string; venta: number; costo: number; margen: number; pct: number }[];
}) {
  return (
    <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
      <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">{titulo}</h2>
        <span className="font-mono text-xs text-ink-3">{nota}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
              <th className="px-pad-x py-s2 font-medium">Concepto</th>
              <th className="px-pad-x py-s2 text-right font-medium">Venta</th>
              <th className="px-pad-x py-s2 text-right font-medium">Costo</th>
              <th className="px-pad-x py-s2 text-right font-medium">Margen</th>
              <th className="px-pad-x py-s2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.etiqueta} className="border-b border-line last:border-0">
                <td className="px-pad-x py-s3 text-sm">{f.etiqueta}</td>
                <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                  {soles.format(f.venta)}
                </td>
                <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                  {soles.format(f.costo)}
                </td>
                <td className="px-pad-x py-s3 text-right font-mono text-sm font-semibold tabular-nums">
                  {soles.format(f.margen)}
                </td>
                <td
                  className={`px-pad-x py-s3 text-right font-mono text-sm tabular-nums ${
                    f.pct < 0 ? "text-err" : f.pct < 25 ? "text-warn" : "text-ok"
                  }`}
                >
                  {f.pct} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  nota,
  destacado,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  destacado?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-s1 rounded-r2 border bg-card p-s4 shadow-e1 ${
        alerta ? "border-warn" : destacado ? "border-acc" : "border-line"
      }`}
    >
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">{etiqueta}</span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</span>
      <span className={`font-mono text-xs ${alerta ? "text-warn" : "text-ink-3"}`}>{nota}</span>
    </div>
  );
}
