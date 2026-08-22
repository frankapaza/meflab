import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { Controles, type MaterialFila, type OrdenAbierta } from "./controles";

export const metadata = { title: "Inventario · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const fecha = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

const NIVEL = {
  critico: { glifo: "▲", etiqueta: "Crítico", clase: "text-err" },
  bajo: { glifo: "◔", etiqueta: "Bajo", clase: "text-warn" },
  normal: { glifo: "■", etiqueta: "Normal", clase: "text-ok" },
} as const;

export default async function InventarioPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: stock }, { data: alertas }, { data: movimientos }, { data: ordenes }, { data: areas }] =
    await Promise.all([
      supabase.from("v_stock").select("*").order("nombre"),
      supabase.from("v_alerta_stock").select("*").order("nivel"),
      supabase
        .from("movimiento_stock")
        .select(
          "id, tipo, cantidad, costo_unitario, motivo, created_at, material:material_id(nombre, unidad), lote:lote_id(codigo), orden:orden_id(codigo)",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      // Sólo trabajos ABIERTOS: consumir contra uno ya entregado y
      // facturado cambiaría el costo de algo cuyo margen ya se dio por
      // bueno.
      supabase
        .from("orden_trabajo")
        .select("id, codigo, estado:estado_id(fase)")
        .order("fecha_recepcion", { ascending: false })
        .limit(60),
      supabase.from("area").select("id, nombre, es_default").order("nombre"),
    ]);

  type FilaStock = {
    material_id: string;
    codigo: string;
    nombre: string;
    unidad: string;
    umbral_bajo: number;
    umbral_critico: number;
    lote_id: string | null;
    lote: string | null;
    vence_el: string | null;
    ubicacion: string | null;
    cantidad: number;
    costo_unitario: number;
  };

  const filas = (stock ?? []) as unknown as FilaStock[];

  // Se agrupa por material: el almacenero piensa en «cuánto zirconio
  // tengo», no en «cuánto tengo del lote L-2026-01».
  const porMaterial = new Map<string, MaterialFila>();
  for (const f of filas) {
    const actual = porMaterial.get(f.material_id);
    const lote = f.lote_id
      ? {
          id: f.lote_id,
          codigo: f.lote ?? "—",
          cantidad: Number(f.cantidad),
          costoUnitario: Number(f.costo_unitario),
          venceEl: f.vence_el,
          ubicacion: f.ubicacion,
        }
      : null;

    if (actual) {
      actual.cantidad += Number(f.cantidad);
      actual.valorizado += Number(f.cantidad) * Number(f.costo_unitario);
      if (lote) actual.lotes.push(lote);
    } else {
      porMaterial.set(f.material_id, {
        id: f.material_id,
        codigo: f.codigo,
        nombre: f.nombre,
        unidad: f.unidad,
        umbralBajo: Number(f.umbral_bajo),
        umbralCritico: Number(f.umbral_critico),
        cantidad: Number(f.cantidad),
        valorizado: Number(f.cantidad) * Number(f.costo_unitario),
        lotes: lote ? [lote] : [],
      });
    }
  }

  const materiales = [...porMaterial.values()];
  const valorTotal = materiales.reduce((s, m) => s + m.valorizado, 0);

  const listaAlertas = (alertas ?? []) as unknown as {
    material_id: string;
    codigo: string;
    nombre: string;
    unidad: string;
    cantidad: number;
    umbral_bajo: number;
    primer_vencimiento: string | null;
    nivel: keyof typeof NIVEL;
  }[];

  const abiertas: OrdenAbierta[] = ((ordenes ?? []) as unknown as {
    id: string;
    codigo: string;
    estado: { fase: string } | null;
  }[])
    .filter((o) => o.estado?.fase !== "final" && o.estado?.fase !== "anulada")
    .map((o) => ({ id: o.id, codigo: o.codigo }));

  const movs = (movimientos ?? []) as unknown as {
    id: string;
    tipo: string;
    cantidad: number;
    costo_unitario: number;
    motivo: string | null;
    created_at: string;
    material: { nombre: string; unidad: string } | null;
    lote: { codigo: string } | null;
    orden: { codigo: string } | null;
  }[];

  const puedeGestionar = ctx.roles.some((r) =>
    ["administrador", "lider_laboratorio"].includes(r),
  );
  const puedeConsumir = ctx.roles.some((r) =>
    ["administrador", "lider_laboratorio", "lider_area", "tecnico"].includes(r),
  );

  const areaPorDefecto =
    (areas ?? []).find((a) => a.es_default)?.id ?? (areas ?? [])[0]?.id ?? "";

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Almacén
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          Existencias
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Lo que hay se <b className="font-semibold text-ink">deriva de los
          movimientos</b>, no se guarda como saldo. Es la misma razón que en
          la cartera: dos fuentes para el mismo número acaban discrepando, y
          entonces el almacén deja de servir para decidir si hay que comprar.
        </p>
      </div>

      <div className="grid gap-s3 sm:grid-cols-3">
        <Kpi
          etiqueta="Materiales"
          valor={String(materiales.length)}
          nota={`${filas.filter((f) => f.lote_id).length} lotes`}
        />
        <Kpi etiqueta="Valorizado" valor={soles.format(valorTotal)} nota="al costo del lote" />
        <Kpi
          etiqueta="Con alerta"
          valor={String(listaAlertas.length)}
          nota={listaAlertas.length > 0 ? "▲ revisar abajo" : "■ nada por reponer"}
          alerta={listaAlertas.length > 0}
        />
      </div>

      {/* ── alertas ──────────────────────────────────────────────────── */}
      {listaAlertas.length > 0 ? (
        <section className="flex flex-col gap-s3 rounded-r2 border border-warn bg-card p-s4 shadow-e1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-warn">
            <span aria-hidden="true">▲</span> Hay que reponer o usar pronto
          </h2>
          <ul className="flex flex-col">
            {listaAlertas.map((a) => {
              const n = NIVEL[a.nivel] ?? NIVEL.normal;
              const venceEnBreve = a.primer_vencimiento !== null;
              return (
                <li
                  key={a.material_id}
                  className="flex flex-wrap items-baseline gap-s3 border-b border-line py-s2 last:border-0"
                >
                  <span className={`font-mono text-sm ${n.clase}`}>
                    <span aria-hidden="true">{n.glifo}</span> {n.etiqueta}
                  </span>
                  <span className="min-w-[180px] flex-1 truncate text-sm">
                    {a.nombre}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    {Number(a.cantidad)} {a.unidad}
                  </span>
                  <span className="font-mono text-xs text-ink-3">
                    umbral {Number(a.umbral_bajo)}
                  </span>
                  {venceEnBreve ? (
                    <span className="font-mono text-xs text-warn">
                      vence {fecha.format(new Date(`${a.primer_vencimiento}T12:00:00`))}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ── acciones ─────────────────────────────────────────────────── */}
      <Controles
        materiales={materiales}
        ordenes={abiertas}
        areaId={areaPorDefecto}
        puedeGestionar={puedeGestionar}
        puedeConsumir={puedeConsumir}
      />

      {/* ── existencias ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Existencias
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {materiales.length} {materiales.length === 1 ? "material" : "materiales"}
          </span>
        </div>

        {materiales.length === 0 ? (
          <div className="grid min-h-[200px] place-items-center p-s6">
            <div className="flex max-w-[420px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                El almacén está vacío
              </h3>
              <p className="text-base leading-relaxed text-ink-2">
                Registra los materiales que usa el laboratorio y sus entradas.
                Hasta que no haya consumo registrado, el costo real de un
                trabajo será sólo mano de obra.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Material</th>
                  <th className="px-pad-x py-s2 font-medium">Lotes</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Existencias</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Umbrales</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Valorizado</th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((m) => {
                  const nivel =
                    m.cantidad <= m.umbralCritico
                      ? "critico"
                      : m.cantidad <= m.umbralBajo
                        ? "bajo"
                        : "normal";
                  const n = NIVEL[nivel];

                  return (
                    <tr key={m.id} className="border-b border-line last:border-0">
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-medium">{m.nombre}</span>
                          <span className="font-mono text-xs text-ink-3">
                            {m.codigo} · {m.unidad}
                          </span>
                        </div>
                      </td>
                      <td className="px-pad-x py-s3">
                        {m.lotes.length === 0 ? (
                          <span className="font-mono text-xs text-ink-3">sin lotes</span>
                        ) : (
                          <ul className="flex flex-col gap-[2px]">
                            {m.lotes
                              .filter((l) => l.cantidad > 0)
                              .map((l) => (
                                <li key={l.id} className="font-mono text-xs text-ink-2">
                                  {l.codigo} · {l.cantidad} ·{" "}
                                  {l.venceEl
                                    ? `vence ${fecha.format(new Date(`${l.venceEl}T12:00:00`))}`
                                    : "sin caducidad"}
                                </li>
                              ))}
                          </ul>
                        )}
                      </td>
                      {/* El nivel lleva glifo y palabra, no sólo color: el
                          inventario se imprime para contarlo a mano. */}
                      <td className="px-pad-x py-s3 text-right">
                        <span className={`font-mono text-base font-semibold tabular-nums ${n.clase}`}>
                          <span aria-hidden="true">{n.glifo}</span> {m.cantidad}
                        </span>
                        <span className="ml-s2 font-mono text-xs text-ink-3">{m.unidad}</span>
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-xs tabular-nums text-ink-3">
                        bajo {m.umbralBajo} · crítico {m.umbralCritico}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {soles.format(m.valorizado)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── movimientos ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Últimos movimientos
          </h2>
          <span className="font-mono text-xs text-ink-3">
            de aquí salen las existencias
          </span>
        </div>

        {movs.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            Todavía no hay movimientos.
          </p>
        ) : (
          <ul className="flex flex-col px-pad-x">
            {movs.map((m) => {
              const entra = m.tipo === "entrada" || m.tipo === "devolucion";
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-baseline gap-s3 border-b border-line py-s2 last:border-0"
                >
                  <span
                    aria-hidden="true"
                    className={`font-mono text-sm ${entra ? "text-ok" : "text-warn"}`}
                  >
                    {entra ? "▲" : "▼"}
                  </span>
                  <span className="font-mono text-xs uppercase text-ink-3">{m.tipo}</span>
                  <span className="min-w-[160px] flex-1 truncate text-sm">
                    {m.material?.nombre ?? "—"}
                    {m.lote ? (
                      <span className="ml-s2 font-mono text-xs text-ink-3">
                        {m.lote.codigo}
                      </span>
                    ) : null}
                  </span>
                  {m.orden ? (
                    <span className="font-mono text-xs text-ink-3">{m.orden.codigo}</span>
                  ) : null}
                  {m.motivo ? (
                    <span className="max-w-[240px] truncate text-sm text-ink-3">
                      {m.motivo}
                    </span>
                  ) : null}
                  <span
                    className={`w-[110px] shrink-0 text-right font-mono text-sm tabular-nums ${
                      entra ? "text-ok" : "text-warn"
                    }`}
                  >
                    {entra ? "+" : "−"}
                    {Number(m.cantidad)} {m.material?.unidad ?? ""}
                  </span>
                  <span className="font-mono text-xs text-ink-3">
                    {fecha.format(new Date(m.created_at))}
                  </span>
                </li>
              );
            })}
          </ul>
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
