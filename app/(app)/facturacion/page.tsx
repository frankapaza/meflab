import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { AnularDocumento } from "./anular";
import { RegistrarCpe } from "./electronico";
import { NuevaNota } from "./nota";
import {
  FormularioDocumento,
  type LineaFacturable,
  type OpcionCliente,
  type OpcionSerie,
} from "./formulario";

export const metadata = { title: "Facturación · MEFLAB" };

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

export default async function FacturacionPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [
    { data: clientes },
    { data: series },
    { data: deudas },
    { data: config },
    { data: emitidos },
    { data: pendientes },
  ] = await Promise.all([
    supabase
      .from("cliente")
      .select("id, razon_social, tipo_documento, numero_documento, dias_credito, linea_credito")
      .eq("bloqueado", false)
      .order("razon_social"),
    supabase.from("serie").select("tipo_doc, serie").eq("activo", true),
    // La deuda por cliente sale de v_deuda_cliente, agregado de v_cartera.
    // Es la misma fuente que cobranza: el control de crédito no puede
    // usar una cifra distinta de la que se le enseña al cobrador.
    supabase.from("v_deuda_cliente").select("cliente_id, deuda_total"),
    supabase.from("configuracion").select("valor").eq("clave", "igv").maybeSingle(),
    supabase
      .from("documento_venta")
      .select(
        // `importe_original` no es decorativo: comparado con el saldo dice
        // si el documento tiene pagos aplicados, y eso decide si se puede
        // anular. Sin él habría que ofrecer un botón que a veces falla.
        "id, numero, tipo, estado, cliente_id, fecha_emision, fecha_vencimiento, total, motivo, documento_ref_id, estado_cpe, hash_cpe, ticket_cpe, respuesta_cpe, cliente:cliente_id(razon_social), cuenta_cobrar(saldo, estado, importe_original)",
      )
      .order("fecha_emision", { ascending: false })
      .limit(30),
    // Trabajos entregados y no facturados. Se leen de detalle_trabajo
    // filtrando los que ya tienen documento: es RF-145 desde el lado de la
    // interfaz, para no ofrecer algo que la base va a rechazar.
    supabase
      .from("detalle_trabajo")
      .select(
        "id, cantidad, precio_unitario, afectacion, servicio:servicio_id(nombre), orden:orden_id(id, codigo, cliente_id, estado:estado_id(fase))",
      ),
  ]);

  // `consume_trabajo` y no la mera existencia de la línea: una factura
  // anulada libera sus trabajos, y tienen que volver a ofrecerse aquí.
  // Es la misma condición que usa el índice único y v_pendiente_facturar.
  const { data: yaFacturadas } = await supabase
    .from("documento_detalle")
    .select("detalle_trabajo_id")
    .eq("consume_trabajo", true)
    .not("detalle_trabajo_id", "is", null);

  const facturadas = new Set(
    (yaFacturadas ?? []).map((d) => d.detalle_trabajo_id as string),
  );

  type Detalle = {
    id: string;
    cantidad: number;
    precio_unitario: number;
    afectacion: string;
    servicio: { nombre: string } | null;
    orden: {
      id: string;
      codigo: string;
      cliente_id: string;
      estado: { fase: string } | null;
    } | null;
  };

  const facturables: LineaFacturable[] = ((pendientes ?? []) as unknown as Detalle[])
    .filter((d) => d.orden?.estado?.fase === "final" && !facturadas.has(d.id))
    .map((d) => ({
      detalleTrabajoId: d.id,
      ordenId: d.orden!.id,
      codigoOrden: d.orden!.codigo,
      clienteId: d.orden!.cliente_id,
      descripcion: d.servicio?.nombre ?? "Trabajo",
      cantidad: Number(d.cantidad),
      precioUnitario: Number(d.precio_unitario),
      afectacion: d.afectacion,
    }));

  const deudaPorCliente = new Map(
    ((deudas ?? []) as unknown as { cliente_id: string; deuda_total: number }[]).map((d) => [
      d.cliente_id,
      Number(d.deuda_total),
    ]),
  );

  const opcionesCliente: OpcionCliente[] = (clientes ?? []).map((c) => ({
    id: c.id,
    razonSocial: c.razon_social,
    tipoDocumento: c.tipo_documento,
    numeroDocumento: c.numero_documento,
    diasCredito: c.dias_credito,
    lineaCredito: c.linea_credito === null ? null : Number(c.linea_credito),
    deudaActual: deudaPorCliente.get(c.id) ?? 0,
  }));

  const opcionesSerie: OpcionSerie[] = (series ?? []).map((s) => ({
    tipo: s.tipo_doc,
    serie: s.serie,
  }));

  const tasaIgv = (config?.valor as { tasa?: number } | null)?.tasa ?? 0.18;
  const puedeEmitir = ctx.roles.some((r) => ["recepcion", "administrador"].includes(r));
  // Anular borra deuda de la cartera, así que no es del mostrador: la
  // Server Action exige estos dos roles y el menú tiene que decir lo mismo.
  const puedeAnular = ctx.roles.some((r) => ["administrador", "gerencia"].includes(r));

  type Doc = {
    id: string;
    numero: string;
    tipo: string;
    estado: string;
    cliente_id: string;
    motivo: string | null;
    documento_ref_id: string | null;
    estado_cpe: string;
    hash_cpe: string | null;
    ticket_cpe: string | null;
    respuesta_cpe: string | null;
    fecha_emision: string;
    fecha_vencimiento: string;
    total: number;
    cliente: { razon_social: string } | null;
    cuenta_cobrar: { saldo: number; estado: string; importe_original: number } | null;
  };
  const documentos = (emitidos ?? []) as unknown as Doc[];

  const faltanSeries = opcionesSerie.length === 0;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Dinero
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-02
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          La cuenta por cobrar nace <b className="font-semibold text-ink">del
          documento</b>, jamás del trabajo. Un trabajo entregado y sin facturar
          no es deuda: es un pendiente operativo, y aparece abajo para que no
          se quede sin cobrar.
        </p>
      </div>

      {faltanSeries ? (
        <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm leading-relaxed text-warn">
          <span aria-hidden="true">▲</span> No hay ninguna serie de facturación
          configurada. Sin serie no se puede emitir: hay que crear al menos una
          para <code className="font-mono">FACTURA</code> y otra para{" "}
          <code className="font-mono">BOLETA</code>.
        </p>
      ) : null}

      {puedeEmitir && !faltanSeries ? (
        <FormularioDocumento
          clientes={opcionesCliente}
          facturables={facturables}
          series={opcionesSerie}
          tasaIgv={tasaIgv}
          puedeAutorizar={puedeAnular}
        />
      ) : null}

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Documentos emitidos
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {documentos.length} {documentos.length === 1 ? "documento" : "documentos"}
          </span>
        </div>

        {documentos.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            Todavía no se ha emitido ningún documento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Número</th>
                  <th className="px-pad-x py-s2 font-medium">Cliente</th>
                  <th className="px-pad-x py-s2 font-medium">Emitido</th>
                  <th className="px-pad-x py-s2 font-medium">Vence</th>
                  <th className="px-pad-x py-s2 font-medium">SUNAT</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Total</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Saldo</th>
                  {puedeAnular ? (
                    <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => {
                  const anulado = d.estado === "anulado";
                  const cxc = d.cuenta_cobrar;
                  const pagado = cxc?.estado === "cerrada";

                  // Si se ha cobrado algo contra este documento, anularlo
                  // dejaría dinero aplicado a una factura inexistente. La
                  // base lo rechaza; aquí se explica en vez de ofrecerlo.
                  const cobrado = cxc
                    ? Number(cxc.importe_original) - Number(cxc.saldo)
                    : 0;
                  const conPagos = cobrado > 0;

                  // Una nota se corrige con otra nota sobre la factura
                  // original, nunca con una nota sobre la nota.
                  const esNota = d.tipo.startsWith("nota_");

                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-line last:border-0 ${anulado ? "opacity-60" : ""}`}
                    >
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          {/* El número lleva al comprobante imprimible: es
                              lo que se entrega al cliente, y buscarlo en
                              otro sitio es un paso de más cada vez. */}
                          <a
                            href={`/comprobante/${d.id}`}
                            className="font-mono text-sm underline decoration-line underline-offset-2 hover:decoration-acc"
                          >
                            {d.numero}
                          </a>
                          <span className="font-mono text-xs uppercase text-ink-3">
                            {d.tipo}
                            {anulado ? " · anulado" : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        {d.cliente?.razon_social ?? "—"}
                      </td>
                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {fecha.format(new Date(`${d.fecha_emision}T12:00:00`))}
                      </td>
                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {fecha.format(new Date(`${d.fecha_vencimiento}T12:00:00`))}
                      </td>
                      {/* Mientras no haya integración con un PSE, esto se
                          anota a mano. Los campos son los mismos que
                          rellenará la integración cuando llegue. */}
                      <td className="px-pad-x py-s3">
                        <RegistrarCpe
                          documentoId={d.id}
                          numero={d.numero}
                          estadoActual={d.estado_cpe}
                          hashActual={d.hash_cpe}
                          ticketActual={d.ticket_cpe}
                          respuestaActual={d.respuesta_cpe}
                        />
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {soles.format(Number(d.total))}
                      </td>
                      {/* El saldo sale de cuenta_cobrar, que es la misma
                          fuente que alimenta la cartera y el dashboard. */}
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {anulado ? (
                          <span className="text-ink-3">—</span>
                        ) : pagado ? (
                          <span className="text-ok">
                            <span aria-hidden="true">■</span> pagado
                          </span>
                        ) : (
                          soles.format(Number(cxc?.saldo ?? 0))
                        )}
                      </td>

                      {puedeAnular ? (
                        <td className="px-pad-x py-s3">
                          {anulado ? (
                            <span className="block text-right font-mono text-xs text-ink-3">—</span>
                          ) : esNota ? (
                            <span
                              className="block text-right font-mono text-xs text-ink-3"
                              title="Una nota se corrige con otra nota sobre la factura original"
                            >
                              nota
                            </span>
                          ) : (
                            <div className="flex justify-end gap-s2">
                              {/* La nota vale SIEMPRE, también con cobros
                                  aplicados — que es justo cuando anular ya
                                  no se puede. Es la única salida para
                                  corregir una factura ya cobrada. */}
                              <NuevaNota
                                documentoId={d.id}
                                numero={d.numero}
                                clienteId={d.cliente_id}
                                cliente={d.cliente?.razon_social ?? "—"}
                                saldoActual={Number(cxc?.saldo ?? 0)}
                                series={opcionesSerie.map((s) => ({
                                  tipo: s.tipo,
                                  serie: s.serie,
                                }))}
                                tasaIgv={tasaIgv}
                              />
                              {conPagos ? (
                                <span
                                  className="self-center font-mono text-xs text-ink-3"
                                  title="Ya tiene cobros aplicados: corrígelo con una nota de crédito"
                                >
                                  con pagos
                                </span>
                              ) : (
                                <AnularDocumento
                                  documentoId={d.id}
                                  numero={d.numero}
                                  cliente={d.cliente?.razon_social ?? "—"}
                                  total={Number(d.total)}
                                  cobrado={cobrado}
                                />
                              )}
                            </div>
                          )}
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

      {/* RF-145 · No es deuda, y por eso vive en su propia tabla. Es el
          control que evita regalar trabajo entregado. */}
      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Entregado sin facturar
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {soles.format(
              facturables.reduce((s, f) => s + f.cantidad * f.precioUnitario, 0),
            )}{" "}
            sin IGV
          </span>
        </div>
        {facturables.length === 0 ? (
          <p className="p-s5 text-center text-sm text-ink-2">
            No queda trabajo entregado sin facturar.
          </p>
        ) : (
          <ul className="flex flex-col">
            {facturables.map((f) => (
              <li
                key={f.detalleTrabajoId}
                className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s2 last:border-0"
              >
                <span className="font-mono text-sm text-ink-2">{f.codigoOrden}</span>
                <span className="min-w-[180px] flex-1 truncate text-sm">
                  {f.descripcion}
                </span>
                <span className="font-mono text-sm tabular-nums text-ink-2">
                  {soles.format(f.cantidad * f.precioUnitario)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-line px-pad-x py-s2 text-sm text-ink-3">
          Esto <b className="font-semibold">no es deuda</b>: es trabajo
          entregado que todavía no se ha facturado. No suma a la cartera.
        </p>
      </div>
    </div>
  );
}
