"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";

import {
  TIPOS_DOCUMENTO,
  calcularImportes,
} from "@/lib/validaciones/facturacion";
import { cn } from "@/lib/utils";

import { emitirDocumento, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export type OpcionCliente = {
  id: string;
  razonSocial: string;
  tipoDocumento: string | null;
  numeroDocumento: string;
  diasCredito: number;
  /** null = sin límite pactado. */
  lineaCredito: number | null;
  /** Lo que ya debe hoy, leído de v_deuda_cliente. */
  deudaActual: number;
};

export type LineaFacturable = {
  detalleTrabajoId: string;
  ordenId: string;
  codigoOrden: string;
  clienteId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  afectacion: string;
};

export type OpcionSerie = { tipo: string; serie: string };

export function FormularioDocumento({
  clientes,
  facturables,
  series,
  tasaIgv,
  puedeAutorizar,
}: {
  clientes: OpcionCliente[];
  facturables: LineaFacturable[];
  series: OpcionSerie[];
  tasaIgv: number;
  /** Sólo Administrador y Gerencia pueden pasar de la línea de crédito. */
  puedeAutorizar: boolean;
}) {
  const router = useRouter();
  const idForm = useId();

  const [clienteId, setClienteId] = useState("");
  const [tipo, setTipo] = useState("factura");
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [motivoAutorizacion, setMotivoAutorizacion] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await emitirDocumento(previo, formData);
      if (r.ok) {
        setElegidas([]);
        router.refresh();
      }
      return r;
    },
    INICIAL,
  );

  const cliente = clientes.find((c) => c.id === clienteId);
  const suyas = facturables.filter((f) => f.clienteId === clienteId);
  const lineas = suyas.filter((f) => elegidas.includes(f.detalleTrabajoId));

  const importes = calcularImportes(
    lineas.map((l) => ({
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
      afectacion: l.afectacion,
    })),
    tasaIgv,
  );

  const seriesDelTipo = series.filter((s) => s.tipo === tipo.toUpperCase());
  const serie = seriesDelTipo[0]?.serie ?? "";

  // Una factura necesita RUC; una boleta no. Emitir una factura a un DNI
  // la rechaza SUNAT, y para entonces el doctor ya está esperando.
  //
  // Se comprueba `cliente` primero: sin cliente elegido no hay nada que
  // avisar, y el aviso saldría hablando de un cliente en blanco.
  const faltaRuc = Boolean(cliente) && tipo === "factura" && cliente!.tipoDocumento !== "RUC";

  const cargaUtil = lineas.map((l) => ({
    detalleTrabajoId: l.detalleTrabajoId,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    precioUnitario: l.precioUnitario,
    afectacion: l.afectacion,
  }));

  // Control de línea de crédito. La regla de verdad está en la base; esto
  // la adelanta para no dejar teclear una factura entera que va a rebotar.
  const excede =
    cliente?.lineaCredito != null &&
    cliente.deudaActual + importes.total > cliente.lineaCredito;

  const exceso = excede
    ? cliente!.deudaActual + importes.total - cliente!.lineaCredito!
    : 0;

  // Si excede, hace falta autorización escrita de quien pueda darla.
  const autorizacionLista =
    !excede || (puedeAutorizar && motivoAutorizacion.trim().length >= 5);

  const listo =
    Boolean(clienteId && serie) && lineas.length > 0 && !faltaRuc && autorizacionLista;

  return (
    <form action={accion} className="flex flex-col gap-s4">
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="observaciones" value={observaciones} />
      <input
        type="hidden"
        name="motivoAutorizacion"
        value={excede ? motivoAutorizacion : ""}
      />
      <input type="hidden" name="lineas" value={JSON.stringify(cargaUtil)} />

      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          A quién y con qué documento
        </h2>

        <div className="grid gap-s3 lg:grid-cols-3">
          <Campo etiqueta="Cliente *" id={`${idForm}-cli`}>
            <select
              id={`${idForm}-cli`}
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                setElegidas([]);
              }}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              <option value="">Elige un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Tipo *" id={`${idForm}-tipo`}>
            <select
              id={`${idForm}-tipo`}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            etiqueta="Serie"
            id={`${idForm}-serie`}
            ayuda={
              serie
                ? `Se emitirá en la serie ${serie}.`
                : "No hay serie configurada para este tipo."
            }
          >
            <input
              id={`${idForm}-serie`}
              value={serie}
              readOnly
              className="h-[38px] w-full rounded-r1 border border-line bg-fill px-s3 font-mono text-base text-ink-2 outline-none"
            />
          </Campo>
        </div>

        {faltaRuc ? (
          <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm leading-relaxed text-warn">
            <span aria-hidden="true">▲</span> {cliente?.razonSocial} tiene{" "}
            {cliente?.tipoDocumento ?? "otro documento"}, no RUC. Una factura a
            un DNI la rechaza SUNAT — emite una <b className="font-semibold">boleta</b>.
          </p>
        ) : null}

        {cliente ? (
          <p className="text-sm text-ink-3">
            {cliente.diasCredito > 0
              ? `Vence a ${cliente.diasCredito} días de la emisión, según sus condiciones.`
              : "Cliente al contado: el documento vence el mismo día."}
          </p>
        ) : null}
      </section>

      {/* RF-145: sólo se ofrecen trabajos entregados y NO facturados. La
          base además lo impide con un índice único, pero enseñar aquí algo
          que se va a rechazar al guardar es hacer perder el tiempo. */}
      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Trabajos por facturar
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {lineas.length} de {suyas.length} elegidos
          </span>
        </div>

        {!clienteId ? (
          <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
            Elige un cliente para ver sus trabajos entregados sin facturar.
          </p>
        ) : suyas.length === 0 ? (
          <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
            Este cliente no tiene trabajos entregados pendientes de facturar.
          </p>
        ) : (
          <ul className="flex flex-col gap-s2">
            {suyas.map((f) => {
              const activa = elegidas.includes(f.detalleTrabajoId);
              return (
                <li key={f.detalleTrabajoId}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-s3 rounded-r1 border p-s3 transition",
                      activa
                        ? "border-acc bg-acc-bg"
                        : "border-line bg-card-2 hover:border-line-2",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={activa}
                      onChange={() =>
                        setElegidas((s) =>
                          s.includes(f.detalleTrabajoId)
                            ? s.filter((x) => x !== f.detalleTrabajoId)
                            : [...s, f.detalleTrabajoId],
                        )
                      }
                      className="size-[16px] shrink-0 accent-acc"
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-base">{f.descripcion}</span>
                      <span className="truncate font-mono text-xs text-ink-3">
                        {f.codigoOrden} · {f.cantidad} ×{" "}
                        {soles.format(f.precioUnitario)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm tabular-nums">
                      {soles.format(f.cantidad * f.precioUnitario)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* D-03: lo almacenado es valor de venta; el IGV se calcula aquí y se
          congela en el documento. Se enseña desglosado antes de emitir
          porque después ya no se puede cambiar. */}
      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Importe
        </h2>
        <dl className="flex flex-col gap-s2">
          <Fila etiqueta="Valor de venta" valor={soles.format(importes.subtotal)} />
          <Fila
            etiqueta={`IGV (${(tasaIgv * 100).toFixed(0)} %)`}
            valor={soles.format(importes.igv)}
          />
          <div className="border-t border-line pt-s2">
            <Fila etiqueta="Total" valor={soles.format(importes.total)} destacado />
          </div>
        </dl>

        {/* La línea de crédito es un acuerdo comercial, no un capricho del
            sistema. Se enseña la cuenta entera —lo que ya debe, lo que se
            va a emitir y el límite— para que la decisión de saltárselo se
            tome viendo las tres cifras, no una alerta genérica. */}
        {excede ? (
          <div className="flex flex-col gap-s3 rounded-r1 border border-warn bg-warn-bg p-s3">
            <p className="text-sm leading-relaxed text-warn">
              <span aria-hidden="true">▲</span> Esta emisión deja a{" "}
              <b className="font-semibold">{cliente!.razonSocial}</b> por
              encima de su línea de crédito.
            </p>
            <dl className="flex flex-col gap-s1 font-mono text-sm tabular-nums text-warn">
              <Linea etiqueta="Ya debe" valor={soles.format(cliente!.deudaActual)} />
              <Linea etiqueta="Esta factura" valor={soles.format(importes.total)} />
              <Linea etiqueta="Su línea" valor={soles.format(cliente!.lineaCredito!)} />
              <Linea etiqueta="Se pasa en" valor={soles.format(exceso)} destacado />
            </dl>

            {puedeAutorizar ? (
              <div className="flex flex-col gap-s1">
                <label
                  htmlFor={`${idForm}-autoriza`}
                  className="font-mono text-xs uppercase tracking-wide text-warn"
                >
                  Motivo de la autorización *
                </label>
                <input
                  id={`${idForm}-autoriza`}
                  value={motivoAutorizacion}
                  onChange={(e) => setMotivoAutorizacion(e.target.value)}
                  placeholder="Cliente antiguo, paga siempre a tiempo"
                  className="h-[38px] w-full rounded-r1 border border-warn bg-card px-s3 text-base outline-none focus-visible:border-acc"
                />
                <span className="text-sm text-warn">
                  Queda tu nombre en el documento. Es lo que permitirá
                  explicar, dentro de un año, por qué se le fio de más.
                </span>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-warn">
                Tu rol no puede autorizarlo. Pídeselo a Administración o a
                Gerencia, o cobra antes parte de lo pendiente.
              </p>
            )}
          </div>
        ) : null}

        <Campo etiqueta="Observaciones" id={`${idForm}-obs`}>
          <textarea
            id={`${idForm}-obs`}
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
          />
        </Campo>
      </section>

      {estado.mensaje ? (
        <p
          role="status"
          className={cn(
            "rounded-r1 border px-s3 py-s2 text-sm",
            estado.ok ? "border-ok bg-ok-bg text-ok" : "border-err bg-err-bg text-err",
          )}
        >
          {estado.mensaje}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-s3">
        <p className="max-w-[560px] text-sm leading-relaxed text-ink-3">
          Al emitir, la cuenta por cobrar nace del documento en la misma
          operación. Es la única forma en que aparece deuda en MEFLAB.
        </p>
        <button
          type="submit"
          disabled={enviando || !listo}
          className="h-tap rounded-r1 bg-acc px-s5 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
        >
          {enviando ? "Emitiendo…" : "Emitir documento"}
        </button>
      </div>
    </form>
  );
}

function Fila({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-s3">
      <dt className={cn("text-sm", destacado ? "font-semibold text-ink" : "text-ink-2")}>
        {etiqueta}
      </dt>
      <dd
        className={cn(
          "font-mono tabular-nums",
          destacado ? "text-xl font-semibold" : "text-base text-ink-2",
        )}
      >
        {valor}
      </dd>
    </div>
  );
}

function Campo({
  etiqueta,
  id,
  ayuda,
  children,
}: {
  etiqueta: string;
  id: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-s1">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wide text-ink-2">
        {etiqueta}
      </label>
      {children}
      {ayuda ? <span className="text-sm text-ink-3">{ayuda}</span> : null}
    </div>
  );
}

function Linea({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-s3",
        destacado && "border-t border-warn pt-s1 font-semibold",
      )}
    >
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
