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
import { CANALES, RESULTADOS, guionPorTramo } from "@/lib/dominio/cobranza";
import { cn } from "@/lib/utils";

import { registrarGestion, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

/**
 * Registrar una gestión de cobranza sobre un documento concreto.
 *
 * Lleva el guion del tramo de mora incorporado. No es un adorno: quien
 * cobra no suele ser quien fijó las condiciones, y sin una frase de
 * partida las llamadas de 60 días suenan igual que las de 5 — que es
 * exactamente por lo que no se cobran.
 */
export function RegistrarGestion({
  clienteId,
  cuentaCobrarId,
  cliente,
  documento,
  saldo,
  diasMora,
  tramo,
}: {
  clienteId: string;
  cuentaCobrarId: string;
  cliente: string;
  documento: string;
  saldo: number;
  diasMora: number;
  tramo: string;
}) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [resultado, setResultado] = useState("sin_respuesta");
  const [notas, setNotas] = useState("");
  const [fechaPromesa, setFechaPromesa] = useState("");
  const [importePromesa, setImportePromesa] = useState(String(saldo));

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await registrarGestion(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setNotas("");
        setResultado("sin_respuesta");
      }
      return r;
    },
    INICIAL,
  );

  const guion = guionPorTramo(tramo, { cliente, documento, saldo, diasMora });
  const esPromesa = resultado === "promesa_pago";
  const listo = !esPromesa || (Boolean(fechaPromesa) && Number(importePromesa) > 0);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink transition hover:border-acc hover:text-acc">
          Gestionar
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[560px]">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="cuentaCobrarId" value={cuentaCobrarId} />
          <input type="hidden" name="resultado" value={resultado} />

          <DialogHeader>
            <DialogTitle>Gestionar {documento}</DialogTitle>
            <DialogDescription>
              {cliente} · {soles.format(saldo)} ·{" "}
              {diasMora > 0 ? `${diasMora} días de mora` : `vence en ${Math.abs(diasMora)} días`}
            </DialogDescription>
          </DialogHeader>

          {/* El guion cambia con el tramo. A los 5 días se recuerda; a los
              90 se plantea el problema. Usar el mismo tono en los dos
              casos es como no llamar. */}
          <div className="flex flex-col gap-s2 rounded-r1 border border-line border-l-2 border-l-acc bg-card-2 p-s3">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
              Qué decir
            </span>
            <p className="text-sm leading-relaxed text-ink-2">{guion}</p>
          </div>

          <div className="grid gap-s3 sm:grid-cols-2">
            <div className="flex flex-col gap-s1">
              <label
                htmlFor={`${idForm}-canal`}
                className="font-mono text-xs uppercase tracking-wide text-ink-2"
              >
                Por dónde
              </label>
              <select
                id={`${idForm}-canal`}
                name="canal"
                defaultValue="telefono"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                {CANALES.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-s2">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
              Qué pasó
            </span>
            <div className="grid gap-s2 sm:grid-cols-2">
              {RESULTADOS.map((r) => (
                <button
                  key={r.valor}
                  type="button"
                  onClick={() => setResultado(r.valor)}
                  className={cn(
                    "flex flex-col gap-[2px] rounded-r1 border p-s2 text-left transition",
                    resultado === r.valor
                      ? "border-acc bg-acc-bg"
                      : "border-line bg-card-2 hover:border-line-2",
                  )}
                >
                  <span className="text-sm font-medium">
                    <span aria-hidden="true">{r.glifo}</span> {r.etiqueta}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {esPromesa ? (
            <div className="grid gap-s3 rounded-r1 border border-acc bg-acc-bg p-s3 sm:grid-cols-2">
              <div className="flex flex-col gap-s1">
                <label
                  htmlFor={`${idForm}-fecha`}
                  className="font-mono text-xs uppercase tracking-wide text-ink-2"
                >
                  Prometió pagar el *
                </label>
                <input
                  id={`${idForm}-fecha`}
                  type="date"
                  name="fechaPromesa"
                  value={fechaPromesa}
                  onChange={(e) => setFechaPromesa(e.target.value)}
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s2 text-base outline-none focus-visible:border-acc"
                />
              </div>
              <div className="flex flex-col gap-s1">
                <label
                  htmlFor={`${idForm}-importe`}
                  className="font-mono text-xs uppercase tracking-wide text-ink-2"
                >
                  Cuánto *
                </label>
                <input
                  id={`${idForm}-importe`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="importePromesa"
                  value={importePromesa}
                  onChange={(e) => setImportePromesa(e.target.value)}
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
                />
              </div>
              <p className="text-sm leading-relaxed text-ink-2 sm:col-span-2">
                Ese día aparecerá en la agenda de cobranza. Si llega sin
                pago, la promesa queda incumplida — y eso pesa en el score
                del cliente.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-s1">
            <label
              htmlFor={`${idForm}-notas`}
              className="font-mono text-xs uppercase tracking-wide text-ink-2"
            >
              Qué dijo
            </label>
            <textarea
              id={`${idForm}-notas`}
              name="notas"
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Dice que el administrador vuelve el lunes y lo firma entonces"
              className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
            />
            <span className="text-sm text-ink-3">
              Lo leerá quien llame la próxima vez. Sin esto, cada llamada
              empieza de cero y el cliente lo nota.
            </span>
          </div>

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
              {enviando ? "Guardando…" : "Registrar gestión"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
