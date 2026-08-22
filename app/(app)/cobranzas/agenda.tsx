"use client";

import { useActionState } from "react";

import { cerrarPromesa, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const fecha = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Lima",
});

export type Promesa = {
  id: string;
  fechaPrometida: string;
  importe: number;
  cliente: string;
};

/**
 * La agenda del día: promesas vigentes ordenadas por fecha.
 *
 * Lo que la hace útil no es la lista, es la separación entre «para hoy o
 * antes» y «más adelante». Una agenda que lo mezcla todo obliga a leerla
 * entera cada mañana, y una agenda que hay que leer entera no se lee.
 */
export function Agenda({ promesas, hoy }: { promesas: Promesa[]; hoy: string }) {
  const vencidas = promesas.filter((p) => p.fechaPrometida <= hoy);
  const futuras = promesas.filter((p) => p.fechaPrometida > hoy);

  if (promesas.length === 0) {
    return (
      <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
        No hay compromisos de pago vigentes. Aparecen aquí cuando una
        gestión termina en «Prometió pagar».
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-s4">
      {vencidas.length > 0 ? (
        <section className="flex flex-col gap-s2">
          <h3 className="font-mono text-xs uppercase tracking-wide text-warn">
            <span aria-hidden="true">▲</span> Toca hoy o ya pasó ·{" "}
            {vencidas.length}
          </h3>
          <ul className="flex flex-col gap-s2">
            {vencidas.map((p) => (
              <Fila key={p.id} promesa={p} urgente />
            ))}
          </ul>
        </section>
      ) : null}

      {futuras.length > 0 ? (
        <section className="flex flex-col gap-s2">
          <h3 className="font-mono text-xs uppercase tracking-wide text-ink-3">
            Más adelante · {futuras.length}
          </h3>
          <ul className="flex flex-col gap-s2">
            {futuras.map((p) => (
              <Fila key={p.id} promesa={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Fila({ promesa, urgente }: { promesa: Promesa; urgente?: boolean }) {
  const [, accion, enviando] = useActionState(cerrarPromesa, INICIAL);

  return (
    <li
      className={`flex flex-wrap items-center gap-s3 rounded-r1 border p-s3 ${
        urgente ? "border-warn bg-warn-bg" : "border-line bg-card-2"
      }`}
    >
      <span
        className={`font-mono text-sm tabular-nums ${urgente ? "text-warn" : "text-ink-2"}`}
      >
        <span aria-hidden="true">{urgente ? "▲" : "◆"}</span>{" "}
        {fecha.format(new Date(`${promesa.fechaPrometida}T12:00:00`))}
      </span>

      <span className="min-w-[160px] flex-1 truncate text-sm">{promesa.cliente}</span>

      <span className="font-mono text-sm font-semibold tabular-nums">
        {soles.format(promesa.importe)}
      </span>

      {/* Dos salidas explícitas. Una promesa que se queda «vigente» para
          siempre deja de significar nada. */}
      <div className="flex gap-s2">
        <form action={accion}>
          <input type="hidden" name="promesaId" value={promesa.id} />
          <input type="hidden" name="cumplida" value="1" />
          <button
            disabled={enviando}
            className="h-[28px] rounded-r1 border border-line bg-card px-s2 text-sm text-ink transition hover:border-ok hover:text-ok disabled:opacity-50"
          >
            Cumplió
          </button>
        </form>
        <form action={accion}>
          <input type="hidden" name="promesaId" value={promesa.id} />
          <input type="hidden" name="cumplida" value="0" />
          <button
            disabled={enviando}
            className="h-[28px] rounded-r1 border border-line bg-card px-s2 text-sm text-ink transition hover:border-err hover:text-err disabled:opacity-50"
          >
            No cumplió
          </button>
        </form>
      </div>
    </li>
  );
}
