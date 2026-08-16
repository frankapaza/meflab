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
import { cn } from "@/lib/utils";

import { guardarLista, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type ListaEditable = {
  id: string;
  nombre: string;
  preciosIncluyenIgv: boolean;
  esDefault: boolean;
  servicios: number;
};

export function DialogoLista({
  lista,
  children,
}: {
  lista?: ListaEditable;
  children: React.ReactNode;
}) {
  const editando = Boolean(lista);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();
  const refNombre = useRef<HTMLInputElement>(null);

  const [c, setC] = useState({
    nombre: lista?.nombre ?? "",
    conIgv: lista?.preciosIncluyenIgv ?? false,
    esDefault: lista?.esDefault ?? false,
  });

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarLista(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const cambiaModo = editando && c.conIgv !== lista!.preciosIncluyenIgv;
  const quitaDefecto = editando && lista!.esDefault && !c.esDefault;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          refNombre.current?.focus();
        }}
        className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[540px]"
      >
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? lista!.nombre : "Nueva lista de precios"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            Una lista es una tarifa pactada. Cada cliente puede tener la suya;
            quien no tenga ninguna usa la lista por defecto.
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {editando ? <input type="hidden" name="listaId" value={lista!.id} /> : null}
          <input type="hidden" name="preciosIncluyenIgv" value={c.conIgv ? "1" : "0"} />
          <input type="hidden" name="esDefault" value={c.esDefault ? "1" : "0"} />

          <div className="flex min-w-0 flex-col gap-s1">
            <label
              htmlFor={`${idForm}-n`}
              className="font-mono text-xs uppercase tracking-wide text-ink-2"
            >
              Nombre *
            </label>
            <input
              ref={refNombre}
              id={`${idForm}-n`}
              name="nombre"
              required
              minLength={3}
              value={c.nombre}
              onChange={(e) => setC((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Convenio Clínica Sonrisa Plena"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
            />
          </div>

          <fieldset className="flex flex-col gap-s2">
            <legend className="pb-s1 font-mono text-xs uppercase tracking-wide text-ink-2">
              Cómo se capturan sus precios *
            </legend>
            <div className="grid gap-s2 sm:grid-cols-2">
              <Opcion
                activo={!c.conIgv}
                onClick={() => setC((p) => ({ ...p, conIgv: false }))}
                titulo="Sin IGV"
                ayuda="Se teclea el valor de venta. Es lo habitual en un tarifario de laboratorio."
              />
              <Opcion
                activo={c.conIgv}
                onClick={() => setC((p) => ({ ...p, conIgv: true }))}
                titulo="Con IGV incluido"
                ayuda="Se teclea el precio «a todo costo» que se pactó con el cliente. MEFLAB le quita el IGV al guardar."
              />
            </div>
          </fieldset>

          {cambiaModo ? (
            <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm leading-relaxed text-warn">
              Cambiar el modo <b className="font-semibold">no cambia lo que vale cada
              servicio</b>: lo almacenado sigue siendo el mismo valor de venta.
              Lo que cambia es la cifra que verás
              {c.conIgv ? " —subirá un 18 %—" : " —bajará un 18 %—"} y en la que
              teclearás a partir de ahora.
              {lista!.servicios > 0
                ? ` Esta lista tiene ${lista!.servicios} ${lista!.servicios === 1 ? "servicio" : "servicios"} con precio propio.`
                : ""}
            </p>
          ) : null}

          <label className="flex cursor-pointer items-start gap-s3 rounded-r1 border border-line bg-card-2 p-s3">
            <input
              type="checkbox"
              checked={c.esDefault}
              onChange={(e) => setC((p) => ({ ...p, esDefault: e.target.checked }))}
              className="mt-[3px] size-[16px] accent-acc"
            />
            <span className="flex flex-col gap-s1">
              <span className="text-base font-medium">Es la lista por defecto</span>
              <span className="text-sm leading-relaxed text-ink-2">
                La que se aplica a un cliente que no tiene ninguna asignada, y la
                que decide en qué modo se captura el precio base del catálogo.
                Sólo puede haber una: al marcar ésta, la anterior deja de serlo.
              </span>
            </span>
          </label>

          {quitaDefecto ? (
            <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
              Desmarcar esto dejaría al laboratorio sin lista por defecto. Marca
              otra como predeterminada en su lugar.
            </p>
          ) : null}

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
              disabled={enviando || c.nombre.trim().length < 3 || quitaDefecto}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear lista"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Opcion({
  activo,
  onClick,
  titulo,
  ayuda,
}: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  ayuda: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-s1 rounded-r1 border p-s3 text-left transition",
        activo ? "border-acc bg-acc-bg" : "border-line bg-card-2 hover:border-line-2",
      )}
    >
      <span className={cn("text-base font-medium", activo && "text-acc")}>{titulo}</span>
      <span className="text-sm leading-relaxed text-ink-2">{ayuda}</span>
    </button>
  );
}
