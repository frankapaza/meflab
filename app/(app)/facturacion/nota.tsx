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
  MOTIVOS_NOTA_CREDITO,
  MOTIVOS_NOTA_DEBITO,
  TIPOS_NOTA,
  calcularImportes,
  saldoTrasNota,
  type TipoNota,
} from "@/lib/validaciones/facturacion";
import { cn } from "@/lib/utils";

import { emitirNota, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

/**
 * Emitir una nota sobre un documento ya emitido.
 *
 * Enseña el saldo que quedará ANTES de confirmar. Una nota no se puede
 * deshacer sin otra nota en sentido contrario, así que el momento de
 * darse cuenta de que se tecleó un cero de más es éste.
 */
export function NuevaNota({
  documentoId,
  numero,
  clienteId,
  cliente,
  saldoActual,
  series,
  tasaIgv,
}: {
  documentoId: string;
  numero: string;
  clienteId: string;
  cliente: string;
  saldoActual: number;
  series: { tipo: string; serie: string }[];
  tasaIgv: number;
}) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoNota>("nota_credito");
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await emitirNota(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setMotivo("");
        setDescripcion("");
        setMonto("");
      }
      return r;
    },
    INICIAL,
  );

  const serie =
    series.find((s) => s.tipo === (tipo === "nota_credito" ? "NOTA_CREDITO" : "NOTA_DEBITO"))
      ?.serie ?? "";

  const valor = Number(monto) || 0;
  const importes = calcularImportes(
    [{ cantidad: 1, precioUnitario: valor, afectacion: "gravado" }],
    tasaIgv,
  );
  const resultado = saldoTrasNota(saldoActual, importes.total, tipo);

  const motivos = tipo === "nota_credito" ? MOTIVOS_NOTA_CREDITO : MOTIVOS_NOTA_DEBITO;

  const lineas = [
    {
      descripcion: descripcion.trim() || motivo.trim(),
      cantidad: 1,
      precioUnitario: valor,
      afectacion: "gravado",
    },
  ];

  const listo =
    Boolean(serie) && valor > 0 && motivo.trim().length >= 5 && lineas[0].descripcion.length >= 3;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink transition hover:border-acc hover:text-acc">
          Nota
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[560px]">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="documentoRefId" value={documentoId} />
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="motivo" value={motivo} />
          <input type="hidden" name="lineas" value={JSON.stringify(lineas)} />

          <DialogHeader>
            <DialogTitle>Nota sobre {numero}</DialogTitle>
            <DialogDescription>
              {cliente} · debe hoy {soles.format(saldoActual)}
            </DialogDescription>
          </DialogHeader>

          {/* El efecto va escrito en cada opción, no sólo el nombre: casi
              nadie recuerda de memoria cuál de las dos sube y cuál baja. */}
          <div className="flex flex-col gap-s2">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
              Qué nota
            </span>
            <div className="grid gap-s2 sm:grid-cols-2">
              {TIPOS_NOTA.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => {
                    setTipo(t.valor);
                    setMotivo("");
                  }}
                  className={cn(
                    "flex flex-col gap-[2px] rounded-r1 border p-s3 text-left transition",
                    tipo === t.valor
                      ? "border-acc bg-acc-bg"
                      : "border-line bg-card-2 hover:border-line-2",
                  )}
                >
                  <span className="text-base font-medium">{t.etiqueta}</span>
                  <span className="text-sm text-ink-3">{t.efecto}</span>
                </button>
              ))}
            </div>
            {!serie ? (
              <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
                <span aria-hidden="true">▲</span> No hay serie configurada para
                este tipo de nota. Hay que crearla antes de poder emitirla.
              </p>
            ) : (
              <span className="font-mono text-xs text-ink-3">
                Se emitirá en la serie {serie}.
              </span>
            )}
          </div>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Motivo *" id={`${idForm}-motivo`}>
              <input
                id={`${idForm}-motivo`}
                list={`${idForm}-motivos`}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Elige o escribe el motivo"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
              {/* Lista sugerida, no cerrada: obligar a elegir de un
                  desplegable acaba con todos eligiendo el primero. */}
              <datalist id={`${idForm}-motivos`}>
                {motivos.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Campo>

            <Campo
              etiqueta="Importe sin IGV *"
              id={`${idForm}-monto`}
              ayuda="Se le suma el IGV, igual que en la factura."
            >
              <input
                id={`${idForm}-monto`}
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          <Campo
            etiqueta="Concepto"
            id={`${idForm}-desc`}
            ayuda="Lo que se imprimirá en la nota. Si se deja vacío, va el motivo."
          >
            <input
              id={`${idForm}-desc`}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
            />
          </Campo>

          {/* Lo que va a pasar, en cifras, antes de que pase. */}
          <dl className="flex flex-col gap-s2 rounded-r1 border border-line bg-card-2 p-s3">
            <Fila etiqueta="Valor de venta" valor={soles.format(importes.subtotal)} />
            <Fila
              etiqueta={`IGV (${(tasaIgv * 100).toFixed(0)} %)`}
              valor={soles.format(importes.igv)}
            />
            <div className="border-t border-line pt-s2">
              <Fila etiqueta="Total de la nota" valor={soles.format(importes.total)} destacado />
            </div>
            <div className="border-t border-line pt-s2">
              <Fila
                etiqueta="Quedará debiendo"
                valor={soles.format(resultado.saldo)}
                destacado
              />
            </div>
          </dl>

          {resultado.aFavor > 0 ? (
            <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm leading-relaxed text-warn">
              <span aria-hidden="true">▲</span> La nota supera lo que el
              cliente aún debía. Los{" "}
              <b className="font-semibold">{soles.format(resultado.aFavor)}</b>{" "}
              de más quedan como <b className="font-semibold">saldo a favor</b>{" "}
              suyo, aplicable a una próxima factura. No es deuda: no suma a la
              cartera.
            </p>
          ) : null}

          {estado.mensaje && !estado.ok ? (
            <p
              role="status"
              className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err"
            >
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
              {enviando ? "Emitiendo…" : "Emitir nota"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Fila({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-s3">
      <dt className={cn("text-sm", destacado ? "font-semibold text-ink" : "text-ink-2")}>
        {etiqueta}
      </dt>
      <dd
        className={cn(
          "font-mono tabular-nums",
          destacado ? "text-lg font-semibold" : "text-base text-ink-2",
        )}
      >
        {valor}
      </dd>
    </div>
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
