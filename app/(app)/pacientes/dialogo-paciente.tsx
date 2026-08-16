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
import { validarDocumento } from "@/lib/validaciones/documento";
import { edadEnAnios } from "@/lib/validaciones/paciente";
import { cn } from "@/lib/utils";

import { guardarPaciente, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type PacienteEditable = {
  id: string;
  nombre: string;
  simplificado: boolean;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
};

export function DialogoPaciente({
  paciente,
  children,
}: {
  paciente?: PacienteEditable;
  children: React.ReactNode;
}) {
  const editando = Boolean(paciente);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();
  const refNombre = useRef<HTMLInputElement>(null);

  // Controlados: React reinicia el formulario tras cada acción, y con
  // `defaultValue` se perdería todo lo tecleado al fallar el guardado.
  const [c, setC] = useState({
    ficha: (paciente?.simplificado === false ? "completa" : "simplificada") as
      | "simplificada"
      | "completa",
    nombre: paciente?.nombre ?? "",
    tipoDocumento: paciente?.tipoDocumento ?? "DNI",
    numeroDocumento: paciente?.numeroDocumento ?? "",
    fechaNacimiento: paciente?.fechaNacimiento ?? "",
  });
  const set = (k: keyof typeof c, v: string) => setC((p) => ({ ...p, [k]: v }));

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarPaciente(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const completa = c.ficha === "completa";
  const doc = completa && c.numeroDocumento
    ? validarDocumento(c.tipoDocumento, c.numeroDocumento)
    : null;
  const edad = completa ? edadEnAnios(c.fechaNacimiento || null) : null;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Sin esto el foco cae en el primer botón, que es el selector de
          ficha: pulsar espacio sin mirar cambiaría el tipo y borraría el
          documento. El nombre es lo que se teclea siempre. */}
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          refNombre.current?.focus();
        }}
        className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[540px]"
      >
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? paciente!.nombre : "Nuevo paciente"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            El paciente llega en la orden de su odontólogo. Su documento sólo
            lo ven Recepción, Administrador y Gerencia.
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {editando ? (
            <input type="hidden" name="pacienteId" value={paciente!.id} />
          ) : null}
          <input type="hidden" name="ficha" value={c.ficha} />

          <fieldset className="flex flex-col gap-s2">
            <legend className="pb-s1 font-mono text-xs uppercase tracking-wide text-ink-2">
              Tipo de ficha *
            </legend>
            <div className="grid gap-s2 sm:grid-cols-2">
              <Opcion
                activo={!completa}
                onClick={() => set("ficha", "simplificada")}
                titulo="Simplificada"
                ayuda="Sólo el nombre. Es lo normal en el mostrador: el doctor manda el trabajo sin el documento del paciente."
              />
              <Opcion
                activo={completa}
                onClick={() => set("ficha", "completa")}
                titulo="Completa"
                ayuda="Con documento y fecha de nacimiento. Hace falta si el paciente va a figurar en un comprobante."
              />
            </div>
          </fieldset>

          <Campo etiqueta="Nombre del paciente *" id={`${idForm}-n`}>
            <input
              ref={refNombre}
              id={`${idForm}-n`}
              name="nombre"
              required
              minLength={2}
              value={c.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Lucía Mendoza Ríos"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
            />
          </Campo>

          {completa ? (
            <fieldset className="flex flex-col gap-s3 rounded-r1 border border-line bg-card-2 p-s3">
              <legend className="px-s1 font-mono text-xs uppercase tracking-wide text-ink-3">
                Datos de identificación
              </legend>

              <div className="grid gap-s3 sm:grid-cols-[150px_1fr]">
                <Campo etiqueta="Documento *" id={`${idForm}-td`}>
                  <select
                    id={`${idForm}-td`}
                    name="tipoDocumento"
                    value={c.tipoDocumento}
                    onChange={(e) => set("tipoDocumento", e.target.value)}
                    className="h-[38px] w-full rounded-r1 border border-line bg-card px-s2 text-base outline-none"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">Carné de extranjería</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </Campo>
                <Campo etiqueta="Número *" id={`${idForm}-nd`}>
                  <input
                    id={`${idForm}-nd`}
                    name="numeroDocumento"
                    required
                    value={c.numeroDocumento}
                    onChange={(e) => set("numeroDocumento", e.target.value)}
                    className={cn(
                      "h-[38px] w-full rounded-r1 border bg-card px-s3 font-mono text-base outline-none",
                      doc && !doc.ok ? "border-err" : doc?.ok ? "border-ok" : "border-line",
                    )}
                  />
                  {doc && !doc.ok ? (
                    <span className="text-sm text-err">{doc.motivo}</span>
                  ) : null}
                </Campo>
              </div>

              <Campo
                etiqueta="Fecha de nacimiento"
                id={`${idForm}-fn`}
                ayuda={
                  edad !== null
                    ? `${edad} años cumplidos.`
                    : "Opcional. La edad orienta el tipo de trabajo."
                }
              >
                <input
                  id={`${idForm}-fn`}
                  name="fechaNacimiento"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={c.fechaNacimiento}
                  onChange={(e) => set("fechaNacimiento", e.target.value)}
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 font-mono text-base outline-none"
                />
              </Campo>
            </fieldset>
          ) : (
            <p className="rounded-r1 border border-line border-l-2 border-l-acc bg-card-2 px-s3 py-s2 text-sm leading-relaxed text-ink-2">
              Con la ficha simplificada la orden se registra igual. Se puede
              completar después, cuando el doctor mande el documento.
            </p>
          )}

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
              disabled={enviando || c.nombre.trim().length < 2 || (completa && !doc?.ok)}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar paciente"}
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
