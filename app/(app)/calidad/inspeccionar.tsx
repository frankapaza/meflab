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
import { RESULTADOS } from "@/lib/dominio/calidad";
import { cn } from "@/lib/utils";

import { registrarInspeccion, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type ChecklistOpcion = {
  id: string;
  nombre: string;
  servicioId: string | null;
  puntos: { id: string; descripcion: string; critico: boolean }[];
};

export type OrdenInspeccionable = {
  id: string;
  codigo: string;
  cliente: string;
  estado: string;
  trabajo: string;
  servicioIds: string[];
};

export function Inspeccionar({
  ordenes,
  checklists,
}: {
  ordenes: OrdenInspeccionable[];
  checklists: ChecklistOpcion[];
}) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [ordenId, setOrdenId] = useState("");
  const [checklistId, setChecklistId] = useState("");
  const [conformes, setConformes] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await registrarInspeccion(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setConformes({});
        setObservaciones("");
        setOrdenId("");
      }
      return r;
    },
    INICIAL,
  );

  const orden = ordenes.find((o) => o.id === ordenId);

  // El checklist del servicio si existe; si no, el genérico. Así ningún
  // trabajo se queda sin revisar por un hueco de configuración.
  const sugerido =
    checklists.find(
      (c) => c.servicioId && orden?.servicioIds.includes(c.servicioId),
    ) ?? checklists.find((c) => c.servicioId === null);

  const checklist = checklists.find((c) => c.id === checklistId) ?? sugerido;
  const puntos = checklist?.puntos ?? [];

  // El veredicto se calcula igual que en la base, y se enseña ANTES de
  // guardar. No es la fuente de verdad: es para que nadie pulse
  // «registrar» sin saber que está rechazando un trabajo.
  const marcados = puntos.filter((p) => p.id in conformes);
  const falloCritico = puntos.some((p) => conformes[p.id] === false && p.critico);
  const falloLeve = puntos.some((p) => conformes[p.id] === false && !p.critico);
  const veredicto = falloCritico ? "rechazado" : falloLeve ? "observado" : "aprobado";
  const r = RESULTADOS[veredicto];

  const todosMarcados = puntos.length > 0 && marcados.length === puntos.length;
  const faltaMotivo = falloCritico && observaciones.trim().length < 5;
  const listo = Boolean(ordenId && checklist) && todosMarcados && !faltaMotivo;

  const carga = puntos.map((p) => ({
    puntoId: p.id,
    descripcion: p.descripcion,
    critico: p.critico,
    conforme: conformes[p.id] ?? true,
  }));

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
          Inspeccionar un trabajo
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] max-w-[640px] overflow-y-auto">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="ordenId" value={ordenId} />
          <input type="hidden" name="checklistId" value={checklist?.id ?? ""} />
          <input type="hidden" name="observaciones" value={observaciones} />
          <input type="hidden" name="puntos" value={JSON.stringify(carga)} />

          <DialogHeader>
            <DialogTitle>Control de calidad</DialogTitle>
            <DialogDescription>
              Marca cada punto. El veredicto lo decide el checklist, no tú.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Trabajo *" id={`${idForm}-ot`}>
              <select
                id={`${idForm}-ot`}
                value={ordenId}
                onChange={(e) => {
                  setOrdenId(e.target.value);
                  setChecklistId("");
                  setConformes({});
                }}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Elige el trabajo…</option>
                {ordenes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.codigo} · {o.trabajo}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              etiqueta="Checklist"
              id={`${idForm}-chk`}
              ayuda={
                checklist?.servicioId
                  ? "El del servicio de este trabajo."
                  : "El genérico: este servicio no tiene el suyo."
              }
            >
              <select
                id={`${idForm}-chk`}
                value={checklist?.id ?? ""}
                onChange={(e) => {
                  setChecklistId(e.target.value);
                  setConformes({});
                }}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                {checklists.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {orden ? (
            <p className="text-sm text-ink-3">
              {orden.cliente} · estado {orden.estado}
            </p>
          ) : null}

          {puntos.length > 0 ? (
            <section className="flex flex-col gap-s2">
              <div className="flex flex-wrap items-baseline justify-between gap-s3">
                <h3 className="font-mono text-xs uppercase tracking-wide text-ink-2">
                  Puntos a revisar
                </h3>
                <span className="font-mono text-xs text-ink-3">
                  {marcados.length} de {puntos.length} marcados
                </span>
              </div>

              <ul className="flex flex-col gap-s2">
                {puntos.map((p) => {
                  const valor = conformes[p.id];
                  return (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-s3 rounded-r1 border border-line bg-card-2 p-s3"
                    >
                      <span className="min-w-[200px] flex-1">
                        <span className="text-base">{p.descripcion}</span>
                        {/* El punto crítico se marca aquí, no sólo en la
                            configuración: quien inspecciona tiene que
                            saber que ese fallo rechaza el trabajo. */}
                        {p.critico ? (
                          <span className="ml-s2 font-mono text-xs uppercase text-warn">
                            <span aria-hidden="true">▲</span> crítico
                          </span>
                        ) : null}
                      </span>

                      <div className="flex gap-s2">
                        <button
                          type="button"
                          onClick={() => setConformes((c) => ({ ...c, [p.id]: true }))}
                          className={cn(
                            "h-[30px] rounded-r1 border px-s3 text-sm transition",
                            valor === true
                              ? "border-ok bg-ok-bg text-ok"
                              : "border-line bg-card text-ink hover:border-line-2",
                          )}
                        >
                          Conforme
                        </button>
                        <button
                          type="button"
                          onClick={() => setConformes((c) => ({ ...c, [p.id]: false }))}
                          className={cn(
                            "h-[30px] rounded-r1 border px-s3 text-sm transition",
                            valor === false
                              ? "border-err bg-err-bg text-err"
                              : "border-line bg-card text-ink hover:border-line-2",
                          )}
                        >
                          Falla
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* El veredicto, calculado, antes de guardar. */}
          {todosMarcados ? (
            <div
              className={cn(
                "flex flex-col gap-s1 rounded-r1 border p-s3",
                veredicto === "rechazado"
                  ? "border-err bg-err-bg"
                  : veredicto === "observado"
                    ? "border-warn bg-warn-bg"
                    : "border-ok bg-ok-bg",
              )}
            >
              <span className={`font-mono text-sm font-semibold uppercase ${r.clase}`}>
                <span aria-hidden="true">{r.glifo}</span> Quedará {r.etiqueta}
              </span>
              <span className={`text-sm leading-relaxed ${r.clase}`}>
                {veredicto === "rechazado"
                  ? "Falló un punto crítico. El trabajo no sale del laboratorio así."
                  : veredicto === "observado"
                    ? "Pasa, pero con una salvedad anotada que el doctor debería conocer."
                    : "Todos los puntos conformes."}
              </span>
            </div>
          ) : null}

          <Campo
            etiqueta={falloCritico ? "Qué falló *" : "Observaciones"}
            id={`${idForm}-obs`}
            ayuda={
              falloCritico
                ? "Sin esto, quien lo rehaga no sabrá qué corregir."
                : "Lo que el doctor debería saber al recibirlo."
            }
          >
            <textarea
              id={`${idForm}-obs`}
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="El ajuste marginal quedó alto en distal"
              className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
            />
          </Campo>

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
              disabled={enviando || !listo}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Registrando…" : "Registrar inspección"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
