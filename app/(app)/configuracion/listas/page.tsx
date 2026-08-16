import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { BotonActivoLista } from "./boton-activo";
import { DialogoLista, type ListaEditable } from "./dialogo-lista";

export const metadata = { title: "Listas de precio · MEFLAB" };

type Fila = {
  id: string;
  nombre: string;
  precios_incluyen_igv: boolean;
  es_default: boolean;
  activo: boolean;
  lista_precio_item: { count: number }[];
  cliente: { count: number }[];
};

export default async function ListasPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("lista_precio")
    .select(
      "id, nombre, precios_incluyen_igv, es_default, activo, lista_precio_item(count), cliente(count)",
    )
    .order("es_default", { ascending: false })
    .order("nombre");

  const filas = (data ?? []) as unknown as Fila[];
  const puedeEditar = ctx.roles.includes("administrador");

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            <Link href="/configuracion" className="hover:text-acc">
              Catálogo y tarifas
            </Link>
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Listas de precio</h1>
        </div>

        {puedeEditar ? (
          <DialogoLista>
            <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
              Nueva lista
            </button>
          </DialogoLista>
        ) : null}
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-07
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Una lista es una <b className="font-semibold text-ink">tarifa pactada</b>.
          Cada una declara si sus precios se teclean con IGV o sin él, y sólo
          fija precio para los servicios que quiera: para el resto manda el
          precio base del catálogo. Un cliente sin lista asignada usa la lista
          por defecto.
        </p>
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                <th className="px-pad-x py-s2 font-medium">Lista</th>
                <th className="px-pad-x py-s2 font-medium">Captura</th>
                <th className="px-pad-x py-s2 text-right font-medium">Servicios</th>
                <th className="px-pad-x py-s2 text-right font-medium">Clientes</th>
                {puedeEditar ? (
                  <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filas.map((l) => {
                const servicios = l.lista_precio_item?.[0]?.count ?? 0;
                const clientes = l.cliente?.[0]?.count ?? 0;
                const editable: ListaEditable = {
                  id: l.id,
                  nombre: l.nombre,
                  preciosIncluyenIgv: l.precios_incluyen_igv,
                  esDefault: l.es_default,
                  servicios,
                };

                return (
                  <tr
                    key={l.id}
                    className={`border-b border-line last:border-0 ${l.activo ? "" : "opacity-60"}`}
                  >
                    <td className="px-pad-x py-s3">
                      <div className="flex min-w-0 flex-col gap-s1">
                        <div className="flex flex-wrap items-center gap-s2">
                          <Link
                            href={`/configuracion/listas/${l.id}`}
                            className="text-base font-medium hover:text-acc"
                          >
                            {l.nombre}
                          </Link>
                          {l.es_default ? (
                            <span className="rounded-r1 bg-acc-bg px-s2 py-[2px] font-mono text-xs font-semibold text-acc">
                              POR DEFECTO
                            </span>
                          ) : null}
                          {!l.activo ? (
                            <span className="rounded-r1 bg-fill px-s2 py-[2px] font-mono text-xs text-ink-3">
                              RETIRADA
                            </span>
                          ) : null}
                        </div>
                        <span className="font-mono text-xs text-ink-3">
                          {servicios === 0
                            ? "sin precios propios: usa el precio base de cada servicio"
                            : `${servicios} ${servicios === 1 ? "servicio" : "servicios"} con precio propio`}
                        </span>
                      </div>
                    </td>

                    <td className="px-pad-x py-s3">
                      <span
                        className={
                          l.precios_incluyen_igv
                            ? "rounded-r1 bg-warn-bg px-s2 py-[3px] font-mono text-xs font-semibold text-warn"
                            : "rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-2"
                        }
                      >
                        {l.precios_incluyen_igv ? "CON IGV" : "SIN IGV"}
                      </span>
                    </td>

                    <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                      {servicios}
                    </td>

                    <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                      {clientes}
                    </td>

                    {puedeEditar ? (
                      <td className="px-pad-x py-s3">
                        <div className="flex justify-end gap-s2">
                          <Link
                            href={`/configuracion/listas/${l.id}`}
                            className="grid h-[30px] place-items-center rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill"
                          >
                            Tarifa
                          </Link>
                          <DialogoLista lista={editable}>
                            <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                              Editar
                            </button>
                          </DialogoLista>
                          <BotonActivoLista
                            listaId={l.id}
                            activo={l.activo}
                            esDefault={l.es_default}
                            nombre={l.nombre}
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
      </div>

      <p className="text-sm text-ink-3">
        La lista de cada cliente se asigna desde{" "}
        <Link href="/clientes" className="text-acc hover:underline">
          Clientes
        </Link>
        , en sus condiciones comerciales.
      </p>
    </div>
  );
}
