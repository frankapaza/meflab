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
import { ESPECIALIDADES } from "@/lib/validaciones/doctor";
import { tipoContribuyente, validarDocumento } from "@/lib/validaciones/documento";
import { cn } from "@/lib/utils";

import { guardarDoctor, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type DoctorEditable = {
  id: string;
  clienteId: string;
  nombre: string;
  colegiatura: string | null;
  especialidad: string | null;
  email: string | null;
  telefono: string | null;
  sedeEntrega: string | null;
  cliente: string;
};

export type OpcionCliente = { id: string; razon_social: string; tipo: string };

export function DialogoDoctor({
  doctor,
  clientes,
  children,
}: {
  doctor?: DoctorEditable;
  clientes: OpcionCliente[];
  children: React.ReactNode;
}) {
  const editando = Boolean(doctor);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();
  const refNombre = useRef<HTMLInputElement>(null);

  const clinicas = clientes.filter((c) => c.tipo === "clinica");

  // Campos controlados: React reinicia el formulario tras cada acción y
  // con `defaultValue` se perdería todo lo tecleado al fallar el guardado.
  const [c, setC] = useState({
    // Sin ninguna clínica registrada, esa rama no se puede completar:
    // se arranca en la que sí funciona.
    vinculo: (clinicas.length > 0 ? "clinica" : "independiente") as
      | "clinica"
      | "independiente",
    clienteId: clinicas[0]?.id ?? "",
    nombre: doctor?.nombre ?? "",
    colegiatura: doctor?.colegiatura ?? "",
    especialidad: doctor?.especialidad ?? "",
    email: doctor?.email ?? "",
    telefono: doctor?.telefono ?? "",
    sedeEntrega: doctor?.sedeEntrega ?? "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
    diasCredito: "0",
    lineaCredito: "",
  });
  const set = (k: keyof typeof c, v: string) => setC((p) => ({ ...p, [k]: v }));

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarDoctor(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const independiente = c.vinculo === "independiente";
  const doc = independiente && c.numeroDocumento
    ? validarDocumento(c.tipoDocumento, c.numeroDocumento)
    : null;
  const contribuyente =
    c.tipoDocumento === "RUC" ? tipoContribuyente(c.numeroDocumento) : null;
  const aCredito = Number(c.diasCredito) > 0;

  const sinClinicas = clinicas.length === 0;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Sin esto el foco cae en el primer botón, que es el selector de
          vínculo: pulsar espacio sin mirar cambiaría la rama del alta. */}
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          refNombre.current?.focus();
        }}
        className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[580px]"
      >
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? doctor!.nombre : "Nuevo doctor"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            {editando
              ? `Pertenece a ${doctor!.cliente} — mover un doctor de cliente arrastra su facturación, así que es otra operación.`
              : "El doctor pide el trabajo; el cliente es a quien se factura."}
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {/* Al editar, el vínculo ya está decidido y no se toca: la acción
              sólo actualiza los datos del doctor. Se manda como "clinica"
              porque es la rama del esquema que no pide documento. */}
          {editando ? (
            <>
              <input type="hidden" name="doctorId" value={doctor!.id} />
              <input type="hidden" name="vinculo" value="clinica" />
              <input type="hidden" name="clienteId" value={doctor!.clienteId} />
            </>
          ) : null}

          {!editando ? (
            <fieldset className="flex flex-col gap-s2">
              <legend className="pb-s1 font-mono text-xs uppercase tracking-wide text-ink-2">
                ¿Dónde trabaja? *
              </legend>
              <div className="grid gap-s2 sm:grid-cols-2">
                <Opcion
                  activo={c.vinculo === "clinica"}
                  onClick={() => set("vinculo", "clinica")}
                  titulo="En una clínica"
                  ayuda="Se factura a la clínica. Varios doctores comparten una sola deuda."
                  deshabilitado={sinClinicas}
                  nota={sinClinicas ? "No hay ninguna clínica registrada todavía." : undefined}
                />
                <Opcion
                  activo={independiente}
                  onClick={() => set("vinculo", "independiente")}
                  titulo="Por su cuenta"
                  ayuda="Se le factura directamente. El sistema le crea su cliente automáticamente."
                />
              </div>
              <input type="hidden" name="vinculo" value={c.vinculo} />
            </fieldset>
          ) : null}

          <Campo etiqueta="Nombre del doctor *" id={`${idForm}-n`}>
            <input
              ref={refNombre}
              id={`${idForm}-n`}
              name="nombre"
              required
              minLength={3}
              value={c.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Dr. Ramiro Jáuregui Ponce"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
            />
          </Campo>

          {!editando && c.vinculo === "clinica" ? (
            <Campo etiqueta="Clínica *" id={`${idForm}-c`}>
              <select
                id={`${idForm}-c`}
                name="clienteId"
                required
                value={c.clienteId}
                onChange={(e) => set("clienteId", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                {clinicas.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.razon_social}
                  </option>
                ))}
              </select>
            </Campo>
          ) : null}

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Colegiatura" id={`${idForm}-col`}>
              <input
                id={`${idForm}-col`}
                name="colegiatura"
                value={c.colegiatura}
                onChange={(e) => set("colegiatura", e.target.value)}
                placeholder="COP 24817"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Especialidad" id={`${idForm}-esp`}>
              <select
                id={`${idForm}-esp`}
                name="especialidad"
                value={c.especialidad}
                onChange={(e) => set("especialidad", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Sin especificar</option>
                {ESPECIALIDADES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Teléfono" id={`${idForm}-tel`}>
              <input
                id={`${idForm}-tel`}
                name="telefono"
                value={c.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Correo" id={`${idForm}-mail`}>
              <input
                id={`${idForm}-mail`}
                name="email"
                type="email"
                value={c.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          <Campo etiqueta="Sede de entrega habitual" id={`${idForm}-sede`}>
            <input
              id={`${idForm}-sede`}
              name="sedeEntrega"
              value={c.sedeEntrega}
              onChange={(e) => set("sedeEntrega", e.target.value)}
              placeholder="San Isidro, Lima"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
            />
          </Campo>

          {!editando && independiente ? (
            <fieldset className="flex flex-col gap-s3 rounded-r1 border border-warn bg-warn-bg p-s3">
              <legend className="px-s1 font-mono text-xs uppercase tracking-wide text-warn">
                Se creará también su cliente
              </legend>
              <p className="text-sm leading-relaxed text-warn">
                Un doctor independiente se modela como un cliente con un único
                doctor asociado. No lo verás por separado, pero la facturación
                lo necesita: sin sujeto comercial no hay comprobante.
              </p>

              <div className="grid gap-s3 sm:grid-cols-[130px_1fr]">
                <Campo etiqueta="Documento *" id={`${idForm}-td`}>
                  <select
                    id={`${idForm}-td`}
                    name="tipoDocumento"
                    value={c.tipoDocumento}
                    onChange={(e) => set("tipoDocumento", e.target.value)}
                    className="h-[38px] w-full rounded-r1 border border-line bg-card px-s2 text-base outline-none"
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">Carné de extranjería</option>
                  </select>
                </Campo>
                <Campo
                  etiqueta="Número *"
                  id={`${idForm}-nd`}
                  ayuda={doc && !doc.ok ? undefined : (contribuyente ? `RUC de ${contribuyente}.` : undefined)}
                >
                  <input
                    id={`${idForm}-nd`}
                    name="numeroDocumento"
                    required
                    value={c.numeroDocumento}
                    onChange={(e) => set("numeroDocumento", e.target.value)}
                    inputMode="numeric"
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

              <div className="grid gap-s3 sm:grid-cols-2">
                <Campo etiqueta="Días de crédito" id={`${idForm}-dc`}>
                  <input
                    id={`${idForm}-dc`}
                    name="diasCredito"
                    type="number"
                    min={0}
                    max={180}
                    value={c.diasCredito}
                    onChange={(e) => set("diasCredito", e.target.value)}
                    className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 font-mono text-base outline-none"
                  />
                </Campo>
                <Campo etiqueta={aCredito ? "Línea de crédito *" : "Línea de crédito"} id={`${idForm}-lc`}>
                  <input
                    id={`${idForm}-lc`}
                    name="lineaCredito"
                    type="number"
                    min={0}
                    step="0.01"
                    value={c.lineaCredito}
                    onChange={(e) => set("lineaCredito", e.target.value)}
                    className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 text-right font-mono text-base outline-none"
                  />
                </Campo>
              </div>
            </fieldset>
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
              disabled={
                enviando ||
                c.nombre.trim().length < 3 ||
                (!editando && independiente && !doc?.ok) ||
                (!editando && c.vinculo === "clinica" && !c.clienteId)
              }
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar doctor"}
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
  deshabilitado,
  nota,
}: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  ayuda: string;
  deshabilitado?: boolean;
  nota?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className={cn(
        "flex flex-col gap-s1 rounded-r1 border p-s3 text-left transition",
        activo ? "border-acc bg-acc-bg" : "border-line bg-card-2 hover:border-line-2",
        deshabilitado && "cursor-not-allowed opacity-60",
      )}
    >
      <span className={cn("text-base font-medium", activo && "text-acc")}>{titulo}</span>
      <span className="text-sm leading-relaxed text-ink-2">{ayuda}</span>
      {nota ? <span className="text-sm text-warn">{nota}</span> : null}
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
