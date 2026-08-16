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
import {
  AFECTACIONES,
  precioEnModoCaptura,
  valorVentaAlmacenado,
} from "@/lib/validaciones/servicio";
import { cn } from "@/lib/utils";

import { guardarServicio, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export type ServicioEditable = {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string | null;
  precioBase: number;
  afectacion: string;
  activo: boolean;
};

export type OpcionCategoria = { id: string; nombre: string };

const NUEVA = "__nueva__";

export function DialogoServicio({
  servicio,
  categorias,
  capturaConIgv,
  listaDefecto,
  tasaIgv,
  children,
}: {
  servicio?: ServicioEditable;
  categorias: OpcionCategoria[];
  capturaConIgv: boolean;
  listaDefecto: string;
  tasaIgv: number;
  children: React.ReactNode;
}) {
  const editando = Boolean(servicio);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();
  const refCodigo = useRef<HTMLInputElement>(null);

  // El precio se edita SIEMPRE en el modo en que el laboratorio lo tiene
  // pactado. Enseñar 560.00 a quien pactó 660.80 lo llevaría a "corregir"
  // el precio hacia arriba en cada edición.
  const precioInicial = servicio
    ? precioEnModoCaptura(servicio.precioBase, capturaConIgv, tasaIgv)
    : "";

  const [c, setC] = useState({
    codigo: servicio?.codigo ?? "",
    nombre: servicio?.nombre ?? "",
    categoriaId: servicio?.categoriaId ?? "",
    categoriaNueva: "",
    precio: String(precioInicial),
    afectacion: servicio?.afectacion ?? "gravado",
  });
  const set = (k: keyof typeof c, v: string) => setC((p) => ({ ...p, [k]: v }));

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarServicio(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const tecleado = Number(c.precio);
  const valido = c.precio !== "" && Number.isFinite(tecleado) && tecleado >= 0;
  const almacenado = valido ? valorVentaAlmacenado(tecleado, capturaConIgv, tasaIgv) : null;
  const creandoCategoria = c.categoriaId === NUEVA;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          refCodigo.current?.focus();
        }}
        className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[560px]"
      >
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? servicio!.nombre : "Nuevo servicio"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            El código viaja en la orden y en el comprobante. El precio se
            teclea como lo tienes pactado; MEFLAB guarda siempre valor de
            venta sin IGV.
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {editando ? (
            <input type="hidden" name="servicioId" value={servicio!.id} />
          ) : null}
          <input type="hidden" name="activo" value={servicio?.activo === false ? "0" : "1"} />

          <div className="grid gap-s3 sm:grid-cols-[160px_1fr]">
            <Campo etiqueta="Código *" id={`${idForm}-cod`}>
              <input
                ref={refCodigo}
                id={`${idForm}-cod`}
                name="codigo"
                required
                value={c.codigo}
                onChange={(e) => set("codigo", e.target.value.toUpperCase())}
                placeholder="COR-ZIR"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base uppercase outline-none placeholder:text-ink-3 focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Nombre del servicio *" id={`${idForm}-nom`}>
              <input
                id={`${idForm}-nom`}
                name="nombre"
                required
                minLength={3}
                value={c.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Corona de zirconio monolítica"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
              />
            </Campo>
          </div>

          <Campo etiqueta="Categoría" id={`${idForm}-cat`}>
            <select
              id={`${idForm}-cat`}
              name={creandoCategoria ? "categoriaIgnorada" : "categoriaId"}
              value={c.categoriaId}
              onChange={(e) => set("categoriaId", e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              <option value="">Sin categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
              <option value={NUEVA}>+ Nueva categoría…</option>
            </select>
          </Campo>

          {creandoCategoria ? (
            <Campo etiqueta="Nombre de la categoría *" id={`${idForm}-catn`}>
              <input
                id={`${idForm}-catn`}
                name="categoriaNueva"
                required
                value={c.categoriaNueva}
                onChange={(e) => set("categoriaNueva", e.target.value)}
                placeholder="Prótesis fija"
                className="h-[38px] w-full rounded-r1 border border-acc bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3"
              />
            </Campo>
          ) : null}

          {/* D-07 en la pantalla: se dice en qué modo se está tecleando y
              qué cifra va a quedar guardada, antes de guardarla. */}
          <fieldset className="flex flex-col gap-s3 rounded-r1 border border-line bg-card-2 p-s3">
            <legend className="px-s1 font-mono text-xs uppercase tracking-wide text-ink-3">
              Precio
            </legend>

            <p className="text-sm leading-relaxed text-ink-2">
              La lista <b className="font-semibold text-ink">{listaDefecto}</b> captura{" "}
              {capturaConIgv ? (
                <b className="font-semibold text-warn">con IGV incluido</b>
              ) : (
                <b className="font-semibold text-ink">sin IGV</b>
              )}
              .
            </p>

            <div className="grid gap-s3 sm:grid-cols-2">
              <Campo
                etiqueta={capturaConIgv ? "Precio con IGV *" : "Precio sin IGV *"}
                id={`${idForm}-pre`}
              >
                <input
                  id={`${idForm}-pre`}
                  name="precio"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={c.precio}
                  onChange={(e) => set("precio", e.target.value)}
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
                />
              </Campo>

              <div className="flex flex-col justify-end gap-s1 pb-[2px]">
                <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
                  Se guardará
                </span>
                <span
                  className={cn(
                    "h-[38px] rounded-r1 border border-dashed border-line-2 px-s3 text-right font-mono text-base leading-[36px] tabular-nums",
                    capturaConIgv ? "text-acc" : "text-ink-3",
                  )}
                >
                  {almacenado !== null ? soles.format(almacenado) : "—"}
                </span>
              </div>
            </div>

            {capturaConIgv && almacenado !== null ? (
              <p className="text-sm leading-relaxed text-ink-3">
                Valor de venta sin IGV, que es lo único que MEFLAB almacena.
                El IGV se calcula al facturar, nunca se guarda dentro del
                precio.
              </p>
            ) : null}

            <Campo etiqueta="Afectación tributaria" id={`${idForm}-afe`}>
              <select
                id={`${idForm}-afe`}
                name="afectacion"
                value={c.afectacion}
                onChange={(e) => set("afectacion", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card px-s2 text-base outline-none"
              >
                {AFECTACIONES.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
          </fieldset>

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
                !valido ||
                (creandoCategoria && c.categoriaNueva.trim().length === 0)
              }
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Añadir al catálogo"}
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
