import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { BotonActivoServicio } from "./boton-activo";
import {
  DialogoServicio,
  type OpcionCategoria,
  type ServicioEditable,
} from "./dialogo-servicio";

export const metadata = { title: "Catálogo y tarifas · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

type Fila = {
  id: string;
  codigo: string;
  nombre: string;
  categoria_id: string | null;
  precio_capturado: number;
  precio_base: number;
  afectacion: string;
  activo: boolean;
  categoria: { nombre: string } | null;
};

export default async function CatalogoPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: servicios }, { data: categorias }, { data: listas }, { data: config }] =
    await Promise.all([
      supabase
        .from("servicio")
        .select(
          "id, codigo, nombre, categoria_id, precio_capturado, precio_base, afectacion, activo, categoria:categoria_id(nombre)",
        )
        .order("codigo"),
      supabase.from("categoria_servicio").select("id, nombre").order("orden"),
      supabase
        .from("lista_precio")
        .select("id, nombre, precios_incluyen_igv, es_default")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("configuracion").select("valor").eq("clave", "igv").maybeSingle(),
    ]);

  const filas = (servicios ?? []) as unknown as Fila[];
  const opciones = (categorias ?? []) as OpcionCategoria[];
  const defecto = (listas ?? []).find((l) => l.es_default);

  // La tasa vive en configuracion, nunca en el código: cambia por decreto.
  const tasaIgv = (config?.valor as { tasa?: number } | null)?.tasa ?? 0.18;
  const capturaConIgv = defecto?.precios_incluyen_igv ?? false;

  const puedeEditar = ctx.roles.includes("administrador");
  const activos = filas.filter((s) => s.activo).length;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Configuración
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo y tarifas</h1>
        </div>

        {puedeEditar && defecto ? (
          <DialogoServicio
            categorias={opciones}
            capturaConIgv={capturaConIgv}
            listaDefecto={defecto.nombre}
            tasaIgv={tasaIgv}
          >
            <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
              Nuevo servicio
            </button>
          </DialogoServicio>
        ) : null}
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-07
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Lo que MEFLAB almacena es <b className="font-semibold text-ink">siempre valor
          de venta sin IGV</b>. Cómo se teclea es un atributo de cada lista de
          precios, no del servicio: la lista{" "}
          <b className="font-semibold text-ink">{defecto?.nombre ?? "por defecto"}</b>{" "}
          captura {capturaConIgv ? "con IGV incluido" : "sin IGV"}, y la
          conversión la hace la base al guardar — nunca al leer.
        </p>
      </div>

      {!defecto ? (
        <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
          No hay ninguna lista de precios marcada por defecto. Sin ella no se
          sabe en qué modo se capturan los precios y no se puede dar de alta
          un servicio.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Servicios
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {activos} {activos === 1 ? "activo" : "activos"}
            {filas.length > activos ? ` · ${filas.length - activos} retirados` : ""}
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="grid min-h-[280px] place-items-center p-s6">
            <div className="flex max-w-[440px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                El catálogo está vacío
              </h3>
              <p className="text-base leading-relaxed text-ink-2">
                Sin servicios no se puede poner precio a una orden. Empieza por
                los cinco o seis trabajos que más se piden.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Código</th>
                  <th className="px-pad-x py-s2 font-medium">Servicio</th>
                  <th className="px-pad-x py-s2 font-medium">Categoría</th>
                  <th className="px-pad-x py-s2 text-right font-medium">
                    {capturaConIgv ? "Con IGV" : "Sin IGV"}
                  </th>
                  <th className="px-pad-x py-s2 text-right font-medium">Almacenado</th>
                  {puedeEditar ? (
                    <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => {
                  const editable: ServicioEditable = {
                    id: s.id,
                    codigo: s.codigo,
                    nombre: s.nombre,
                    categoriaId: s.categoria_id,
                    precioCapturado: s.precio_capturado,
                    afectacion: s.afectacion,
                    activo: s.activo,
                  };

                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-line last:border-0 ${s.activo ? "" : "opacity-60"}`}
                    >
                      <td className="px-pad-x py-s3 font-mono text-sm text-ink-2">
                        {s.codigo}
                      </td>

                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-medium">{s.nombre}</span>
                          {s.afectacion !== "gravado" ? (
                            <span className="font-mono text-xs uppercase text-warn">
                              {s.afectacion}
                            </span>
                          ) : null}
                          {!s.activo ? (
                            <span className="font-mono text-xs uppercase text-ink-3">
                              retirado del catálogo
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        {s.categoria?.nombre ?? <span className="text-ink-3">—</span>}
                      </td>

                      {/* Lo tecleado y lo almacenado coinciden cuando la
                          lista captura sin IGV. No es redundancia: es la
                          prueba visible de que no se divide nada por detrás.
                          Ambas salen de la base, ninguna se reconstruye. */}
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                        {soles.format(s.precio_capturado)}
                      </td>

                      <td className="px-pad-x py-s3 text-right font-mono text-sm font-semibold tabular-nums">
                        {soles.format(s.precio_base)}
                      </td>

                      {puedeEditar && defecto ? (
                        <td className="px-pad-x py-s3">
                          <div className="flex justify-end gap-s2">
                            <DialogoServicio
                              servicio={editable}
                              categorias={opciones}
                              capturaConIgv={capturaConIgv}
                              listaDefecto={defecto.nombre}
                              tasaIgv={tasaIgv}
                            >
                              <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                                Editar
                              </button>
                            </DialogoServicio>
                            <BotonActivoServicio
                              servicioId={s.id}
                              activo={s.activo}
                              nombre={s.nombre}
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aquí sólo se resume cuál manda hoy, porque es lo que decide cómo se
          captura el precio base. Tarifarla es otra pantalla. */}
      <div className="flex flex-col gap-s2 rounded-r2 border border-line bg-card p-s4">
        <div className="flex flex-wrap items-center justify-between gap-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Listas de precio
          </h2>
          <Link
            href="/configuracion/listas"
            className="grid h-[30px] place-items-center rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill"
          >
            Gestionar listas
          </Link>
        </div>
        <ul className="flex flex-col gap-s1">
          {(listas ?? []).map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-s2 text-sm">
              <span className="font-medium">{l.nombre}</span>
              {l.es_default ? (
                <span className="rounded-r1 bg-acc-bg px-s2 py-[2px] font-mono text-xs font-semibold text-acc">
                  POR DEFECTO
                </span>
              ) : null}
              <span className="font-mono text-xs text-ink-3">
                {l.precios_incluyen_igv ? "captura con IGV" : "captura sin IGV"}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-3">
          Un servicio sin precio propio en una lista se cobra al precio base del
          catálogo. La lista de cada cliente se asigna en sus condiciones
          comerciales.
        </p>
      </div>
    </div>
  );
}
