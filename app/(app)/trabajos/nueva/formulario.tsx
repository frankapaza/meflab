"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";

import {
  PRIORIDADES,
  TIPOS_RECEPCION,
  arcadaDePiezas,
  diasHabilesHasta,
} from "@/lib/validaciones/orden";
import { cn } from "@/lib/utils";

import { registrarOrden, type Resultado } from "../acciones";
import { Odontograma } from "./odontograma";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export type OpcionCliente = { id: string; razonSocial: string; bloqueado: boolean };
export type OpcionDoctor = { id: string; clienteId: string; nombre: string };
export type OpcionPaciente = { id: string; nombre: string };
export type OpcionServicio = {
  id: string;
  codigo: string;
  nombre: string;
  precioBase: number;
  tieneFlujo: boolean;
};
export type OpcionColor = { id: string; codigo: string; hex: string };

type Linea = {
  clave: string;
  servicioId: string;
  cantidad: string;
  piezas: string[];
  colorId: string;
};

const lineaVacia = (clave: string): Linea => ({
  clave,
  servicioId: "",
  cantidad: "1",
  piezas: [],
  colorId: "",
});

export function FormularioOrden({
  clientes,
  doctores,
  pacientes,
  servicios,
  colores,
  preciosPorCliente,
}: {
  clientes: OpcionCliente[];
  doctores: OpcionDoctor[];
  pacientes: OpcionPaciente[];
  servicios: OpcionServicio[];
  colores: OpcionColor[];
  /** cliente → servicio → precio de su lista. El resto va a precio base. */
  preciosPorCliente: Record<string, Record<string, number>>;
}) {
  const router = useRouter();
  const idForm = useId();

  const [clienteId, setClienteId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [fecha, setFecha] = useState("");
  const [prioridad, setPrioridad] = useState("normal");
  const [tipoRecepcion, setTipoRecepcion] = useState("impresion_fisica");
  const [indicaciones, setIndicaciones] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia("l0")]);
  const [siguiente, setSiguiente] = useState(1);

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await registrarOrden(previo, formData);
      if (r.ok && r.ordenId) router.push("/trabajos");
      return r;
    },
    INICIAL,
  );

  const cliente = clientes.find((c) => c.id === clienteId);
  const susDoctores = doctores.filter((d) => d.clienteId === clienteId);

  // El precio se calcula también aquí, pero SÓLO para enseñarlo: el que
  // vale es el que resuelve la base al registrar. Nunca se manda.
  const precioDe = (servicioId: string) =>
    preciosPorCliente[clienteId]?.[servicioId] ??
    servicios.find((s) => s.id === servicioId)?.precioBase ??
    0;

  const total = lineas.reduce((suma, l) => {
    if (!l.servicioId) return suma;
    const cantidad = Number(l.cantidad) || 0;
    return suma + precioDe(l.servicioId) * cantidad;
  }, 0);

  const dias = fecha ? diasHabilesHasta(fecha) : null;

  const cargaUtil = lineas
    .filter((l) => l.servicioId)
    .map((l) => ({
      servicioId: l.servicioId,
      cantidad: Number(l.cantidad) || 1,
      piezasFdi: l.piezas,
      colorId: l.colorId,
    }));

  const listo =
    Boolean(clienteId && doctorId && pacienteId && fecha) &&
    cargaUtil.length > 0 &&
    !cliente?.bloqueado;

  const actualizar = (clave: string, cambio: Partial<Linea>) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));

  return (
    <form action={accion} className="flex flex-col gap-s4">
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <input type="hidden" name="fechaComprometida" value={fecha} />
      <input type="hidden" name="prioridad" value={prioridad} />
      <input type="hidden" name="tipoRecepcion" value={tipoRecepcion} />
      <input type="hidden" name="indicaciones" value={indicaciones} />
      <input type="hidden" name="lineas" value={JSON.stringify(cargaUtil)} />

      {/* ── quién ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Cliente, doctor y paciente
        </h2>

        <div className="grid gap-s3 lg:grid-cols-3">
          <Campo etiqueta="Se factura a *" id={`${idForm}-cli`}>
            <select
              id={`${idForm}-cli`}
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                // El doctor cuelga del cliente: al cambiarlo, el anterior
                // dejaría de pertenecerle y la base lo rechazaría.
                setDoctorId("");
              }}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              <option value="">Elige un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial}
                  {c.bloqueado ? " · BLOQUEADO" : ""}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            etiqueta="Doctor que lo pide *"
            id={`${idForm}-doc`}
            ayuda={
              clienteId && susDoctores.length === 0
                ? "Este cliente no tiene doctores registrados."
                : undefined
            }
          >
            <select
              id={`${idForm}-doc`}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={!clienteId}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc disabled:opacity-50"
            >
              <option value="">
                {clienteId ? "Elige un doctor…" : "Elige antes el cliente"}
              </option>
              {susDoctores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Paciente *" id={`${idForm}-pac`}>
            <select
              id={`${idForm}-pac`}
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              <option value="">Elige un paciente…</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {cliente?.bloqueado ? (
          <p className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
            {cliente.razonSocial} está bloqueado comercialmente. No se le pueden
            registrar órdenes hasta que se levante el bloqueo.
          </p>
        ) : null}
      </section>

      {/* ── qué ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Trabajos
          </h2>
          <span className="font-mono text-sm tabular-nums text-ink-2">
            {soles.format(total)} <span className="text-xs text-ink-3">sin IGV</span>
          </span>
        </div>

        {lineas.map((l, i) => {
          const servicio = servicios.find((s) => s.id === l.servicioId);
          const arcada = arcadaDePiezas(l.piezas);
          const precio = l.servicioId ? precioDe(l.servicioId) : null;

          return (
            <div
              key={l.clave}
              className="flex flex-col gap-s3 rounded-r1 border border-line bg-card-2 p-s3"
            >
              <div className="flex flex-wrap items-end gap-s3">
                <div className="min-w-[240px] flex-1">
                  <Campo etiqueta={`Servicio ${i + 1} *`} id={`${idForm}-s${l.clave}`}>
                    <select
                      id={`${idForm}-s${l.clave}`}
                      value={l.servicioId}
                      onChange={(e) => actualizar(l.clave, { servicioId: e.target.value })}
                      className="h-[38px] w-full rounded-r1 border border-line bg-card px-s2 text-base outline-none focus-visible:border-acc"
                    >
                      <option value="">Elige un servicio…</option>
                      {servicios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.codigo} · {s.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>

                <Campo etiqueta="Cantidad" id={`${idForm}-c${l.clave}`}>
                  <input
                    id={`${idForm}-c${l.clave}`}
                    type="number"
                    min={1}
                    max={99}
                    step="1"
                    value={l.cantidad}
                    onChange={(e) => actualizar(l.clave, { cantidad: e.target.value })}
                    className="h-[38px] w-[90px] rounded-r1 border border-line bg-card px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
                  />
                </Campo>

                <Campo etiqueta="Color" id={`${idForm}-col${l.clave}`}>
                  <select
                    id={`${idForm}-col${l.clave}`}
                    value={l.colorId}
                    onChange={(e) => actualizar(l.clave, { colorId: e.target.value })}
                    className="h-[38px] w-[130px] rounded-r1 border border-line bg-card px-s2 text-base outline-none focus-visible:border-acc"
                  >
                    <option value="">Sin color</option>
                    {colores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo}
                      </option>
                    ))}
                  </select>
                </Campo>

                <div className="flex min-w-[110px] flex-col items-end gap-s1">
                  <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
                    Importe
                  </span>
                  <span className="font-mono text-base tabular-nums">
                    {precio !== null
                      ? soles.format(precio * (Number(l.cantidad) || 0))
                      : "—"}
                  </span>
                </div>

                {lineas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setLineas(lineas.filter((x) => x.clave !== l.clave))}
                    className="h-[38px] rounded-r1 border border-line bg-card px-s3 text-sm text-err hover:bg-err-bg"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>

              {servicio && !servicio.tieneFlujo ? (
                <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
                  {servicio.codigo} no tiene flujo de producción: esta orden no
                  generará ninguna tarea para ese trabajo.
                </p>
              ) : null}

              {/* M-08: la pieza se elige, no se teclea. Una corona hecha
                  para el 16 cuando iba al 26 se tira entera. */}
              <div className="flex flex-col gap-s2">
                <div className="flex flex-wrap items-baseline justify-between gap-s2">
                  <span className="font-mono text-xs uppercase tracking-wide text-ink-2">
                    Piezas dentales (FDI)
                  </span>
                  <span className="font-mono text-xs text-ink-3">
                    {l.piezas.length === 0
                      ? "ninguna seleccionada"
                      : `${l.piezas.join(", ")} · arcada ${arcada}`}
                  </span>
                </div>
                <Odontograma
                  seleccionadas={l.piezas}
                  onToggle={(pieza) =>
                    actualizar(l.clave, {
                      piezas: l.piezas.includes(pieza)
                        ? l.piezas.filter((p) => p !== pieza)
                        : [...l.piezas, pieza].sort(),
                    })
                  }
                />
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setLineas([...lineas, lineaVacia(`l${siguiente}`)]);
            setSiguiente(siguiente + 1);
          }}
          className="h-tap self-start rounded-r1 border border-dashed border-line-2 px-s4 text-sm text-ink-2 hover:border-acc hover:text-ink"
        >
          + Añadir otro trabajo
        </button>
      </section>

      {/* ── cuándo y cómo ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Entrega e indicaciones
        </h2>

        <div className="grid gap-s3 lg:grid-cols-3">
          <Campo
            etiqueta="Fecha comprometida *"
            id={`${idForm}-f`}
            ayuda={
              dias === null
                ? undefined
                : dias === 0
                  ? "Para hoy."
                  : `${dias} ${dias === 1 ? "día hábil" : "días hábiles"} de plazo.`
            }
          >
            <input
              id={`${idForm}-f`}
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base outline-none focus-visible:border-acc"
            />
          </Campo>

          <Campo etiqueta="Prioridad" id={`${idForm}-p`}>
            <select
              id={`${idForm}-p`}
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Cómo llegó" id={`${idForm}-tr`}>
            <select
              id={`${idForm}-tr`}
              value={tipoRecepcion}
              onChange={(e) => setTipoRecepcion(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              {TIPOS_RECEPCION.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Indicaciones del doctor" id={`${idForm}-i`}>
          <textarea
            id={`${idForm}-i`}
            rows={3}
            value={indicaciones}
            onChange={(e) => setIndicaciones(e.target.value)}
            placeholder="Contacto oclusal ligero, respetar el perfil de emergencia…"
            className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none placeholder:text-ink-3 focus-visible:border-acc"
          />
        </Campo>
      </section>

      {estado.mensaje && !estado.ok ? (
        <p role="alert" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
          {estado.mensaje}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-s3">
        <p className="max-w-[560px] text-sm leading-relaxed text-ink-3">
          El importe es orientativo: el precio definitivo lo resuelve MEFLAB al
          registrar, contra la lista del cliente. Así el mismo doctor no ve dos
          cifras para el mismo trabajo.
        </p>
        <button
          type="submit"
          disabled={enviando || !listo}
          className={cn(
            "h-tap rounded-r1 bg-acc px-s5 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110",
            "disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none",
          )}
        >
          {enviando ? "Registrando…" : "Registrar orden"}
        </button>
      </div>
    </form>
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
