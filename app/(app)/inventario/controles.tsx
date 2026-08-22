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
  consumir,
  guardarMaterial,
  registrarEntrada,
  registrarMerma,
  type Resultado,
} from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type LoteFila = {
  id: string;
  codigo: string;
  cantidad: number;
  costoUnitario: number;
  venceEl: string | null;
  ubicacion: string | null;
};

export type MaterialFila = {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  umbralBajo: number;
  umbralCritico: number;
  cantidad: number;
  valorizado: number;
  lotes: LoteFila[];
};

export type OrdenAbierta = { id: string; codigo: string };

export function Controles({
  materiales,
  ordenes,
  areaId,
  puedeGestionar,
  puedeConsumir,
}: {
  materiales: MaterialFila[];
  ordenes: OrdenAbierta[];
  areaId: string;
  puedeGestionar: boolean;
  puedeConsumir: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-s2">
      {puedeGestionar ? <NuevoMaterial areaId={areaId} /> : null}
      {puedeGestionar ? <Entrada materiales={materiales} /> : null}
      {puedeConsumir ? <Consumo materiales={materiales} ordenes={ordenes} /> : null}
      {puedeGestionar ? <Merma materiales={materiales} /> : null}
    </div>
  );
}

/* ── alta de material ─────────────────────────────────────────────── */

function NuevoMaterial({ areaId }: { areaId: string }) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [controlaLote, setControlaLote] = useState(false);

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarMaterial(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
          Nuevo material
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[560px]">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="areaId" value={areaId} />
          <input type="hidden" name="controlaLote" value={controlaLote ? "1" : "0"} />

          <DialogHeader>
            <DialogTitle>Nuevo material</DialogTitle>
            <DialogDescription>
              Lo que el laboratorio consume al fabricar. Sin esto, el costo
              real de un trabajo es sólo mano de obra.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Código *" id={`${idForm}-cod`}>
              <input
                id={`${idForm}-cod`}
                name="codigo"
                placeholder="ZIR-DISC"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base uppercase outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Unidad" id={`${idForm}-uni`} ayuda="disco, caja, gramo…">
              <input
                id={`${idForm}-uni`}
                name="unidad"
                defaultValue="unidad"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          <Campo etiqueta="Nombre *" id={`${idForm}-nom`}>
            <input
              id={`${idForm}-nom`}
              name="nombre"
              placeholder="Disco de zirconio multicapa 98 mm"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
            />
          </Campo>

          <div className="grid gap-s3 sm:grid-cols-3">
            <Campo
              etiqueta="Costo referencia"
              id={`${idForm}-costo`}
              ayuda="El real sale del lote."
            >
              <input
                id={`${idForm}-costo`}
                name="costoReferencia"
                type="number"
                step="0.0001"
                min="0"
                defaultValue="0"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Umbral bajo" id={`${idForm}-bajo`}>
              <input
                id={`${idForm}-bajo`}
                name="umbralBajo"
                type="number"
                step="0.001"
                min="0"
                defaultValue="0"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Umbral crítico" id={`${idForm}-crit`}>
              <input
                id={`${idForm}-crit`}
                name="umbralCritico"
                type="number"
                step="0.001"
                min="0"
                defaultValue="0"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          {/* Controlar por lotes no es una preferencia: decide si al
              consumir habrá que decir de qué lote sale. */}
          <label className="flex cursor-pointer items-start gap-s3 rounded-r1 border border-line bg-card-2 p-s3">
            <input
              type="checkbox"
              checked={controlaLote}
              onChange={(e) => setControlaLote(e.target.checked)}
              className="mt-[2px] size-[16px] shrink-0 accent-acc"
            />
            <span className="flex flex-col gap-[2px]">
              <span className="text-base">Se controla por lotes</span>
              <span className="text-sm leading-relaxed text-ink-3">
                Márcalo si caduca o si el precio cambia entre compras: la
                cerámica sí, los guantes no. Al consumir habrá que decir de
                qué lote sale.
              </span>
            </span>
          </label>

          {estado.mensaje && !estado.ok ? (
            <p role="status" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter>
            <Cancelar onClick={() => setAbierto(false)} />
            <Enviar enviando={enviando} texto="Crear material" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── entrada ──────────────────────────────────────────────────────── */

function Entrada({ materiales }: { materiales: MaterialFila[] }) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [materialId, setMaterialId] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await registrarEntrada(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const material = materiales.find((m) => m.id === materialId);
  const conLotes = (material?.lotes.length ?? 0) > 0 || material === undefined;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill">
          Registrar entrada
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[560px]">
        <form action={accion} className="flex flex-col gap-s4">
          <DialogHeader>
            <DialogTitle>Entrada de almacén</DialogTitle>
            <DialogDescription>
              Una compra recibida. El costo que pongas aquí es el que
              tendrán los trabajos que lo consuman.
            </DialogDescription>
          </DialogHeader>

          <Campo etiqueta="Material *" id={`${idForm}-mat`}>
            <select
              id={`${idForm}-mat`}
              name="materialId"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              <option value="">Elige un material…</option>
              {materiales.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.unidad})
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Cantidad *" id={`${idForm}-cant`}>
              <input
                id={`${idForm}-cant`}
                name="cantidad"
                type="number"
                step="0.001"
                min="0.001"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo
              etiqueta="Costo unitario *"
              id={`${idForm}-cu`}
              ayuda="Lo que costó esta compra."
            >
              <input
                id={`${idForm}-cu`}
                name="costoUnitario"
                type="number"
                step="0.0001"
                min="0"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          {conLotes ? (
            <div className="grid gap-s3 rounded-r1 border border-line bg-card-2 p-s3 sm:grid-cols-3">
              <Campo etiqueta="Lote" id={`${idForm}-lote`}>
                <input
                  id={`${idForm}-lote`}
                  name="codigoLote"
                  placeholder="L-2026-01"
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 font-mono text-base outline-none focus-visible:border-acc"
                />
              </Campo>
              <Campo etiqueta="Vence el" id={`${idForm}-vence`}>
                <input
                  id={`${idForm}-vence`}
                  name="venceEl"
                  type="date"
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s2 text-base outline-none focus-visible:border-acc"
                />
              </Campo>
              <Campo etiqueta="Ubicación" id={`${idForm}-ubi`}>
                <input
                  id={`${idForm}-ubi`}
                  name="ubicacion"
                  placeholder="Estante B2"
                  className="h-[38px] w-full rounded-r1 border border-line bg-card px-s3 text-base outline-none focus-visible:border-acc"
                />
              </Campo>
              <p className="text-sm leading-relaxed text-ink-3 sm:col-span-3">
                Sólo hace falta si el material se controla por lotes. Si no,
                déjalo vacío.
              </p>
            </div>
          ) : null}

          {estado.mensaje && !estado.ok ? (
            <p role="status" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter>
            <Cancelar onClick={() => setAbierto(false)} />
            <Enviar enviando={enviando} texto="Registrar entrada" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── consumo ──────────────────────────────────────────────────────── */

function Consumo({
  materiales,
  ordenes,
}: {
  materiales: MaterialFila[];
  ordenes: OrdenAbierta[];
}) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [loteId, setLoteId] = useState("");
  const [cantidad, setCantidad] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await consumir(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setCantidad("");
      }
      return r;
    },
    INICIAL,
  );

  const material = materiales.find((m) => m.id === materialId);
  const lotes = (material?.lotes ?? []).filter((l) => l.cantidad > 0);
  const lote = lotes.find((l) => l.id === loteId);

  const disponible = lote ? lote.cantidad : (material?.cantidad ?? 0);
  const pedido = Number(cantidad) || 0;
  const noAlcanza = pedido > disponible;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill">
          Consumir en un trabajo
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[560px]">
        <form action={accion} className="flex flex-col gap-s4">
          <DialogHeader>
            <DialogTitle>Consumo de material</DialogTitle>
            <DialogDescription>
              Se descuenta del almacén y se imputa al trabajo. Es lo que
              permite saber cuánto costó de verdad esa corona.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo etiqueta="Material *" id={`${idForm}-mat`}>
              <select
                id={`${idForm}-mat`}
                name="materialId"
                value={materialId}
                onChange={(e) => {
                  setMaterialId(e.target.value);
                  setLoteId("");
                }}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Elige un material…</option>
                {materiales
                  .filter((m) => m.cantidad > 0)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} · quedan {m.cantidad} {m.unidad}
                    </option>
                  ))}
              </select>
            </Campo>

            <Campo etiqueta="Trabajo *" id={`${idForm}-ot`}>
              <select
                id={`${idForm}-ot`}
                name="ordenId"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Elige el trabajo…</option>
                {ordenes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.codigo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {lotes.length > 0 ? (
            <Campo
              etiqueta="Lote *"
              id={`${idForm}-lote`}
              ayuda="El costo del trabajo será el de este lote."
            >
              <select
                id={`${idForm}-lote`}
                name="loteId"
                value={loteId}
                onChange={(e) => setLoteId(e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Elige el lote…</option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codigo} · quedan {l.cantidad} · S/ {l.costoUnitario}
                    {l.venceEl ? ` · vence ${l.venceEl}` : ""}
                  </option>
                ))}
              </select>
            </Campo>
          ) : null}

          <Campo etiqueta="Cantidad *" id={`${idForm}-cant`}>
            <input
              id={`${idForm}-cant`}
              name="cantidad"
              type="number"
              step="0.001"
              min="0.001"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
            />
          </Campo>

          {/* Se avisa ANTES de enviar. La base lo rechazaría igual, pero
              enterarse al pulsar es enterarse tarde. */}
          {noAlcanza ? (
            <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm leading-relaxed text-warn">
              <span aria-hidden="true">▲</span> No alcanza: quedan{" "}
              <b className="font-semibold">
                {disponible} {material?.unidad}
              </b>{" "}
              y se piden {pedido}. Registra antes la entrada que falta.
            </p>
          ) : null}

          {lote?.venceEl ? (
            <p className="text-sm text-ink-3">
              Este lote vence el {lote.venceEl}. Si hay otro que caduque
              antes, conviene gastar ése primero.
            </p>
          ) : null}

          {estado.mensaje && !estado.ok ? (
            <p role="status" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter>
            <Cancelar onClick={() => setAbierto(false)} />
            <Enviar enviando={enviando} texto="Registrar consumo" desactivado={noAlcanza} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── merma ────────────────────────────────────────────────────────── */

function Merma({ materiales }: { materiales: MaterialFila[] }) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [motivo, setMotivo] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await registrarMerma(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setMotivo("");
      }
      return r;
    },
    INICIAL,
  );

  const material = materiales.find((m) => m.id === materialId);
  const lotes = (material?.lotes ?? []).filter((l) => l.cantidad > 0);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink transition hover:border-warn hover:text-warn">
          Registrar merma
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[520px]">
        <form action={accion} className="flex flex-col gap-s4">
          <DialogHeader>
            <DialogTitle>Merma</DialogTitle>
            <DialogDescription>
              Material que se rompió, se venció o se perdió. Sale del
              almacén sin ir a ningún trabajo.
            </DialogDescription>
          </DialogHeader>

          <Campo etiqueta="Material *" id={`${idForm}-mat`}>
            <select
              id={`${idForm}-mat`}
              name="materialId"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              <option value="">Elige un material…</option>
              {materiales
                .filter((m) => m.cantidad > 0)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} · quedan {m.cantidad} {m.unidad}
                  </option>
                ))}
            </select>
          </Campo>

          {lotes.length > 0 ? (
            <Campo etiqueta="Lote" id={`${idForm}-lote`}>
              <select
                id={`${idForm}-lote`}
                name="loteId"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Sin lote</option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codigo} · quedan {l.cantidad}
                  </option>
                ))}
              </select>
            </Campo>
          ) : null}

          <Campo etiqueta="Cantidad *" id={`${idForm}-cant`}>
            <input
              id={`${idForm}-cant`}
              name="cantidad"
              type="number"
              step="0.001"
              min="0.001"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
            />
          </Campo>

          <Campo
            etiqueta="Motivo *"
            id={`${idForm}-mot`}
            ayuda="Una merma sin explicación es material que se evaporó."
          >
            <textarea
              id={`${idForm}-mot`}
              name="motivo"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="El disco se fracturó al fresar"
              className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
            />
          </Campo>

          {estado.mensaje && !estado.ok ? (
            <p role="status" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter>
            <Cancelar onClick={() => setAbierto(false)} />
            <Enviar
              enviando={enviando}
              texto="Registrar merma"
              desactivado={motivo.trim().length < 5}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── piezas compartidas ───────────────────────────────────────────── */

function Cancelar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
    >
      Cancelar
    </button>
  );
}

function Enviar({
  enviando,
  texto,
  desactivado,
}: {
  enviando: boolean;
  texto: string;
  desactivado?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={enviando || desactivado}
      className={cn(
        "h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110",
        "disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none",
      )}
    >
      {enviando ? "Guardando…" : texto}
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
