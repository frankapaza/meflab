import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { Filtros } from "./filtros";

export const metadata = { title: "Auditoría · MEFLAB" };

const hora = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

/**
 * Agrupación por módulo. La bitácora guarda nombres de tabla, y nadie
 * busca por «documento_venta»: busca por «facturación».
 */
const MODULOS: { id: string; nombre: string; tablas: string[] }[] = [
  {
    id: "dinero",
    nombre: "Dinero",
    tablas: [
      "documento_venta", "documento_detalle", "cuenta_cobrar", "pago",
      "pago_aplicacion", "caja_sesion", "caja_movimiento",
      "gestion_cobranza", "promesa_pago",
    ],
  },
  {
    id: "comercial",
    nombre: "Comercial",
    tablas: ["cliente", "doctor", "paciente", "lista_precio", "precio", "servicio"],
  },
  {
    id: "produccion",
    nombre: "Producción",
    tablas: ["orden_trabajo", "detalle_trabajo", "tarea_produccion", "entrega", "archivo"],
  },
  {
    id: "calidad",
    nombre: "Calidad",
    tablas: ["inspeccion", "inspeccion_punto", "retrabajo", "tecnico_competencia"],
  },
  {
    id: "almacen",
    nombre: "Almacén",
    tablas: ["movimiento_stock", "inventario_fisico", "costo_externo", "material", "lote"],
  },
  {
    id: "acceso",
    nombre: "Accesos y configuración",
    tablas: ["usuario", "usuario_rol", "configuracion", "serie", "area", "tenant"],
  },
];

const ACCION = {
  INSERT: { glifo: "+", etiqueta: "Alta", clase: "text-ok" },
  UPDATE: { glifo: "±", etiqueta: "Cambio", clase: "text-ink-2" },
  DELETE: { glifo: "−", etiqueta: "Baja", clase: "text-err" },
} as const;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; accion?: string; usuario?: string; desde?: string; hasta?: string }>;
}) {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const filtros = await searchParams;
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("auditoria")
    .select("id, ocurrido_en, usuario_id, accion, tabla, registro_id, antes, despues")
    .order("ocurrido_en", { ascending: false })
    .limit(200);

  const modulo = MODULOS.find((m) => m.id === filtros.modulo);
  if (modulo) consulta = consulta.in("tabla", modulo.tablas);
  if (filtros.accion) consulta = consulta.eq("accion", filtros.accion);
  if (filtros.usuario) consulta = consulta.eq("usuario_id", filtros.usuario);
  if (filtros.desde) consulta = consulta.gte("ocurrido_en", `${filtros.desde}T00:00:00`);
  if (filtros.hasta) consulta = consulta.lte("ocurrido_en", `${filtros.hasta}T23:59:59`);

  const [{ data: entradas }, { data: usuarios }] = await Promise.all([
    consulta,
    supabase.from("usuario").select("id, nombre").order("nombre"),
  ]);

  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));

  const filas = (entradas ?? []) as unknown as {
    id: number;
    ocurrido_en: string;
    usuario_id: string | null;
    accion: keyof typeof ACCION;
    tabla: string;
    registro_id: string | null;
    antes: Record<string, unknown> | null;
    despues: Record<string, unknown> | null;
  }[];

  const moduloDe = (tabla: string) =>
    MODULOS.find((m) => m.tablas.includes(tabla))?.nombre ?? "Otro";

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Configuración
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          Bitácora
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Quién cambió qué y cuándo. La escriben triggers de la base, no la
          aplicación: así queda registro aunque el cambio se haga por otra
          vía. <b className="font-semibold text-ink">Nadie puede editarla ni
          borrarla</b>, tampoco el Administrador.
        </p>
      </div>

      <Filtros
        modulos={MODULOS.map((m) => ({ id: m.id, nombre: m.nombre }))}
        usuarios={usuarios ?? []}
        actual={filtros}
      />

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Movimientos
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {filas.length === 200
              ? "200 más recientes · acota con los filtros"
              : `${filas.length} ${filas.length === 1 ? "entrada" : "entradas"}`}
          </span>
        </div>

        {filas.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            No hay movimientos con esos filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Cuándo</th>
                  <th className="px-pad-x py-s2 font-medium">Quién</th>
                  <th className="px-pad-x py-s2 font-medium">Qué</th>
                  <th className="px-pad-x py-s2 font-medium">Módulo</th>
                  <th className="px-pad-x py-s2 font-medium">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const a = ACCION[f.accion] ?? ACCION.UPDATE;
                  return (
                    <tr key={f.id} className="border-b border-line last:border-0 align-top">
                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {hora.format(new Date(f.ocurrido_en))}
                      </td>
                      <td className="px-pad-x py-s3 text-sm">
                        {f.usuario_id
                          ? (nombrePorId.get(f.usuario_id) ?? (
                              <span className="font-mono text-xs text-ink-3">
                                {f.usuario_id.slice(0, 8)}
                              </span>
                            ))
                          : <span className="font-mono text-xs text-ink-3">sistema</span>}
                      </td>
                      {/* La acción lleva glifo además de color: la
                          bitácora se exporta y se lee impresa. */}
                      <td className="px-pad-x py-s3">
                        <span className={`font-mono text-sm ${a.clase}`}>
                          <span aria-hidden="true">{a.glifo}</span> {a.etiqueta}
                        </span>
                      </td>
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm">{moduloDe(f.tabla)}</span>
                          <span className="font-mono text-xs text-ink-3">{f.tabla}</span>
                        </div>
                      </td>
                      <td className="px-pad-x py-s3">
                        <Cambio antes={f.antes} despues={f.despues} />
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

/**
 * Qué cambió, campo a campo.
 *
 * Enseñar los dos JSON enteros obliga a compararlos a ojo, que es como no
 * enseñar nada. Se listan sólo los campos que cambiaron de verdad.
 */
function Cambio({
  antes,
  despues,
}: {
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
}) {
  // Campos de mantenimiento: cambian en cada escritura y no dicen nada.
  const RUIDO = new Set(["updated_at", "updated_by", "created_at", "created_by"]);

  if (!antes && despues) {
    return <span className="font-mono text-xs text-ink-3">registro creado</span>;
  }
  if (antes && !despues) {
    return <span className="font-mono text-xs text-ink-3">registro borrado</span>;
  }
  if (!antes || !despues) {
    return <span className="font-mono text-xs text-ink-3">—</span>;
  }

  const cambios = Object.keys(despues).filter(
    (k) => !RUIDO.has(k) && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]),
  );

  if (cambios.length === 0) {
    return <span className="font-mono text-xs text-ink-3">sin cambios de fondo</span>;
  }

  return (
    <ul className="flex flex-col gap-[2px]">
      {cambios.slice(0, 6).map((k) => (
        <li key={k} className="font-mono text-xs">
          <span className="text-ink-3">{k}:</span>{" "}
          <span className="text-ink-2">{recortar(antes[k])}</span>
          <span className="text-ink-3"> → </span>
          <span className="font-semibold">{recortar(despues[k])}</span>
        </li>
      ))}
      {cambios.length > 6 ? (
        <li className="font-mono text-xs text-ink-3">
          y {cambios.length - 6} campo(s) más
        </li>
      ) : null}
    </ul>
  );
}

function recortar(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 28 ? `${s.slice(0, 28)}…` : s;
}
