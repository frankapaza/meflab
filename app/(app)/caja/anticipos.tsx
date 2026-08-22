"use client";

import { useActionState, useState } from "react";

import { repartirPago } from "@/lib/validaciones/facturacion";

import { aplicarAnticipo, type Resultado } from "./acciones";
import type { DeudaCliente } from "./controles";

const INICIAL: Resultado = { ok: false, mensaje: null };

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

export type Anticipo = {
  id: string;
  clienteId: string;
  cliente: string;
  fecha: string;
  medio: string;
  sinAplicar: number;
  observaciones: string | null;
};

/**
 * Saldo a favor pendiente de imputar.
 *
 * Existir sin verse es la peor combinación: el laboratorio tiene dinero
 * del cliente, el cliente cree que ya pagó, y la factura sigue figurando
 * impagada. Esta lista es lo que evita esa conversación.
 */
export function Anticipos({
  anticipos,
  deudas,
}: {
  anticipos: Anticipo[];
  deudas: DeudaCliente[];
}) {
  if (anticipos.length === 0) {
    return (
      <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
        Ningún cliente tiene saldo a favor. Aparece aquí cuando alguien paga
        de más, o cuando una nota de crédito supera lo que debía.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-s3">
      {anticipos.map((a) => (
        <Fila key={a.id} anticipo={a} deudas={deudas} />
      ))}
    </ul>
  );
}

function Fila({ anticipo, deudas }: { anticipo: Anticipo; deudas: DeudaCliente[] }) {
  const [estado, accion, enviando] = useActionState(aplicarAnticipo, INICIAL);
  const [abierto, setAbierto] = useState(false);

  const suyas = deudas.filter((d) => d.clienteId === anticipo.clienteId);

  // Se reparte contra lo más antiguo primero, igual que un cobro nuevo.
  // Que el dinero venga de un anticipo no cambia qué deuda conviene saldar.
  const reparto = repartirPago(anticipo.sinAplicar, suyas);
  const aplicado = reparto.reduce((s, r) => s + r.importe, 0);
  const sobra = Math.round((anticipo.sinAplicar - aplicado) * 100) / 100;

  const carga = reparto.map((r) => ({
    cuentaCobrarId: r.cuentaCobrarId,
    importe: r.importe,
  }));

  return (
    <li className="flex flex-col gap-s2 rounded-r1 border border-line bg-card-2 p-s3">
      <div className="flex flex-wrap items-baseline justify-between gap-s3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-medium">{anticipo.cliente}</span>
          <span className="font-mono text-xs text-ink-3">
            {fecha.format(new Date(`${anticipo.fecha}T12:00:00`))} · {anticipo.medio}
          </span>
        </div>
        <span className="font-mono text-lg font-semibold tabular-nums text-ok">
          {soles.format(anticipo.sinAplicar)}
        </span>
      </div>

      {anticipo.observaciones ? (
        <p className="text-sm leading-relaxed text-ink-3">{anticipo.observaciones}</p>
      ) : null}

      {suyas.length === 0 ? (
        <p className="text-sm text-ink-3">
          No tiene ninguna factura abierta a la que aplicarlo. Queda a su
          favor para la próxima.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="self-start font-mono text-xs uppercase tracking-wide text-acc hover:underline"
          >
            {abierto ? "Ocultar" : `Ver cómo se aplicaría · ${reparto.length} documento(s)`}
          </button>

          {abierto ? (
            <dl className="flex flex-col gap-s1 rounded-r1 border border-line bg-card p-s2">
              {reparto.map((r) => {
                const deuda = suyas.find((d) => d.cuentaCobrarId === r.cuentaCobrarId);
                return (
                <div
                  key={r.cuentaCobrarId}
                  className="flex items-baseline justify-between gap-s3 text-sm"
                >
                  <dt className="font-mono">
                    {deuda?.documento ?? "—"}
                    {(deuda?.diasMora ?? 0) > 0 ? (
                      <span className="ml-s2 text-warn">
                        <span aria-hidden="true">▲</span> {deuda!.diasMora} d
                      </span>
                    ) : null}
                  </dt>
                  <dd className="font-mono tabular-nums">{soles.format(r.importe)}</dd>
                </div>
                );
              })}
              {sobra > 0 ? (
                <p className="border-t border-line pt-s1 text-sm text-ink-3">
                  Sobran {soles.format(sobra)}: siguen a su favor.
                </p>
              ) : null}
            </dl>
          ) : null}

          {estado.mensaje && !estado.ok ? (
            <p
              role="status"
              className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err"
            >
              {estado.mensaje}
            </p>
          ) : null}

          <form action={accion} className="self-start">
            <input type="hidden" name="pagoId" value={anticipo.id} />
            <input type="hidden" name="aplicaciones" value={JSON.stringify(carga)} />
            <button
              disabled={enviando || carga.length === 0}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Aplicando…" : `Aplicar ${soles.format(aplicado)}`}
            </button>
          </form>
        </>
      )}
    </li>
  );
}
