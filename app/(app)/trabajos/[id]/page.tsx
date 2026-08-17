import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { arcadaDePiezas } from "@/lib/validaciones/orden";
import { horasLegibles } from "@/lib/validaciones/produccion";

import { Adjuntos, type Adjunto } from "./adjuntos";

export const metadata = { title: "Orden · MEFLAB" };

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

const fechaHora = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

const GLIFO_TAREA: Record<string, string> = {
  sin_asignar: "○",
  asignada: "◔",
  en_curso: "◑",
  completa: "■",
  anulada: "×",
};

export default async function OrdenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: orden }, { data: adjuntos }, { data: historial }, { data: pacientes }] =
    await Promise.all([
      supabase
        .from("orden_trabajo")
        .select(
          "id, codigo, prioridad, tipo_recepcion, fecha_recepcion, fecha_comprometida, fecha_entrega, indicaciones, paciente_id, cliente:cliente_id(razon_social), doctor:doctor_id(id, nombre), estado:estado_id(nombre, glifo, fase), detalle_trabajo(id, cantidad, precio_unitario, piezas_fdi, servicio:servicio_id(codigo, nombre), color:color_id(codigo)), tarea_produccion(id, orden_etapa, estado, horas_estimadas, horas_reales, proceso:proceso_id(nombre), tecnico:tecnico_id(nombre)), entrega(receptor, metodo, entregado_en, observaciones)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("archivo")
        .select("id, nombre, ruta, bytes, subido_en")
        .eq("orden_id", id)
        .order("subido_en"),
      supabase
        .from("orden_estado_historial")
        .select("id, cambiado_en, estado_despues")
        .eq("orden_id", id)
        .order("cambiado_en"),
      supabase.from("v_paciente").select("id, nombre"),
    ]);

  if (!orden) notFound();

  const nombrePaciente = new Map(
    (pacientes ?? []).map((p) => [p.id as string, p.nombre as string]),
  );

  const lineas = (orden.detalle_trabajo ?? []) as unknown as {
    id: string;
    cantidad: number;
    precio_unitario: number;
    piezas_fdi: string[];
    servicio: { codigo: string; nombre: string } | null;
    color: { codigo: string } | null;
  }[];

  const tareas = ((orden.tarea_produccion ?? []) as unknown as {
    id: string;
    orden_etapa: number;
    estado: string;
    horas_estimadas: number;
    horas_reales: number | null;
    proceso: { nombre: string } | null;
    tecnico: { nombre: string } | null;
  }[]).sort((a, b) => a.orden_etapa - b.orden_etapa);

  const estado = orden.estado as unknown as {
    nombre: string;
    glifo: string;
    fase: string;
  } | null;
  const doctor = orden.doctor as unknown as { id: string; nombre: string } | null;
  const cliente = orden.cliente as unknown as { razon_social: string } | null;
  const entrega = orden.entrega as unknown as {
    receptor: string;
    metodo: string;
    entregado_en: string;
    observaciones: string | null;
  } | null;

  const total = lineas.reduce(
    (s, l) => s + Number(l.cantidad) * Number(l.precio_unitario),
    0,
  );

  const listaAdjuntos: Adjunto[] = (adjuntos ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    ruta: a.ruta,
    bytes: a.bytes,
    subidoEn: a.subido_en,
  }));

  const vence = new Date(`${orden.fecha_comprometida}T00:00:00`);
  const abierta = estado?.fase !== "final" && estado?.fase !== "anulada";
  const atrasada = abierta && vence < new Date();

  const puedeSubir = ctx.roles.some((r) =>
    ["recepcion", "administrador", "lider_laboratorio"].includes(r),
  );

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          <Link href="/trabajos" className="hover:text-acc">
            Tablero
          </Link>
        </span>
        <div className="flex flex-wrap items-center gap-s3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {orden.codigo}
          </h1>
          <span className="rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-2">
            <span aria-hidden="true">{estado?.glifo ?? "○"}</span> {estado?.nombre}
          </span>
          {orden.prioridad === "urgente" ? (
            <span className="rounded-r1 bg-err-bg px-s2 py-[3px] font-mono text-xs font-semibold text-err">
              ▲ URGENTE
            </span>
          ) : null}
        </div>
        <p className="text-sm text-ink-2">
          {cliente?.razon_social} ·{" "}
          {doctor ? (
            <Link href={`/doctores/${doctor.id}`} className="hover:text-acc">
              {doctor.nombre}
            </Link>
          ) : (
            "—"
          )}{" "}
          · {nombrePaciente.get(orden.paciente_id) ?? "Paciente"}
        </p>
      </header>

      <div className="grid gap-s3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato etiqueta="Recibida" valor={fechaHora.format(new Date(orden.fecha_recepcion))} />
        <Dato
          etiqueta="Comprometida"
          valor={fecha.format(vence)}
          alerta={atrasada ? "sobre la fecha" : undefined}
        />
        <Dato
          etiqueta="Entregada"
          valor={orden.fecha_entrega ? fechaHora.format(new Date(orden.fecha_entrega)) : "—"}
        />
        <Dato etiqueta="Valor de venta" valor={soles.format(total)} nota="sin IGV" />
      </div>

      <section className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Trabajos
          </h2>
        </div>
        <ul className="flex flex-col">
          {lineas.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s3 last:border-0"
            >
              <div className="flex min-w-[220px] flex-1 flex-col">
                <span className="text-base">{l.servicio?.nombre ?? "—"}</span>
                <span className="font-mono text-xs text-ink-3">
                  {l.servicio?.codigo}
                  {l.color ? ` · color ${l.color.codigo}` : ""}
                </span>
              </div>

              {/* La pieza y su arcada, que es lo que evita fabricar para el
                  cuadrante equivocado (M-08). */}
              <span className="shrink-0 font-mono text-sm text-ink-2">
                {l.piezas_fdi.length === 0
                  ? "sin pieza"
                  : `${l.piezas_fdi.join(", ")} · ${arcadaDePiezas(l.piezas_fdi)}`}
              </span>

              <span className="shrink-0 font-mono text-sm tabular-nums text-ink-2">
                ×{Number(l.cantidad)}
              </span>
              <span className="w-[100px] shrink-0 text-right font-mono text-sm tabular-nums">
                {soles.format(Number(l.cantidad) * Number(l.precio_unitario))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {orden.indicaciones ? (
        <section className="flex flex-col gap-s2 rounded-r2 border border-line bg-card p-s4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Indicaciones del doctor
          </h2>
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {orden.indicaciones}
          </p>
        </section>
      ) : null}

      <Adjuntos
        ordenId={orden.id}
        adjuntos={listaAdjuntos}
        puedeSubir={puedeSubir}
        puedeBorrar={ctx.roles.includes("administrador")}
      />

      <section className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Producción
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {tareas.filter((t) => t.estado === "completa").length}/{tareas.length} etapas ·{" "}
            {historial?.length ?? 0} cambios de estado
          </span>
        </div>

        {tareas.length === 0 ? (
          <p className="px-pad-x py-s3 text-sm text-warn">
            ▲ Esta orden no tiene etapas: su servicio no tenía flujo de
            producción cuando se registró.
          </p>
        ) : (
          <ul className="flex flex-col">
            {tareas.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s2 last:border-0"
              >
                <span className="grid size-[26px] shrink-0 place-items-center rounded-r1 bg-fill font-mono text-xs tabular-nums text-ink-2">
                  {t.orden_etapa}
                </span>
                <span
                  aria-hidden="true"
                  className={`font-mono text-sm ${t.estado === "completa" ? "text-ok" : t.estado === "en_curso" ? "text-acc" : "text-ink-3"}`}
                >
                  {GLIFO_TAREA[t.estado] ?? "○"}
                </span>
                <span className="min-w-[160px] flex-1 truncate text-base">
                  {t.proceso?.nombre ?? "—"}
                </span>
                <span className="shrink-0 text-sm text-ink-2">
                  {t.tecnico?.nombre ?? <span className="text-ink-3">sin asignar</span>}
                </span>
                {/* Estimado y real, uno al lado del otro: es la única forma
                    de que la estimación mejore con el tiempo. */}
                <span className="shrink-0 font-mono text-xs tabular-nums text-ink-3">
                  est. {horasLegibles(Number(t.horas_estimadas))}
                  {t.horas_reales !== null
                    ? ` · real ${horasLegibles(Number(t.horas_reales))}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {entrega ? (
        <section className="flex flex-col gap-s2 rounded-r2 border border-ok bg-ok-bg p-s4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ok">
            <span aria-hidden="true">■</span> Entregada
          </h2>
          <p className="text-base text-ok">
            Recibió <b className="font-semibold">{entrega.receptor}</b> el{" "}
            {fechaHora.format(new Date(entrega.entregado_en))}.
          </p>
          {entrega.observaciones ? (
            <p className="text-sm leading-relaxed text-ok">{entrega.observaciones}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  nota,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  alerta?: string;
}) {
  return (
    <div className="flex flex-col gap-s1 rounded-r2 border border-line bg-card p-s3">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="font-mono text-base tabular-nums">{valor}</span>
      {alerta ? (
        <span className="font-mono text-xs text-err">
          <span aria-hidden="true">▲</span> {alerta}
        </span>
      ) : nota ? (
        <span className="font-mono text-xs text-ink-3">{nota}</span>
      ) : null}
    </div>
  );
}
