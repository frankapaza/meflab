import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { Tablero, type Columna, type Opcion, type Tarjeta } from "./tablero";

export const metadata = { title: "Tablero · MEFLAB" };

type Fila = {
  id: string;
  codigo: string;
  prioridad: string;
  fecha_comprometida: string;
  estado_id: string;
  cliente: { razon_social: string } | null;
  doctor: { id: string; nombre: string } | null;
  estado: { fase: string } | null;
  detalle_trabajo: { cantidad: number; precio_unitario: number }[];
  tarea_produccion: { estado: string; tecnico_id: string | null }[];
};

export default async function TrabajosPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: ordenes }, { data: estados }, { data: usuarios }] = await Promise.all([
    supabase
      .from("orden_trabajo")
      .select(
        "id, codigo, prioridad, fecha_comprometida, estado_id, cliente:cliente_id(razon_social), doctor:doctor_id(id, nombre), estado:estado_id(fase), detalle_trabajo(cantidad, precio_unitario), tarea_produccion(estado, tecnico_id)",
      )
      .order("fecha_comprometida"),
    supabase
      .from("estado_trabajo")
      .select("id, nombre, glifo, fase")
      .eq("activo", true)
      .order("orden"),
    supabase
      .from("usuario")
      .select("id, nombre, usuario_rol(rol)")
      .eq("activo", true)
      .order("nombre"),
  ]);

  const filas = (ordenes ?? []) as unknown as Fila[];

  const tarjetas: Tarjeta[] = filas.map((o) => {
    const tareas = o.tarea_produccion ?? [];
    return {
      id: o.id,
      codigo: o.codigo,
      prioridad: o.prioridad,
      fechaComprometida: o.fecha_comprometida,
      estadoId: o.estado_id,
      cliente: o.cliente?.razon_social ?? "—",
      doctorId: o.doctor?.id ?? "",
      doctor: o.doctor?.nombre ?? "—",
      tecnicos: [...new Set(tareas.map((t) => t.tecnico_id).filter(Boolean))] as string[],
      etapas: tareas.length,
      completas: tareas.filter((t) => t.estado === "completa").length,
      importe: (o.detalle_trabajo ?? []).reduce(
        (s, d) => s + Number(d.cantidad) * Number(d.precio_unitario),
        0,
      ),
      terminada: o.estado?.fase === "final" || o.estado?.fase === "anulada",
    };
  });

  // Las columnas son los estados que el laboratorio haya configurado, en
  // su orden. Se ocultan las anuladas: una columna de trabajos muertos
  // ensancha el tablero sin decir nada (M-01).
  const columnas: Columna[] = (estados ?? [])
    .filter((e) => e.fase !== "anulada")
    .map((e) => ({
      id: e.id,
      nombre: e.nombre,
      glifo: e.glifo ?? "○",
      fase: e.fase,
    }));

  // Sólo se ofrecen como filtro los doctores que tienen algo en el
  // tablero: una lista con todos obliga a buscar entre nombres que no van
  // a devolver nada.
  const doctores: Opcion[] = [
    ...new Map(
      filas
        .filter((o) => o.doctor)
        .map((o) => [o.doctor!.id, { id: o.doctor!.id, nombre: o.doctor!.nombre }]),
    ).values(),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const conTareas = new Set(tarjetas.flatMap((t) => t.tecnicos));
  const tecnicos: Opcion[] = (usuarios ?? [])
    .filter((u) => conTareas.has(u.id))
    .map((u) => ({ id: u.id, nombre: u.nombre }));

  const puedeRegistrar = ctx.roles.some((r) => ["recepcion", "administrador"].includes(r));

  const atrasadas = tarjetas.filter(
    (t) => !t.terminada && new Date(`${t.fechaComprometida}T00:00:00`) < new Date(),
  ).length;

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

      {tarjetas.length === 0 ? (
        <div className="grid min-h-[280px] place-items-center rounded-r2 border border-line bg-card p-s6">
          <div className="flex max-w-[440px] flex-col items-center gap-s3 text-center">
            <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
              ○
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Aún no hay órdenes</h2>
            <p className="text-base leading-relaxed text-ink-2">
              La orden es el centro del sistema: de ella cuelgan la producción,
              la entrega y la factura.
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
        <Tablero
          tarjetas={tarjetas}
          columnas={columnas}
          doctores={doctores}
          tecnicos={tecnicos}
        />
      )}

      {/* D-02: no hay columna de saldo. El importe es lo que vale el
          trabajo; la deuda nace del documento de venta y se lee de
          v_cartera, en la Fase 2. */}
      <p className="text-sm text-ink-3">
        El importe al pie de cada columna es valor de venta sin IGV. No es
        deuda: la deuda nace del comprobante, y llega en la Fase 2.
      </p>
    </div>
  );
}
