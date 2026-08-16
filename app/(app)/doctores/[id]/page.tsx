import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata = { title: "Ficha del doctor · MEFLAB" };

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

type Orden = {
  id: string;
  codigo: string;
  fecha_recepcion: string;
  fecha_comprometida: string;
  fecha_entrega: string | null;
  prioridad: string;
  paciente_id: string;
  estado: { nombre: string; glifo: string; fase: string } | null;
  detalle_trabajo: { cantidad: number; precio_unitario: number }[];
};

export default async function FichaDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: doctor }, { data: ordenes }, { data: pacientes }] = await Promise.all([
    supabase
      .from("doctor")
      .select(
        "id, nombre, colegiatura, especialidad, email, telefono, sede_entrega, activo, cliente:cliente_id(id, razon_social, tipo, dias_credito, bloqueado)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("orden_trabajo")
      .select(
        "id, codigo, fecha_recepcion, fecha_comprometida, fecha_entrega, prioridad, paciente_id, estado:estado_id(nombre, glifo, fase), detalle_trabajo(cantidad, precio_unitario)",
      )
      .eq("doctor_id", id)
      .order("fecha_recepcion", { ascending: false }),
    supabase.from("v_paciente").select("id, nombre"),
  ]);

  if (!doctor) notFound();

  const cliente = doctor.cliente as unknown as {
    id: string;
    razon_social: string;
    tipo: string;
    dias_credito: number;
    bloqueado: boolean;
  } | null;

  const lista = (ordenes ?? []) as unknown as Orden[];
  const nombrePaciente = new Map(
    (pacientes ?? []).map((p) => [p.id as string, p.nombre as string]),
  );

  const importeDe = (o: Orden) =>
    (o.detalle_trabajo ?? []).reduce(
      (s, d) => s + Number(d.cantidad) * Number(d.precio_unitario),
      0,
    );

  const enCurso = lista.filter(
    (o) => o.estado?.fase !== "final" && o.estado?.fase !== "anulada",
  );
  const entregadas = lista.filter((o) => o.estado?.fase === "final");

  const atrasadas = enCurso.filter(
    (o) => new Date(`${o.fecha_comprometida}T00:00:00`) < new Date(),
  ).length;

  const facturadoHistorico = lista.reduce((s, o) => s + importeDe(o), 0);

  // Puntualidad: de lo ya entregado, cuánto llegó dentro de la fecha
  // comprometida. Es el número que el doctor nota, aunque no lo pida.
  const aTiempo = entregadas.filter(
    (o) =>
      o.fecha_entrega &&
      new Date(o.fecha_entrega) <=
        new Date(`${o.fecha_comprometida}T23:59:59`),
  ).length;
  const puntualidad =
    entregadas.length > 0 ? Math.round((aTiempo / entregadas.length) * 100) : null;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          <Link href="/doctores" className="hover:text-acc">
            Doctores
          </Link>
        </span>
        <div className="flex flex-wrap items-center gap-s3">
          <h1 className="text-2xl font-semibold tracking-tight">{doctor.nombre}</h1>
          {!doctor.activo ? (
            <span className="rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-3">
              INACTIVO
            </span>
          ) : null}
          {cliente?.bloqueado ? (
            <span className="rounded-r1 bg-err-bg px-s2 py-[3px] font-mono text-xs font-semibold text-err">
              SU CLIENTE ESTÁ BLOQUEADO
            </span>
          ) : null}
        </div>
        <p className="text-sm text-ink-2">
          {[
            doctor.especialidad,
            doctor.colegiatura,
            cliente?.razon_social,
            doctor.sede_entrega,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <div className="grid gap-s3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          etiqueta="Trabajos en curso"
          valor={String(enCurso.length)}
          nota={atrasadas > 0 ? `${atrasadas} atrasados` : "ninguno atrasado"}
          alerta={atrasadas > 0}
        />
        <Kpi
          etiqueta="Trabajos entregados"
          valor={String(entregadas.length)}
          nota={`${lista.length} en total`}
        />
        {/* La meta de puntualidad es un SUELO: por encima es bueno. No todo
            indicador mejora subiendo, pero éste sí. */}
        <Kpi
          etiqueta="Entregas a tiempo"
          valor={puntualidad === null ? "—" : `${puntualidad} %`}
          nota={
            puntualidad === null
              ? "sin entregas todavía"
              : `${aTiempo} de ${entregadas.length}`
          }
          alerta={puntualidad !== null && puntualidad < 90}
        />
        <Kpi
          etiqueta="Valor de venta histórico"
          valor={soles.format(facturadoHistorico)}
          nota="sin IGV · no es deuda"
        />
      </div>

      <div className="flex flex-wrap gap-s3">
        <Dato etiqueta="Teléfono" valor={doctor.telefono ?? "—"} />
        <Dato etiqueta="Correo" valor={doctor.email ?? "—"} />
        <Dato
          etiqueta="Condiciones del cliente"
          valor={
            cliente
              ? cliente.dias_credito > 0
                ? `Crédito ${cliente.dias_credito} días`
                : "Contado"
              : "—"
          }
        />
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Historial de trabajos
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {lista.length} {lista.length === 1 ? "orden" : "órdenes"}
          </span>
        </div>

        {lista.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            Este doctor no ha pedido ningún trabajo todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Orden</th>
                  <th className="px-pad-x py-s2 font-medium">Paciente</th>
                  <th className="px-pad-x py-s2 font-medium">Estado</th>
                  <th className="px-pad-x py-s2 font-medium">Comprometida</th>
                  <th className="px-pad-x py-s2 font-medium">Entregada</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => {
                  const comprometida = new Date(`${o.fecha_comprometida}T00:00:00`);
                  const entregada = o.fecha_entrega ? new Date(o.fecha_entrega) : null;
                  const tarde = entregada
                    ? entregada > new Date(`${o.fecha_comprometida}T23:59:59`)
                    : comprometida < new Date() && o.estado?.fase !== "final";

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
                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        {nombrePaciente.get(o.paciente_id) ?? "—"}
                      </td>
                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        <span aria-hidden="true" className="mr-s1 font-mono">
                          {o.estado?.glifo ?? "○"}
                        </span>
                        {o.estado?.nombre ?? "—"}
                      </td>
                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {fecha.format(comprometida)}
                      </td>
                      <td
                        className={`px-pad-x py-s3 font-mono text-sm tabular-nums ${tarde ? "text-err" : "text-ink-2"}`}
                      >
                        {entregada ? (
                          <>
                            <span aria-hidden="true">{tarde ? "▲" : "■"}</span>{" "}
                            {fecha.format(entregada)}
                          </>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {soles.format(importeDe(o))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* D-02: aquí NO hay deuda. La deuda es del CLIENTE, no del doctor, y
          se lee de v_cartera cuando exista (Fase 2). */}
      <p className="text-sm text-ink-3">
        Lo que se ve aquí es valor de venta de los trabajos, no deuda. La
        deuda es del cliente —{cliente?.razon_social ?? "su cliente"}— y llega
        en la Fase 2, leída de una sola fuente.
      </p>
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
    <div className="flex flex-col gap-s1 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</span>
      <span className={`font-mono text-xs ${alerta ? "text-warn" : "text-ink-3"}`}>
        {alerta ? "▲ " : ""}
        {nota}
      </span>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex min-w-[180px] flex-col gap-s1 rounded-r1 border border-line bg-card px-s3 py-s2">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="text-base">{valor}</span>
    </div>
  );
}
