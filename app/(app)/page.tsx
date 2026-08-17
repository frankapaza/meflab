import Link from "next/link";
import { redirect } from "next/navigation";

import { Barras, Kpi, Linea, Medidor, SERIE, type Punto } from "@/components/graficos";
import { contextoActual } from "@/lib/auth/permisos";
import { leerSeleccion, panelesPorDefecto } from "@/lib/dominio/panel";
import { crearClienteServidor } from "@/lib/supabase/server";
import { horasLegibles } from "@/lib/validaciones/produccion";

import { SelectorPaneles } from "./selector-paneles";

export const metadata = { title: "Dashboard · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

const diaMes = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Lima",
});

/** Hoy en America/Lima, como AAAA-MM-DD. */
function hoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

type Orden = {
  id: string;
  codigo: string;
  prioridad: string;
  fecha_recepcion: string;
  fecha_comprometida: string;
  fecha_entrega: string | null;
  doctor: { nombre: string } | null;
  estado: { nombre: string; glifo: string; fase: string } | null;
  detalle_trabajo: { cantidad: number; precio_unitario: number }[];
};

type Tarea = {
  estado: string;
  tecnico_id: string | null;
  horas_estimadas: number;
  terminada_en: string | null;
};

export default async function Inicio() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: ordenes }, { data: tareas }, { data: usuarios }, { data: yo }] =
    await Promise.all([
    supabase
      .from("orden_trabajo")
      .select(
        "id, codigo, prioridad, fecha_recepcion, fecha_comprometida, fecha_entrega, doctor:doctor_id(nombre), estado:estado_id(nombre, glifo, fase), detalle_trabajo(cantidad, precio_unitario)",
      )
      .order("fecha_recepcion", { ascending: false }),
    supabase
      .from("tarea_produccion")
      .select("estado, tecnico_id, horas_estimadas, terminada_en"),
    supabase.from("usuario").select("id, nombre").eq("activo", true),
    supabase.from("usuario").select("paneles").eq("id", ctx.usuarioId).maybeSingle(),
  ]);

  // null significa "nunca lo he tocado" y manda lo de sus roles; una lista
  // vacía es una decisión distinta —"no quiero ver ninguno"— y se respeta.
  const personalizado = yo?.paneles !== null && yo?.paneles !== undefined;
  const paneles = new Set(
    personalizado ? leerSeleccion(yo!.paneles, ctx.roles) : panelesPorDefecto(ctx.roles),
  );

  const lista = (ordenes ?? []) as unknown as Orden[];
  const listaTareas = (tareas ?? []) as unknown as Tarea[];
  const nombreUsuario = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));

  const hoy = hoyLima();
  const importe = (o: Orden) =>
    (o.detalle_trabajo ?? []).reduce(
      (s, d) => s + Number(d.cantidad) * Number(d.precio_unitario),
      0,
    );

  const abierta = (o: Orden) =>
    o.estado?.fase !== "final" && o.estado?.fase !== "anulada";

  /* ── del día ─────────────────────────────────────────────────────── */
  const recibidasHoy = lista.filter((o) => o.fecha_recepcion.slice(0, 10) === hoy);
  const entregadasHoy = lista.filter((o) => o.fecha_entrega?.slice(0, 10) === hoy);
  const etapasHoy = listaTareas.filter(
    (t) => t.terminada_en?.slice(0, 10) === hoy,
  ).length;

  const enCurso = lista.filter(abierta);
  const atrasadas = enCurso.filter(
    (o) => new Date(`${o.fecha_comprometida}T00:00:00`) < new Date(`${hoy}T00:00:00`),
  );
  const urgentes = enCurso.filter((o) => o.prioridad === "urgente").length;

  /* ── del mes ─────────────────────────────────────────────────────── */
  const mes = hoy.slice(0, 7);
  const mesAnterior = (() => {
    const [a, m] = mes.split("-").map(Number);
    return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  })();

  const delMes = lista.filter((o) => o.fecha_recepcion.slice(0, 7) === mes);
  const delMesAnterior = lista.filter(
    (o) => o.fecha_recepcion.slice(0, 7) === mesAnterior,
  );

  const valorMes = delMes.reduce((s, o) => s + importe(o), 0);
  const valorMesAnterior = delMesAnterior.reduce((s, o) => s + importe(o), 0);

  const variacion = (ahora: number, antes: number) =>
    antes === 0 ? null : ((ahora - antes) / antes) * 100;

  /* ── embudo de producción ────────────────────────────────────────── */
  const porEstado = new Map<string, { glifo: string; n: number }>();
  for (const o of enCurso) {
    const clave = o.estado?.nombre ?? "Sin estado";
    const actual = porEstado.get(clave) ?? { glifo: o.estado?.glifo ?? "○", n: 0 };
    porEstado.set(clave, { ...actual, n: actual.n + 1 });
  }
  const embudo = [...porEstado.entries()].map(([etiqueta, v]) => ({
    etiqueta,
    valor: v.n,
    glifo: v.glifo,
  }));

  /* ── carga por técnico ───────────────────────────────────────────── */
  const carga = new Map<string, number>();
  for (const t of listaTareas) {
    if (!t.tecnico_id || t.estado === "completa" || t.estado === "anulada") continue;
    carga.set(t.tecnico_id, (carga.get(t.tecnico_id) ?? 0) + Number(t.horas_estimadas));
  }
  const porTecnico = [...carga.entries()]
    .map(([id, horas]) => ({ etiqueta: nombreUsuario.get(id) ?? "—", valor: horas }))
    .sort((a, b) => b.valor - a.valor);

  // Capacidad: 8 h por técnico y día laborable. Es una META TECHO — estar
  // por debajo es bueno, y pasarla significa que algo va a llegar tarde.
  const HORAS_JORNADA = 8;
  const capacidad = Math.max(1, porTecnico.length) * HORAS_JORNADA;
  const horasComprometidas = [...carga.values()].reduce((a, b) => a + b, 0);
  const utilizacion = Math.round((horasComprometidas / capacidad) * 100);

  /* ── órdenes por día, últimos 14 ─────────────────────────────────── */
  const serie: Punto[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${hoy}T12:00:00`);
    d.setDate(d.getDate() - (13 - i));
    const clave = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d);
    return {
      etiqueta: diaMes.format(d),
      valor: lista.filter((o) => o.fecha_recepcion.slice(0, 10) === clave).length,
    };
  });

  /* ── top doctores del mes ────────────────────────────────────────── */
  const porDoctor = new Map<string, number>();
  for (const o of delMes) {
    const clave = o.doctor?.nombre ?? "—";
    porDoctor.set(clave, (porDoctor.get(clave) ?? 0) + importe(o));
  }
  const topDoctores = [...porDoctor.entries()]
    .map(([etiqueta, valor]) => ({ etiqueta, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  /* ── puntualidad del mes ─────────────────────────────────────────── */
  const entregadasMes = lista.filter((o) => o.fecha_entrega?.slice(0, 7) === mes);
  const aTiempo = entregadasMes.filter(
    (o) => o.fecha_entrega! <= `${o.fecha_comprometida}T23:59:59`,
  ).length;
  const puntualidad =
    entregadasMes.length > 0 ? Math.round((aTiempo / entregadasMes.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Inicio
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-s3">
          <span className="font-mono text-xs text-ink-3">
            Hoy {diaMes.format(new Date(`${hoy}T12:00:00`))} · {ctx.roles.length}{" "}
            {ctx.roles.length === 1 ? "rol" : "roles"}
          </span>
          <SelectorPaneles elegidos={[...paneles]} personalizado={personalizado} />
        </div>
      </header>

      {atrasadas.length > 0 ? (
        <Link
          href="/trabajos"
          className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err hover:brightness-110"
        >
          <span aria-hidden="true">▲</span>{" "}
          <b className="font-semibold">
            {atrasadas.length}{" "}
            {atrasadas.length === 1 ? "orden atrasada" : "órdenes atrasadas"}
          </b>{" "}
          ({atrasadas
            .slice(0, 4)
            .map((o) => o.codigo)
            .join(", ")}
          {atrasadas.length > 4 ? "…" : ""}). Ver el tablero.
        </Link>
      ) : null}

      {/* ── el día ─────────────────────────────────────────────────── */}
      {paneles.has("dia") ? (
      <section className="flex flex-col gap-s3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-3">Hoy</h2>
        <div className="grid gap-s3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi etiqueta="Órdenes recibidas" valor={String(recibidasHoy.length)} />
          <Kpi etiqueta="Entregas" valor={String(entregadasHoy.length)} />
          <Kpi etiqueta="Etapas terminadas" valor={String(etapasHoy)} />
          <Kpi
            etiqueta="Urgentes en curso"
            valor={String(urgentes)}
            bueno="down"
            nota={urgentes === 0 ? "ninguna" : "requieren seguimiento"}
          />
        </div>
      </section>
      ) : null}

      {/* ── el mes ─────────────────────────────────────────────────── */}
      {paneles.has("mes") ? (
      <section className="flex flex-col gap-s3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-3">
          Este mes
        </h2>
        <div className="grid gap-s3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            etiqueta="Órdenes recibidas"
            valor={String(delMes.length)}
            variacion={variacion(delMes.length, delMesAnterior.length)}
            nota="vs. mes anterior"
          />
          <Kpi
            etiqueta="Valor de venta"
            valor={soles.format(valorMes)}
            variacion={variacion(valorMes, valorMesAnterior)}
            nota="sin IGV · no es deuda"
          />
          <Kpi etiqueta="Trabajos en curso" valor={String(enCurso.length)} bueno="down" />
          <Kpi
            etiqueta="Atrasados"
            valor={String(atrasadas.length)}
            bueno="down"
            nota={atrasadas.length === 0 ? "ninguno" : "sobre la fecha comprometida"}
          />
        </div>
      </section>
      ) : null}

      {/* ── gráficos ───────────────────────────────────────────────── */}
      <div className="grid gap-s3 lg:grid-cols-2">
        {paneles.has("serie") ? (
        <Linea
          titulo="Órdenes recibidas"
          descripcion="Últimos 14 días. Sirve para ver si la entrada es estable o a golpes."
          datos={serie}
          color={SERIE[0]}
        />
        ) : null}

        {paneles.has("embudo") ? (
        <Barras
          titulo="Embudo de producción"
          descripcion="Dónde están ahora mismo los trabajos abiertos. Una acumulación en un estado es un cuello de botella."
          datos={embudo}
          color={SERIE[2]}
        />
        ) : null}

        {paneles.has("carga") ? (
        <Barras
          titulo="Carga por técnico"
          descripcion="Horas estimadas de lo que cada uno tiene sin terminar."
          datos={porTecnico}
          formato={horasLegibles}
          color={SERIE[0]}
        />
        ) : null}

        {paneles.has("doctores") ? (
        <Barras
          titulo="Doctores del mes"
          descripcion="Por valor de venta de los trabajos que pidieron. No es lo que deben."
          datos={topDoctores}
          formato={(n) => soles.format(n)}
          color={SERIE[1]}
        />
        ) : null}

        {/* Dos medidores con metas de signo opuesto, a propósito: uno es un
            suelo y el otro un techo. No todo indicador mejora subiendo. */}
        {paneles.has("puntualidad") ? (
        <Medidor
          titulo="Entregas a tiempo"
          descripcion="De lo entregado este mes, cuánto llegó dentro de la fecha comprometida."
          valor={puntualidad}
          meta={90}
          tipoMeta="suelo"
        />
        ) : null}

        {paneles.has("capacidad") ? (
        <Medidor
          titulo="Capacidad utilizada"
          descripcion={`${horasLegibles(horasComprometidas)} comprometidas sobre ${horasLegibles(capacidad)} de una jornada.`}
          valor={utilizacion}
          meta={85}
          tipoMeta="techo"
        />
        ) : null}
      </div>

      {paneles.size === 0 ? (
        <div className="grid min-h-[220px] place-items-center rounded-r2 border border-dashed border-line-2 p-s6">
          <p className="max-w-[400px] text-center text-base leading-relaxed text-ink-2">
            Has dejado el dashboard sin gráficos. Pulsa «Elegir gráficos» para
            añadir los que quieras ver.
          </p>
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-ink-3">
        Ninguna cifra de aquí es deuda. Lo que se ve es valor de venta de los
        trabajos; la deuda nace del comprobante y se leerá de una sola fuente
        en la Fase 2 — que es justamente lo que este proyecto existe para
        cerrar.
      </p>
    </div>
  );
}
