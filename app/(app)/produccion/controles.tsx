"use client";

import { useActionState } from "react";

import { horasLegibles } from "@/lib/validaciones/produccion";

import { asignarTarea, cambiarEstadoOrden, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type OpcionTecnico = { id: string; nombre: string; horas: number };

/**
 * Asignar una etapa a un técnico.
 *
 * El selector enseña la carga de cada uno al lado del nombre: sin eso,
 * "asignar según su carga" obliga a abrir otra pantalla y comparar de
 * memoria, y en la práctica se asigna siempre al mismo.
 */
export function SelectorTecnico({
  tareaId,
  tecnicoId,
  tecnicos,
  bloqueado,
}: {
  tareaId: string;
  tecnicoId: string | null;
  tecnicos: OpcionTecnico[];
  bloqueado: boolean;
}) {
  const [estado, accion, enviando] = useActionState(asignarTarea, INICIAL);

  if (bloqueado) {
    return (
      <span className="font-mono text-xs text-ink-3">
        {tecnicos.find((t) => t.id === tecnicoId)?.nombre ?? "—"}
      </span>
    );
  }

  return (
    <form action={accion} className="flex items-center gap-s2">
      <input type="hidden" name="tareaId" value={tareaId} />
      <select
        name="tecnicoId"
        defaultValue={tecnicoId ?? ""}
        disabled={enviando}
        aria-label="Técnico asignado"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-[32px] w-full min-w-[170px] rounded-r1 border border-line bg-card-2 px-s2 text-sm outline-none focus-visible:border-acc disabled:opacity-60"
      >
        <option value="">Sin asignar</option>
        {tecnicos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre} · {horasLegibles(t.horas)}
          </option>
        ))}
      </select>
      {estado.mensaje && !estado.ok ? (
        <span role="alert" className="text-xs text-err">
          {estado.mensaje}
        </span>
      ) : null}
    </form>
  );
}

export type OpcionEstado = { id: string; nombre: string; glifo: string };

export function SelectorEstado({
  ordenId,
  estadoId,
  estados,
}: {
  ordenId: string;
  estadoId: string;
  estados: OpcionEstado[];
}) {
  const [resultado, accion, enviando] = useActionState(cambiarEstadoOrden, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-s2">
      <input type="hidden" name="ordenId" value={ordenId} />
      <select
        name="estadoId"
        defaultValue={estadoId}
        disabled={enviando}
        aria-label="Estado de la orden"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-[32px] min-w-[190px] rounded-r1 border border-line bg-card-2 px-s2 text-sm outline-none focus-visible:border-acc disabled:opacity-60"
      >
        {estados.map((e) => (
          <option key={e.id} value={e.id}>
            {e.glifo} {e.nombre}
          </option>
        ))}
      </select>
      {resultado.mensaje && !resultado.ok ? (
        <span role="alert" className="text-xs text-err">
          {resultado.mensaje}
        </span>
      ) : null}
    </form>
  );
}
