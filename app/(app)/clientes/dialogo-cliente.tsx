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
import {
  AYUDA_TIPO,
  ETIQUETA_DOCUMENTO,
  ETIQUETA_TIPO,
  TIPOS_CLIENTE,
  TIPOS_DOCUMENTO,
  type TipoCliente,
} from "@/lib/validaciones/cliente";
import { tipoContribuyente, validarDocumento } from "@/lib/validaciones/documento";
import { cn } from "@/lib/utils";

import { guardarCliente, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type ClienteEditable = {
  id: string;
  tipo: string;
  razonSocial: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  diasCredito: number;
  lineaCredito: number | null;
  listaPrecioId: string | null;
};

type Campos = {
  tipo: TipoCliente;
  razonSocial: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion: string;
  email: string;
  telefono: string;
  diasCredito: string;
  lineaCredito: string;
  listaPrecioId: string;
};

function iniciales(cliente?: ClienteEditable): Campos {
  return {
    tipo: (cliente?.tipo as TipoCliente) ?? "clinica",
    razonSocial: cliente?.razonSocial ?? "",
    tipoDocumento: cliente?.tipoDocumento ?? "RUC",
    numeroDocumento: cliente?.numeroDocumento ?? "",
    direccion: cliente?.direccion ?? "",
    email: cliente?.email ?? "",
    telefono: cliente?.telefono ?? "",
    diasCredito: String(cliente?.diasCredito ?? 0),
    lineaCredito: cliente?.lineaCredito != null ? String(cliente.lineaCredito) : "",
    listaPrecioId: cliente?.listaPrecioId ?? "",
  };
}

export function DialogoCliente({
  cliente,
  listas,
  children,
}: {
  cliente?: ClienteEditable;
  listas: { id: string; nombre: string; precios_incluyen_igv: boolean }[];
  children: React.ReactNode;
}) {
  const editando = Boolean(cliente);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();

  /**
   * TODOS los campos son controlados, no `defaultValue`.
   *
   * React REINICIA el formulario después de ejecutar una acción. Con
   * campos no controlados, un guardado fallido borra todo lo tecleado y
   * hay que empezar de cero — que es justo cuando menos ganas hay.
   * Se detectó probando: al reenviar tras un error, razonSocial llegaba
   * vacía al servidor.
   */
  const [campos, setCampos] = useState<Campos>(() => iniciales(cliente));
  const set = <K extends keyof Campos>(k: K, v: Campos[K]) =>
    setCampos((c) => ({ ...c, [k]: v }));

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarCliente(previo, formData);
      if (r.ok) {
        setAbierto(false);
        if (!editando) setCampos(iniciales());
      }
      return r;
    },
    INICIAL,
  );

  // Validación en vivo: enseñar el fallo al teclear evita descubrirlo al
  // pulsar Guardar, que frustra más.
  const doc = campos.numeroDocumento
    ? validarDocumento(campos.tipoDocumento, campos.numeroDocumento)
    : null;
  const contribuyente =
    campos.tipoDocumento === "RUC" ? tipoContribuyente(campos.numeroDocumento) : null;
  const aCredito = Number(campos.diasCredito) > 0;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[600px]">
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? cliente!.razonSocial : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            El cliente es a quien se factura y se cobra. El doctor que pide el
            trabajo va después, dentro de este cliente.
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {editando ? <input type="hidden" name="clienteId" value={cliente!.id} /> : null}

          <fieldset className="flex flex-col gap-s2">
            <legend className="pb-s1 font-mono text-xs uppercase tracking-wide text-ink-2">
              Tipo de cliente *
            </legend>
            <div className="grid gap-s2 sm:grid-cols-2">
              {TIPOS_CLIENTE.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex cursor-pointer flex-col gap-s1 rounded-r1 border p-s3 transition",
                    campos.tipo === t
                      ? "border-acc bg-acc-bg"
                      : "border-line bg-card-2 hover:border-line-2",
                  )}
                >
                  <span className="flex items-center gap-s2">
                    <input
                      type="radio"
                      name="tipo"
                      value={t}
                      checked={campos.tipo === t}
                      onChange={() =>
                        setCampos((c) => ({
                          ...c,
                          tipo: t,
                          // Una clínica es persona jurídica y una persona
                          // natural no tiene RUC obligatorio: se propone el
                          // documento que toca, pero se puede cambiar.
                          tipoDocumento: t === "clinica" ? "RUC" : "DNI",
                        }))
                      }
                      className="size-[15px] accent-[var(--acc)]"
                    />
                    <span
                      className={cn(
                        "text-base font-medium",
                        campos.tipo === t && "text-acc",
                      )}
                    >
                      {ETIQUETA_TIPO[t]}
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-ink-2">{AYUDA_TIPO[t]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Campo
            etiqueta={campos.tipo === "clinica" ? "Razón social *" : "Nombre completo *"}
            id={`${idForm}-rs`}
          >
            <input
              id={`${idForm}-rs`}
              name="razonSocial"
              required
              minLength={3}
              value={campos.razonSocial}
              onChange={(e) => set("razonSocial", e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
            />
          </Campo>

          <div className="grid gap-s3 sm:grid-cols-[140px_1fr]">
            <Campo etiqueta="Documento *" id={`${idForm}-td`}>
              <select
                id={`${idForm}-td`}
                name="tipoDocumento"
                value={campos.tipoDocumento}
                onChange={(e) => set("tipoDocumento", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_DOCUMENTO[t]}
                  </option>
                ))}
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
                value={campos.numeroDocumento}
                onChange={(e) => set("numeroDocumento", e.target.value)}
                inputMode="numeric"
                className={cn(
                  "h-[38px] w-full rounded-r1 border bg-card-2 px-s3 font-mono text-base outline-none",
                  doc && !doc.ok
                    ? "border-err focus-visible:border-err"
                    : doc?.ok
                      ? "border-ok focus-visible:border-ok"
                      : "border-line focus-visible:border-acc",
                )}
              />
              {doc && !doc.ok ? <span className="text-sm text-err">{doc.motivo}</span> : null}
            </Campo>
          </div>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Teléfono" id={`${idForm}-tel`}>
              <input
                id={`${idForm}-tel`}
                name="telefono"
                value={campos.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Correo" id={`${idForm}-mail`}>
              <input
                id={`${idForm}-mail`}
                name="email"
                type="email"
                value={campos.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          <Campo etiqueta="Dirección" id={`${idForm}-dir`}>
            <input
              id={`${idForm}-dir`}
              name="direccion"
              value={campos.direccion}
              onChange={(e) => set("direccion", e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
            />
          </Campo>

          <fieldset className="flex flex-col gap-s3 rounded-r1 border border-line bg-card-2 p-s3">
            <legend className="px-s1 font-mono text-xs uppercase tracking-wide text-ink-2">
              Condiciones comerciales
            </legend>

            <div className="grid gap-s3 sm:grid-cols-2">
              <Campo etiqueta="Días de crédito" id={`${idForm}-dc`}>
                <input
                  id={`${idForm}-dc`}
                  name="diasCredito"
                  type="number"
                  min={0}
                  max={180}
                  value={campos.diasCredito}
                  onChange={(e) => set("diasCredito", e.target.value)}
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 font-mono text-base outline-none focus-visible:border-acc"
                />
              </Campo>

              <Campo
                etiqueta={aCredito ? "Línea de crédito *" : "Línea de crédito"}
                id={`${idForm}-lc`}
              >
                <input
                  id={`${idForm}-lc`}
                  name="lineaCredito"
                  type="number"
                  min={0}
                  step="0.01"
                  value={campos.lineaCredito}
                  onChange={(e) => set("lineaCredito", e.target.value)}
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 text-right font-mono text-base outline-none focus-visible:border-acc"
                />
              </Campo>
            </div>

            {aCredito ? (
              <p className="text-sm text-ink-2">
                Con <b className="font-semibold text-ink">{campos.diasCredito} días</b> de
                crédito hay que fijar la línea: sin tope, el bloqueo por deuda nunca salta.
              </p>
            ) : (
              <p className="text-sm text-ink-2">
                Con 0 días, el cliente paga al contado y no acumula deuda.
              </p>
            )}

            <Campo etiqueta="Lista de precios" id={`${idForm}-lp`}>
              <select
                id={`${idForm}-lp`}
                name="listaPrecioId"
                value={campos.listaPrecioId}
                onChange={(e) => set("listaPrecioId", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Lista por defecto</option>
                {listas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                    {l.precios_incluyen_igv ? " · captura con IGV" : ""}
                  </option>
                ))}
              </select>
            </Campo>
          </fieldset>

          {estado.mensaje && !estado.ok ? (
            <p
              role="alert"
              className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err"
            >
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
              disabled={enviando || !doc?.ok}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar cliente"}
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
