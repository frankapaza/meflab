"use client";

import { useActionState, useId, useState } from "react";

import { MEDIOS_PAGO, anticipoDe, repartirPago } from "@/lib/validaciones/facturacion";
import { cn } from "@/lib/utils";

import {
  abrirCaja,
  cerrarCaja,
  registrarMovimiento,
  registrarPago,
  type Resultado,
} from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

/* ── abrir ──────────────────────────────────────────────────────────── */

export function AbrirCaja() {
  const [monto, setMonto] = useState("0");
  const [estado, accion, enviando] = useActionState(abrirCaja, INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-s3">
      <div className="flex flex-wrap items-end gap-s3">
        <div className="flex flex-col gap-s1">
          <label
            htmlFor="monto-apertura"
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Efectivo con el que se abre
          </label>
          <input
            id="monto-apertura"
            name="montoApertura"
            type="number"
            min={0}
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="h-[38px] w-[180px] rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:opacity-60"
        >
          {enviando ? "Abriendo…" : "Abrir caja"}
        </button>
      </div>
      {estado.mensaje && !estado.ok ? (
        <p role="alert" className="text-sm text-err">
          {estado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

/* ── arqueo ─────────────────────────────────────────────────────────── */

export function CerrarCaja({
  sesionId,
  teorico,
}: {
  sesionId: string;
  teorico: number;
}) {
  const [fisico, setFisico] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [estado, accion, enviando] = useActionState(cerrarCaja, INICIAL);

  const contado = Number(fisico);
  const valido = fisico !== "" && Number.isFinite(contado) && contado >= 0;
  // La diferencia se enseña ANTES de cerrar: si el cajero se equivocó al
  // contar, es el momento de volver a contar, no después de congelarla.
  const diferencia = valido ? Math.round((contado - teorico) * 100) / 100 : null;

  return (
    <form action={accion} className="flex flex-col gap-s3">
      <input type="hidden" name="sesionId" value={sesionId} />
      <input type="hidden" name="observaciones" value={observaciones} />

      <div className="grid gap-s3 sm:grid-cols-3">
        <Dato etiqueta="Debería haber" valor={soles.format(teorico)} />

        <div className="flex flex-col gap-s1">
          <label
            htmlFor="monto-fisico"
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Contado en el cajón *
          </label>
          <input
            id="monto-fisico"
            name="montoFisico"
            type="number"
            min={0}
            step="0.01"
            value={fisico}
            onChange={(e) => setFisico(e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
          />
        </div>

        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
            Diferencia
          </span>
          <span
            className={cn(
              "h-[38px] rounded-r1 border border-dashed border-line-2 px-s3 text-right font-mono text-base leading-[36px] tabular-nums",
              diferencia === null
                ? "text-ink-3"
                : diferencia === 0
                  ? "text-ok"
                  : "text-warn",
            )}
          >
            {diferencia === null ? "—" : soles.format(diferencia)}
          </span>
        </div>
      </div>

      {diferencia !== null && diferencia !== 0 ? (
        <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
          <span aria-hidden="true">▲</span>{" "}
          {diferencia > 0
            ? `Sobran ${soles.format(diferencia)}. Suele ser un cobro que no se registró.`
            : `Faltan ${soles.format(Math.abs(diferencia))}. Suele ser un gasto que no se anotó.`}{" "}
          Anótalo abajo antes de cerrar: la diferencia queda congelada.
        </p>
      ) : null}

      <div className="flex flex-col gap-s1">
        <label
          htmlFor="obs-cierre"
          className="font-mono text-xs uppercase tracking-wide text-ink-2"
        >
          Observaciones del cierre
        </label>
        <textarea
          id="obs-cierre"
          rows={2}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base outline-none focus-visible:border-acc"
        />
      </div>

      {estado.mensaje ? (
        <p
          role="status"
          className={cn("text-sm", estado.ok ? "text-ok" : "text-err")}
        >
          {estado.mensaje}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando || !valido}
        className="h-tap self-start rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3"
      >
        {enviando ? "Cerrando…" : "Cerrar caja con arqueo"}
      </button>
    </form>
  );
}

/* ── movimiento suelto ──────────────────────────────────────────────── */

export function NuevoMovimiento({ sesionId }: { sesionId: string }) {
  const idForm = useId();
  const [tipo, setTipo] = useState("egreso");
  const [categoria, setCategoria] = useState("gastos");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, fd: FormData) => {
      const r = await registrarMovimiento(previo, fd);
      if (r.ok) {
        setConcepto("");
        setImporte("");
      }
      return r;
    },
    INICIAL,
  );

  return (
    <form action={accion} className="flex flex-col gap-s3">
      <input type="hidden" name="sesionId" value={sesionId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="categoria" value={categoria} />

      <div className="flex flex-wrap items-end gap-s3">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
            Tipo
          </span>
          <div className="flex overflow-hidden rounded-r1 border border-line">
            {(["ingreso", "egreso"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                aria-pressed={tipo === t}
                className={cn(
                  "h-[38px] px-s3 text-sm capitalize transition",
                  tipo === t
                    ? "bg-acc font-semibold text-acc-on"
                    : "bg-card-2 text-ink-2 hover:bg-fill",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-s1">
          <label
            htmlFor={`${idForm}-cat`}
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Categoría
          </label>
          <select
            id={`${idForm}-cat`}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="h-[38px] w-[160px] rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          >
            <option value="cobranza">Cobranza</option>
            <option value="gastos">Gastos</option>
            <option value="movilidad">Movilidad</option>
            <option value="materiales">Materiales</option>
            <option value="otros">Otros</option>
          </select>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-s1">
          <label
            htmlFor={`${idForm}-con`}
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Concepto *
          </label>
          <input
            id={`${idForm}-con`}
            name="concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Taxi para entrega en San Isidro"
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
          />
        </div>

        <div className="flex flex-col gap-s1">
          <label
            htmlFor={`${idForm}-imp`}
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Importe *
          </label>
          <input
            id={`${idForm}-imp`}
            name="importe"
            type="number"
            min={0.01}
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className="h-[38px] w-[130px] rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
          />
        </div>

        <button
          type="submit"
          disabled={enviando || concepto.trim().length < 3 || !importe}
          className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill disabled:cursor-not-allowed disabled:text-ink-3"
        >
          {enviando ? "…" : "Registrar"}
        </button>
      </div>

      {estado.mensaje && !estado.ok ? (
        <p role="alert" className="text-sm text-err">
          {estado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

/* ── cobrar ─────────────────────────────────────────────────────────── */

export type DeudaCliente = {
  cuentaCobrarId: string;
  clienteId: string;
  documento: string;
  saldo: number;
  diasMora: number;
};

export function RegistrarPago({
  clientes,
  deudas,
  sesionCaja,
}: {
  clientes: { id: string; razonSocial: string }[];
  deudas: DeudaCliente[];
  sesionCaja: string | null;
}) {
  const idForm = useId();
  const [clienteId, setClienteId] = useState("");
  const [importe, setImporte] = useState("");
  const [medio, setMedio] = useState("efectivo");
  const [referencia, setReferencia] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, fd: FormData) => {
      const r = await registrarPago(previo, fd);
      if (r.ok) {
        setImporte("");
        setReferencia("");
      }
      return r;
    },
    INICIAL,
  );

  const suyas = deudas.filter((d) => d.clienteId === clienteId);
  const monto = Number(importe) || 0;

  // Se reparte de la deuda más antigua a la más nueva. Imputar a la más
  // reciente dejaría envejeciendo una factura ya pagada de hecho, y el
  // cliente entraría en un tramo de mora que no le toca.
  const reparto = repartirPago(monto, suyas);
  const anticipo = anticipoDe(monto, reparto);

  const enCaja = medio === "efectivo";
  const listo = Boolean(clienteId) && monto > 0;

  return (
    <form action={accion} className="flex flex-col gap-s3">
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="medio" value={medio} />
      <input type="hidden" name="referencia" value={referencia} />
      <input type="hidden" name="sesionCaja" value={sesionCaja ?? ""} />
      <input
        type="hidden"
        name="aplicaciones"
        value={JSON.stringify(reparto)}
      />

      <div className="grid gap-s3 lg:grid-cols-4">
        <div className="flex flex-col gap-s1 lg:col-span-2">
          <label
            htmlFor={`${idForm}-cli`}
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Cliente que paga *
          </label>
          <select
            id={`${idForm}-cli`}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          >
            <option value="">Elige un cliente…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-s1">
          <label
            htmlFor={`${idForm}-imp`}
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Importe *
          </label>
          <input
            id={`${idForm}-imp`}
            name="importe"
            type="number"
            min={0.01}
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
          />
        </div>

        <div className="flex flex-col gap-s1">
          <label
            htmlFor={`${idForm}-med`}
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Medio *
          </label>
          <select
            id={`${idForm}-med`}
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          >
            {MEDIOS_PAGO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!enCaja ? (
        <div className="flex flex-col gap-s1">
          <label
            htmlFor={`${idForm}-ref`}
            className="font-mono text-xs uppercase tracking-wide text-ink-2"
          >
            Número de operación
          </label>
          <input
            id={`${idForm}-ref`}
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Sin esto no se puede conciliar con el banco"
            className="h-[38px] w-full max-w-[380px] rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base outline-none placeholder:font-sans placeholder:text-sm placeholder:text-ink-3 focus-visible:border-acc"
          />
        </div>
      ) : null}

      {clienteId && monto > 0 ? (
        <div className="flex flex-col gap-s2 rounded-r1 border border-line bg-card-2 p-s3">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
            Cómo se va a aplicar
          </span>
          {reparto.length === 0 ? (
            <p className="text-sm text-ink-2">
              Este cliente no tiene deuda pendiente.
            </p>
          ) : (
            <ul className="flex flex-col gap-s1">
              {reparto.map((r) => {
                const d = suyas.find((x) => x.cuentaCobrarId === r.cuentaCobrarId)!;
                return (
                  <li
                    key={r.cuentaCobrarId}
                    className="flex flex-wrap items-baseline justify-between gap-s2 text-sm"
                  >
                    <span className="text-ink-2">
                      <span className="font-mono">{d.documento}</span>
                      {d.diasMora > 0 ? (
                        <span className="ml-s2 font-mono text-xs text-warn">
                          ▲ {d.diasMora} d de mora
                        </span>
                      ) : null}
                    </span>
                    <span className="font-mono tabular-nums">
                      {soles.format(r.importe)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {anticipo > 0 ? (
            <p className="border-t border-line pt-s2 text-sm text-ink-2">
              <b className="font-semibold text-ink">{soles.format(anticipo)}</b>{" "}
              quedan como <b className="font-semibold text-ink">saldo a favor</b>{" "}
              del cliente. Un anticipo no es deuda: no suma a la cartera.
            </p>
          ) : null}

          <p className="text-sm text-ink-3">
            Se paga primero lo más antiguo. Imputarlo a la factura más reciente
            dejaría envejeciendo una deuda que en realidad ya está cubierta.
          </p>
        </div>
      ) : null}

      {enCaja && !sesionCaja ? (
        <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
          <span aria-hidden="true">▲</span> No hay caja abierta, así que este
          cobro en efectivo no entrará al arqueo. Ábrela primero si quieres que
          cuadre.
        </p>
      ) : null}

      {estado.mensaje ? (
        <p
          role="status"
          className={cn("text-sm", estado.ok ? "text-ok" : "text-err")}
        >
          {estado.mensaje}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando || !listo}
        className="h-tap self-start rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3"
      >
        {enviando ? "Registrando…" : "Registrar pago"}
      </button>
    </form>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-s1">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
        {etiqueta}
      </span>
      <span className="h-[38px] rounded-r1 border border-line bg-fill px-s3 text-right font-mono text-base leading-[36px] tabular-nums text-ink-2">
        {valor}
      </span>
    </div>
  );
}
