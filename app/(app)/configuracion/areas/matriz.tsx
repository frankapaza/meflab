"use client";

import { useActionState, useId, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  fijarExigencia,
  fijarNivel,
  guardarCompetencia,
  type Resultado,
} from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

/**
 * Los tres niveles. Se nombran, no se numeran a secas: «nivel 2» no dice
 * nada, «autónomo» sí. El número queda para ordenar.
 */
export const NIVELES = [
  { valor: 1, etiqueta: "Aprendiz", ayuda: "Lo hace acompañado" },
  { valor: 2, etiqueta: "Autónomo", ayuda: "Lo hace solo" },
  { valor: 3, etiqueta: "Referente", ayuda: "Enseña y resuelve lo difícil" },
] as const;

export type Competencia = { id: string; codigo: string; nombre: string };
export type Tecnico = { id: string; nombre: string };
export type Nivel = { usuarioId: string; competenciaId: string; nivel: number; acreditada: boolean };
export type Proceso = {
  id: string;
  codigo: string;
  nombre: string;
  competenciaId: string | null;
  nivelMinimo: number | null;
};

/**
 * La matriz competencia × técnico.
 *
 * Es una tabla y no un formulario por técnico a propósito: la pregunta
 * que se hace el líder no es «qué sabe Ana», es «quién sabe cerámica».
 * Una vista por persona obliga a abrir seis fichas para responderla.
 */
export function Matriz({
  competencias,
  tecnicos,
  niveles,
  puedeEditar,
}: {
  competencias: Competencia[];
  tecnicos: Tecnico[];
  niveles: Nivel[];
  puedeEditar: boolean;
}) {
  const [, accion, enviando] = useActionState(fijarNivel, INICIAL);

  const nivelDe = (usuarioId: string, competenciaId: string) =>
    niveles.find((n) => n.usuarioId === usuarioId && n.competenciaId === competenciaId);

  if (competencias.length === 0) {
    return (
      <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm leading-relaxed text-ink-3">
        Todavía no hay competencias declaradas. Mientras no las haya, la
        sugerencia de técnico ordena sólo por carga — que es lo que hoy se
        hace a mano, así que no se pierde nada por empezar sin ellas.
      </p>
    );
  }

  if (tecnicos.length === 0) {
    return (
      <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
        No hay técnicos activos a los que asignarles competencias.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
            <th className="px-s3 py-s2 font-medium">Competencia</th>
            {tecnicos.map((t) => (
              <th key={t.id} className="px-s3 py-s2 text-center font-medium">
                {t.nombre.split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {competencias.map((c) => (
            <tr key={c.id} className="border-b border-line last:border-0">
              <td className="px-s3 py-s3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-base">{c.nombre}</span>
                  <span className="font-mono text-xs text-ink-3">{c.codigo}</span>
                </div>
              </td>
              {tecnicos.map((t) => {
                const n = nivelDe(t.id, c.id);
                return (
                  <td key={t.id} className="px-s3 py-s3 text-center">
                    {puedeEditar ? (
                      <form action={accion} className="inline-flex">
                        <input type="hidden" name="usuarioId" value={t.id} />
                        <input type="hidden" name="competenciaId" value={c.id} />
                        <select
                          name="nivel"
                          defaultValue={String(n?.nivel ?? 0)}
                          disabled={enviando}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className={cn(
                            "h-[32px] rounded-r1 border px-s2 font-mono text-sm outline-none focus-visible:border-acc",
                            n
                              ? n.acreditada
                                ? "border-ok bg-ok-bg text-ok"
                                : "border-warn bg-warn-bg text-warn"
                              : "border-line bg-card-2 text-ink-3",
                          )}
                        >
                          <option value="0">—</option>
                          {NIVELES.map((x) => (
                            <option key={x.valor} value={x.valor}>
                              {x.valor} · {x.etiqueta}
                            </option>
                          ))}
                        </select>
                      </form>
                    ) : (
                      <span className="font-mono text-sm">
                        {n ? `${n.nivel}` : <span className="text-ink-3">—</span>}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-s3 text-sm leading-relaxed text-ink-3">
        <span className="text-ok">Verde</span> = acreditada por quien la fijó.{" "}
        <span className="text-warn">Ámbar</span> = declarada sin respaldo
        (AC‑01 §8): puede ser cierta, pero es la que conviene revisar antes
        de darle el trabajo delicado.
      </p>
    </div>
  );
}

/* ── alta de competencia ──────────────────────────────────────────── */

export function NuevaCompetencia({ areaId }: { areaId: string }) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarCompetencia(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
          Nueva competencia
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[480px]">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="areaId" value={areaId} />

          <DialogHeader>
            <DialogTitle>Nueva competencia</DialogTitle>
            <DialogDescription>
              Algo que un técnico sabe hacer: cerámica estratificada,
              esqueléticos, diseño CAD. No es un puesto, es una habilidad.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-s3 sm:grid-cols-[140px_1fr]">
            <Campo etiqueta="Código *" id={`${idForm}-cod`}>
              <input
                id={`${idForm}-cod`}
                name="codigo"
                placeholder="CERAM"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base uppercase outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Nombre *" id={`${idForm}-nom`}>
              <input
                id={`${idForm}-nom`}
                name="nombre"
                placeholder="Cerámica estratificada"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          {estado.mensaje && !estado.ok ? (
            <p role="status" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3"
            >
              {enviando ? "Creando…" : "Crear"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── qué exige cada proceso ───────────────────────────────────────── */

export function Exigencias({
  procesos,
  competencias,
  puedeEditar,
}: {
  procesos: Proceso[];
  competencias: Competencia[];
  puedeEditar: boolean;
}) {
  const [, accion, enviando] = useActionState(fijarExigencia, INICIAL);

  if (procesos.length === 0) {
    return (
      <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
        No hay procesos configurados todavía.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {procesos.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center gap-s3 border-b border-line py-s3 last:border-0"
        >
          <div className="flex min-w-[180px] flex-1 flex-col">
            <span className="text-base">{p.nombre}</span>
            <span className="font-mono text-xs text-ink-3">{p.codigo}</span>
          </div>

          {puedeEditar ? (
            <form action={accion} className="flex flex-wrap items-center gap-s2">
              <input type="hidden" name="procesoId" value={p.id} />
              <select
                name="competenciaId"
                defaultValue={p.competenciaId ?? ""}
                disabled={enviando}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="h-[32px] rounded-r1 border border-line bg-card-2 px-s2 text-sm outline-none focus-visible:border-acc"
              >
                <option value="">No exige competencia</option>
                {competencias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <select
                name="nivelMinimo"
                defaultValue={String(p.nivelMinimo ?? 2)}
                disabled={enviando || !p.competenciaId}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="h-[32px] rounded-r1 border border-line bg-card-2 px-s2 font-mono text-sm outline-none focus-visible:border-acc disabled:opacity-40"
              >
                {NIVELES.map((n) => (
                  <option key={n.valor} value={n.valor}>
                    mín. {n.valor} · {n.etiqueta}
                  </option>
                ))}
              </select>
            </form>
          ) : (
            <span className="font-mono text-sm text-ink-2">
              {p.competenciaId
                ? `exige nivel ${p.nivelMinimo}`
                : "no exige competencia"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Campo({
  etiqueta,
  id,
  children,
}: {
  etiqueta: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-s1">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wide text-ink-2">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
