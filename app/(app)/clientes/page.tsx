import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ETIQUETA_TIPO, type TipoCliente } from "@/lib/validaciones/cliente";

import { DialogoCliente, type ClienteEditable } from "./dialogo-cliente";

export const metadata = { title: "Clientes · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export default async function ClientesPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  // Todo pasa por RLS: sólo el propio laboratorio.
  const [{ data: clientes }, { data: listas }] = await Promise.all([
    supabase
      .from("cliente")
      .select(
        "id, tipo, razon_social, tipo_documento, numero_documento, direccion, email, telefono, dias_credito, linea_credito, lista_precio_id, bloqueado, motivo_bloqueo, lista:lista_precio_id(nombre), doctor(count)",
      )
      .order("razon_social"),
    supabase
      .from("lista_precio")
      .select("id, nombre, precios_incluyen_igv")
      .eq("activo", true)
      .order("nombre"),
  ]);

  const filas = clientes ?? [];
  const puedeEditar = ctx.roles.some((r) => ["recepcion", "administrador"].includes(r));

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Comercial
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        </div>

        {puedeEditar ? (
          <DialogoCliente listas={listas ?? []}>
            <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
              Nuevo cliente
            </button>
          </DialogoCliente>
        ) : null}
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-01
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          El cliente es a quien se <b className="font-semibold text-ink">factura y se cobra</b>;
          el doctor es quien pide el trabajo. Una clínica agrupa varios doctores
          y <b className="font-semibold text-ink">una sola deuda</b>. Un doctor
          independiente es un cliente con un único doctor asociado.
        </p>
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Cartera de clientes
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {filas.length} {filas.length === 1 ? "cliente" : "clientes"}
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="grid min-h-[280px] place-items-center p-s6">
            <div className="flex max-w-[420px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Aún no hay clientes</h3>
              <p className="text-base leading-relaxed text-ink-2">
                Un cliente es a quien se factura: una clínica o un doctor
                independiente. Los doctores viven dentro del cliente.
              </p>
              {puedeEditar ? (
                <DialogoCliente listas={listas ?? []}>
                  <button className="mt-s1 h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on">
                    Registrar el primero
                  </button>
                </DialogoCliente>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Cliente</th>
                  <th className="px-pad-x py-s2 font-medium">Tipo</th>
                  <th className="px-pad-x py-s2 font-medium">Documento</th>
                  <th className="px-pad-x py-s2 font-medium">Condiciones</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Línea</th>
                  <th className="px-pad-x py-s2 font-medium">Estado</th>
                  {puedeEditar ? (
                    <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => {
                  const editable: ClienteEditable = {
                    id: c.id,
                    tipo: c.tipo,
                    razonSocial: c.razon_social,
                    tipoDocumento: c.tipo_documento,
                    numeroDocumento: c.numero_documento,
                    direccion: c.direccion,
                    email: c.email,
                    telefono: c.telefono,
                    diasCredito: c.dias_credito,
                    lineaCredito: c.linea_credito,
                    listaPrecioId: c.lista_precio_id,
                  };
                  const doctores = (c.doctor as unknown as { count: number }[])?.[0]?.count ?? 0;

                  return (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-medium">
                            {c.razon_social}
                          </span>
                          <span className="truncate font-mono text-xs text-ink-3">
                            {doctores === 0
                              ? "sin doctores todavía"
                              : `${doctores} ${doctores === 1 ? "doctor" : "doctores"}`}
                            {c.lista ? ` · ${(c.lista as { nombre: string }).nombre}` : ""}
                          </span>
                        </div>
                      </td>

                      <td className="px-pad-x py-s3">
                        <span
                          className={
                            c.tipo === "clinica"
                              ? "rounded-r1 bg-acc-bg px-s2 py-[3px] font-mono text-xs font-semibold text-acc"
                              : "rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-2"
                          }
                        >
                          {ETIQUETA_TIPO[c.tipo as TipoCliente]}
                        </span>
                      </td>

                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {c.tipo_documento} {c.numero_documento}
                      </td>

                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        {c.dias_credito > 0 ? `Crédito ${c.dias_credito} días` : "Contado"}
                      </td>

                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {c.linea_credito ? soles.format(c.linea_credito) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>

                      <td className="px-pad-x py-s3">
                        {c.bloqueado ? (
                          <span
                            title={c.motivo_bloqueo ?? undefined}
                            className="rounded-r1 bg-err-bg px-s2 py-[3px] font-mono text-xs font-semibold text-err"
                          >
                            BLOQUEADO
                          </span>
                        ) : (
                          <span className="rounded-r1 bg-ok-bg px-s2 py-[3px] font-mono text-xs font-semibold text-ok">
                            ACTIVO
                          </span>
                        )}
                      </td>

                      {puedeEditar ? (
                        <td className="px-pad-x py-s3 text-right">
                          <DialogoCliente cliente={editable} listas={listas ?? []}>
                            <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                              Editar
                            </button>
                          </DialogoCliente>
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

      {/* D-02: aquí NO hay columna de deuda a propósito. La deuda nace del
          documento de venta y se lee de v_cartera, que llega en la Fase 2.
          Poner ahora una cifra calculada de otra forma es exactamente el
          hallazgo H-01 que este proyecto existe para cerrar. */}
      <p className="text-sm text-ink-3">
        La deuda de cada cliente aparecerá en la Fase 2, leída de una sola
        fuente. Hasta entonces no se muestra ninguna cifra: dos formas de
        calcularla es como se acaba con tres cifras distintas para lo mismo.
      </p>
    </div>
  );
}
