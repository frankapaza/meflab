import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata = { title: "Tablero · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const fechaCorta = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

type Fila = {
  id: string;
  codigo: string;
  prioridad: string;
  fecha_comprometida: string;
  cliente: { razon_social: string } | null;
  doctor: { nombre: string } | null;
  estado: { nombre: string; glifo: string; fase: string } | null;
  detalle_trabajo: { cantidad: number; precio_unitario: number }[];
  tarea_produccion: { estado: string }[];
};

/**
 * Semáforo de fechas.
 *
 * La FLECHA sigue la dirección real del dato y el color dice si eso es
 * bueno; aquí lo que hay es un glifo por nivel, porque ningún estado se
 * transmite sólo por color: el tablero se lee impreso en gris.
 */
function semaforo(fechaComprometida: string, terminada: boolean) {
  if (terminada) return { glifo: "■", clase: "text-ok", texto: "listo" };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${fechaComprometida}T00:00:00`);
  const dias = Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);

  if (dias < 0) return { glifo: "▲", clase: "text-err", texto: `${Math.abs(dias)} d de retraso` };
  if (dias === 0) return { glifo: "◆", clase: "text-warn", texto: "vence hoy" };
  if (dias <= 2) return { glifo: "◆", clase: "text-warn", texto: `en ${dias} d` };
  return { glifo: "●", clase: "text-ink-2", texto: `en ${dias} d` };
}

export default async function TrabajosPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("orden_trabajo")
    .select(
      "id, codigo, prioridad, fecha_comprometida, cliente:cliente_id(razon_social), doctor:doctor_id(nombre), estado:estado_id(nombre, glifo, fase), detalle_trabajo(cantidad, precio_unitario), tarea_produccion(estado)",
    )
    .order("fecha_comprometida");

  const filas = (data ?? []) as unknown as Fila[];
  const puedeRegistrar = ctx.roles.some((r) => ["recepcion", "administrador"].includes(r));

  const atrasadas = filas.filter((o) => {
    const terminada = o.estado?.fase === "final" || o.estado?.fase === "anulada";
    return !terminada && new Date(`${o.fecha_comprometida}T00:00:00`) < new Date();
  }).length;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Producción
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Tablero de trabajos</h1>
        </div>

        {puedeRegistrar ? (
          <Link
            href="/trabajos/nueva"
            className="grid h-tap place-items-center rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110"
          >
            Nueva orden
          </Link>
        ) : null}
      </header>

      {atrasadas > 0 ? (
        <p className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
          <span aria-hidden="true">▲</span>{" "}
          <b className="font-semibold">
            {atrasadas} {atrasadas === 1 ? "orden atrasada" : "órdenes atrasadas"}
          </b>{" "}
          respecto a la fecha comprometida.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Órdenes
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {filas.length} {filas.length === 1 ? "orden" : "órdenes"}
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="grid min-h-[280px] place-items-center p-s6">
            <div className="flex max-w-[440px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                Aún no hay órdenes
              </h3>
              <p className="text-base leading-relaxed text-ink-2">
                La orden es el centro del sistema: de ella cuelgan la
                producción, la entrega y la factura.
              </p>
              {puedeRegistrar ? (
                <Link
                  href="/trabajos/nueva"
                  className="mt-s1 grid h-tap place-items-center rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on"
                >
                  Registrar la primera
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Orden</th>
                  <th className="px-pad-x py-s2 font-medium">Cliente · doctor</th>
                  <th className="px-pad-x py-s2 font-medium">Estado</th>
                  <th className="px-pad-x py-s2 font-medium">Producción</th>
                  <th className="px-pad-x py-s2 font-medium">Compromiso</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((o) => {
                  const terminada =
                    o.estado?.fase === "final" || o.estado?.fase === "anulada";
                  const sem = semaforo(o.fecha_comprometida, terminada);

                  const tareas = o.tarea_produccion ?? [];
                  const completas = tareas.filter((t) => t.estado === "completa").length;

                  const importe = (o.detalle_trabajo ?? []).reduce(
                    (s, d) => s + Number(d.cantidad) * Number(d.precio_unitario),
                    0,
                  );

                  return (
                    <tr key={o.id} className="border-b border-line last:border-0">
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="font-mono text-sm">{o.codigo}</span>
                          {o.prioridad === "urgente" ? (
                            <span className="font-mono text-xs font-semibold uppercase text-err">
                              ▲ urgente
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-base">
                            {o.cliente?.razon_social ?? "—"}
                          </span>
                          <span className="truncate font-mono text-xs text-ink-3">
                            {o.doctor?.nombre ?? "—"}
                          </span>
                        </div>
                      </td>

                      {/* El glifo sostiene el significado; el color sólo
                          refuerza. Así se lee impreso en gris. */}
                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        <span aria-hidden="true" className="mr-s1 font-mono">
                          {o.estado?.glifo ?? "○"}
                        </span>
                        {o.estado?.nombre ?? "—"}
                      </td>

                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {tareas.length === 0 ? (
                          <span className="text-warn">▲ sin tareas</span>
                        ) : (
                          `${completas}/${tareas.length} etapas`
                        )}
                      </td>

                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="font-mono text-sm tabular-nums">
                            {fechaCorta.format(
                              new Date(`${o.fecha_comprometida}T12:00:00`),
                            )}
                          </span>
                          <span className={`font-mono text-xs ${sem.clase}`}>
                            <span aria-hidden="true">{sem.glifo}</span> {sem.texto}
                          </span>
                        </div>
                      </td>

                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {soles.format(importe)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* D-02: aquí NO hay columna de saldo. El importe es lo que vale el
          trabajo; la deuda nace del documento de venta y se lee de
          v_cartera, en la Fase 2. */}
      <p className="text-sm text-ink-3">
        El importe es el valor de venta sin IGV de los trabajos. No es deuda:
        la deuda nace del comprobante, y llega en la Fase 2.
      </p>
    </div>
  );
}
