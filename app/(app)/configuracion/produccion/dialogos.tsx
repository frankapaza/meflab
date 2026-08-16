"use client";

import { useActionState, useId, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { horasLegibles } from "@/lib/validaciones/produccion";

import { guardarFlujo, guardarProceso, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type ProcesoEditable = {
  id: string;
  codigo: string;
  nombre: string;
  horasEstimadas: number;
  activo: boolean;
};

export function DialogoProceso({
  proceso,
  children,
}: {
  proceso?: ProcesoEditable;
  children: React.ReactNode;
}) {
  const editando = Boolean(proceso);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();
  const refCodigo = useRef<HTMLInputElement>(null);

  const [c, setC] = useState({
    codigo: proceso?.codigo ?? "",
    nombre: proceso?.nombre ?? "",
    horas: String(proceso?.horasEstimadas ?? ""),
  });

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarProceso(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const horas = Number(c.horas);
  const horasValidas = c.horas !== "" && Number.isFinite(horas) && horas >= 0;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          refCodigo.current?.focus();
        }}
        className="gap-0 p-0 sm:max-w-[520px]"
      >
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? proceso!.nombre : "Nuevo proceso"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            Un proceso es un paso del taller. Las horas estimadas son lo que
            sostiene la carga por técnico y el semáforo de fechas.
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {editando ? (
            <>
              <input type="hidden" name="procesoId" value={proceso!.id} />
              <input type="hidden" name="activo" value={proceso!.activo ? "1" : "0"} />
            </>
          ) : (
            <input type="hidden" name="activo" value="1" />
          )}

          <div className="grid gap-s3 sm:grid-cols-[150px_1fr]">
            <Campo etiqueta="Código *" id={`${idForm}-c`}>
              <input
                ref={refCodigo}
                id={`${idForm}-c`}
                name="codigo"
                required
                value={c.codigo}
                onChange={(e) => setC((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="FRESADO"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base uppercase outline-none placeholder:text-ink-3 focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Nombre *" id={`${idForm}-n`}>
              <input
                id={`${idForm}-n`}
                name="nombre"
                required
                minLength={3}
                value={c.nombre}
                onChange={(e) => setC((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Fresado / sinterizado"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
              />
            </Campo>
          </div>

          <Campo
            etiqueta="Horas estimadas *"
            id={`${idForm}-h`}
            ayuda={
              horasValidas && horas > 0
                ? `${horasLegibles(horas)} por pieza.`
                : "En horas: 1.5 son una hora y media."
            }
          >
            <input
              id={`${idForm}-h`}
              name="horasEstimadas"
              type="number"
              required
              min={0}
              max={80}
              step="0.25"
              value={c.horas}
              onChange={(e) => setC((p) => ({ ...p, horas: e.target.value }))}
              className="h-[38px] w-[160px] rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
            />
          </Campo>

          {estado.mensaje && !estado.ok ? (
            <p role="alert" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter className="gap-s2 border-t border-line pt-s4">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                enviando ||
                c.codigo.trim().length < 2 ||
                c.nombre.trim().length < 3 ||
                !horasValidas
              }
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear proceso"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type FlujoEditable = { id: string; nombre: string; activo: boolean };

export function DialogoFlujo({
  flujo,
  children,
}: {
  flujo?: FlujoEditable;
  children: React.ReactNode;
}) {
  const editando = Boolean(flujo);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();
  const refNombre = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState(flujo?.nombre ?? "");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarFlujo(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          refNombre.current?.focus();
        }}
        className="gap-0 p-0 sm:max-w-[500px]"
      >
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? flujo!.nombre : "Nuevo flujo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            Un flujo es la receta de un tipo de trabajo: qué pasos lleva y en
            qué orden. Se asigna a los servicios que lo siguen.
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {editando ? (
            <>
              <input type="hidden" name="flujoId" value={flujo!.id} />
              <input type="hidden" name="activo" value={flujo!.activo ? "1" : "0"} />
            </>
          ) : (
            <input type="hidden" name="activo" value="1" />
          )}

          <Campo etiqueta="Nombre del flujo *" id={`${idForm}-n`}>
            <input
              ref={refNombre}
              id={`${idForm}-n`}
              name="nombre"
              required
              minLength={3}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Corona de zirconio (CAD-CAM)"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
            />
          </Campo>

          {estado.mensaje && !estado.ok ? (
            <p role="alert" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter className="gap-s2 border-t border-line pt-s4">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || nombre.trim().length < 3}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear flujo"}
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
