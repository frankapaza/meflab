import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { Anticipos, type Anticipo } from "./anticipos";
import {
  AbrirCaja,
  CerrarCaja,
  NuevoMovimiento,
  RegistrarPago,
  type DeudaCliente,
} from "./controles";

export const metadata = { title: "Caja · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const hora = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

export default async function CajaPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: sesion }, { data: clientes }, { data: cartera }, { data: cerradas }] =
    await Promise.all([
      supabase
        .from("caja_sesion")
        .select("id, abierta_en, monto_apertura, abierta_por")
        .eq("estado", "abierta")
        .maybeSingle(),
      supabase
        .from("cliente")
        .select("id, razon_social")
        .eq("bloqueado", false)
        .order("razon_social"),
      // La deuda para el reparto sale de v_cartera, igual que en cobranza.
      // Si esta pantalla la calculara aparte, volverían las dos cifras.
      supabase
        .from("v_cartera")
        .select("cuenta_cobrar_id, cliente_id, documento, saldo, dias_mora"),
      supabase
        .from("caja_sesion")
        .select(
          "id, abierta_en, cerrada_en, monto_apertura, monto_teorico, monto_fisico, diferencia",
        )
        .eq("estado", "cerrada")
        .order("cerrada_en", { ascending: false })
        .limit(8),
    ]);

  // Saldo a favor sin imputar. Es dinero del cliente que el laboratorio
  // tiene: si no se ve, la factura sigue figurando impagada y el cliente
  // jura que ya pagó. Los dos tienen razón, y nadie lo entiende.
  const { data: pagosAFavor } = await supabase
    .from("pago")
    .select("id, cliente_id, fecha, medio, sin_aplicar, observaciones, cliente:cliente_id(razon_social)")
    .eq("anulado", false)
    .gt("sin_aplicar", 0)
    .order("fecha");

  const anticipos: Anticipo[] = ((pagosAFavor ?? []) as unknown as {
    id: string;
    cliente_id: string;
    fecha: string;
    medio: string;
    sin_aplicar: number;
    observaciones: string | null;
    cliente: { razon_social: string } | null;
  }[]).map((p) => ({
    id: p.id,
    clienteId: p.cliente_id,
    cliente: p.cliente?.razon_social ?? "—",
    fecha: p.fecha,
    medio: p.medio,
    sinAplicar: Number(p.sin_aplicar),
    observaciones: p.observaciones,
  }));

  let movimientos: {
    id: string;
    tipo: string;
    categoria: string;
    concepto: string;
    importe: number;
    created_at: string;
  }[] = [];

  if (sesion) {
    const { data } = await supabase
      .from("caja_movimiento")
      .select("id, tipo, categoria, concepto, importe, created_at")
      .eq("sesion_id", sesion.id)
      .order("created_at");
    movimientos = (data ?? []) as typeof movimientos;
  }

  const ingresos = movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((s, m) => s + Number(m.importe), 0);
  const egresos = movimientos
    .filter((m) => m.tipo === "egreso")
    .reduce((s, m) => s + Number(m.importe), 0);
  const teorico = sesion ? Number(sesion.monto_apertura) + ingresos - egresos : 0;

  const deudas: DeudaCliente[] = ((cartera ?? []) as unknown as {
    cuenta_cobrar_id: string;
    cliente_id: string;
    documento: string;
    saldo: number;
    dias_mora: number;
  }[]).map((d) => ({
    cuentaCobrarId: d.cuenta_cobrar_id,
    clienteId: d.cliente_id,
    documento: d.documento,
    saldo: Number(d.saldo),
    diasMora: Number(d.dias_mora),
  }));

  const opcionesCliente = (clientes ?? []).map((c) => ({
    id: c.id,
    razonSocial: c.razon_social,
  }));

  const puedeOperar = ctx.roles.some((r) => ["recepcion", "administrador"].includes(r));

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Dinero
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          Efectivo
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Aquí sólo entra <b className="font-semibold text-ink">efectivo</b>.
          Una transferencia no pasa por el cajón: registrarla en caja haría
          que el arqueo no cuadre nunca y que la caja deje de servir para
          detectar un descuadre real.
        </p>
      </div>

      {/* ── cobrar ───────────────────────────────────────────────────── */}
      {puedeOperar ? (
        <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Registrar un pago
          </h2>
          <RegistrarPago
            clientes={opcionesCliente}
            deudas={deudas}
            sesionCaja={sesion?.id ?? null}
          />
        </section>
      ) : null}

      {/* ── saldo a favor ────────────────────────────────────────────── */}
      {puedeOperar ? (
        <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
          <div className="flex flex-wrap items-baseline justify-between gap-s3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
              Saldo a favor de clientes
            </h2>
            <span className="font-mono text-xs text-ink-3">
              no es deuda: es dinero suyo
            </span>
          </div>
          <Anticipos anticipos={anticipos} deudas={deudas} />
        </section>
      ) : null}

      {/* ── sesión ───────────────────────────────────────────────────── */}
      {!sesion ? (
        <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Caja cerrada
          </h2>
          <p className="text-sm leading-relaxed text-ink-2">
            No hay ninguna caja abierta. Ábrela con el efectivo que haya en el
            cajón para empezar el día.
          </p>
          {puedeOperar ? <AbrirCaja /> : null}
        </section>
      ) : (
        <>
          <div className="grid gap-s3 sm:grid-cols-4">
            <Kpi
              etiqueta="Apertura"
              valor={soles.format(Number(sesion.monto_apertura))}
              nota={hora.format(new Date(sesion.abierta_en))}
            />
            <Kpi etiqueta="Ingresos" valor={soles.format(ingresos)} nota={`${movimientos.filter((m) => m.tipo === "ingreso").length} movimientos`} />
            <Kpi etiqueta="Egresos" valor={soles.format(egresos)} nota={`${movimientos.filter((m) => m.tipo === "egreso").length} movimientos`} />
            <Kpi
              etiqueta="Debería haber"
              valor={soles.format(teorico)}
              nota="apertura + ingresos − egresos"
              destacado
            />
          </div>

          <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
              Movimientos de la sesión
            </h2>

            {movimientos.length === 0 ? (
              <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
                Todavía no hay movimientos en esta caja.
              </p>
            ) : (
              <ul className="flex flex-col">
                {movimientos.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-s3 border-b border-line py-s2 last:border-0"
                  >
                    {/* El glifo lleva el signo, no sólo el color. */}
                    <span
                      aria-hidden="true"
                      className={`font-mono text-sm ${m.tipo === "ingreso" ? "text-ok" : "text-warn"}`}
                    >
                      {m.tipo === "ingreso" ? "▲" : "▼"}
                    </span>
                    <span className="min-w-[180px] flex-1 truncate text-sm">
                      {m.concepto}
                    </span>
                    <span className="font-mono text-xs uppercase text-ink-3">
                      {m.categoria}
                    </span>
                    <span className="font-mono text-xs text-ink-3">
                      {hora.format(new Date(m.created_at))}
                    </span>
                    <span
                      className={`w-[110px] shrink-0 text-right font-mono text-sm tabular-nums ${
                        m.tipo === "ingreso" ? "text-ok" : "text-warn"
                      }`}
                    >
                      {m.tipo === "ingreso" ? "+" : "−"}
                      {soles.format(Number(m.importe))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {puedeOperar ? (
              <div className="border-t border-line pt-s3">
                <NuevoMovimiento sesionId={sesion.id} />
              </div>
            ) : null}
          </section>

          {puedeOperar ? (
            <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
                Cierre y arqueo
              </h2>
              <CerrarCaja sesionId={sesion.id} teorico={teorico} />
            </section>
          ) : null}
        </>
      )}

      {/* ── historial ────────────────────────────────────────────────── */}
      {(cerradas ?? []).length > 0 ? (
        <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
          <div className="border-b border-line bg-card-2 px-pad-x py-s3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
              Cierres anteriores
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Cerrada</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Apertura</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Teórico</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Contado</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {(cerradas ?? []).map((c) => {
                  const dif = Number(c.diferencia ?? 0);
                  return (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {c.cerrada_en ? hora.format(new Date(c.cerrada_en)) : "—"}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-3">
                        {soles.format(Number(c.monto_apertura))}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                        {soles.format(Number(c.monto_teorico ?? 0))}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums">
                        {soles.format(Number(c.monto_fisico ?? 0))}
                      </td>
                      <td
                        className={`px-pad-x py-s3 text-right font-mono text-sm tabular-nums ${
                          dif === 0 ? "text-ok" : "text-warn"
                        }`}
                      >
                        <span aria-hidden="true">{dif === 0 ? "■" : "▲"}</span>{" "}
                        {soles.format(dif)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  nota,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-s1 rounded-r2 border bg-card p-s4 shadow-e1 ${
        destacado ? "border-acc" : "border-line"
      }`}
    >
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</span>
      <span className="font-mono text-xs text-ink-3">{nota}</span>
    </div>
  );
}
