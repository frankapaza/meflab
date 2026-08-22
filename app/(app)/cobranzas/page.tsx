import Link from "next/link";
import { redirect } from "next/navigation";

import { Barras } from "@/components/graficos";
import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { RESULTADOS } from "@/lib/dominio/cobranza";
import { TRAMOS, type Tramo } from "@/lib/validaciones/facturacion";

import { RegistrarGestion } from "./gestion";
import { Agenda } from "./agenda";

export const metadata = { title: "Cobranza · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const solesCorto = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

const fecha = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

type FilaCartera = {
  cuenta_cobrar_id: string;
  cliente_id: string;
  razon_social: string;
  documento: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  importe_original: number;
  saldo: number;
  dias_mora: number;
  tramo: Tramo;
};

export default async function CobranzaPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  // TODO lo de esta pantalla sale de v_cartera. Es la regla 2 del
  // proyecto: ninguna cifra de deuda se calcula en otro sitio, ni siquiera
  // "sólo para este resumen". Así fue como aparecieron las tres cifras.
  const [
    { data: cartera },
    { data: deudaPorCliente },
    { data: promesas },
    { data: gestiones },
  ] = await Promise.all([
    supabase.from("v_cartera").select("*").order("dias_mora", { ascending: false }),
    supabase.from("v_deuda_cliente").select("*").order("deuda_total", { ascending: false }),
    // Las promesas vigentes ordenadas por fecha: eso ES la agenda del día.
    supabase
      .from("promesa_pago")
      .select("id, fecha_prometida, importe, estado, cliente:cliente_id(razon_social)")
      .eq("estado", "vigente")
      .order("fecha_prometida"),
    supabase
      .from("gestion_cobranza")
      .select("id, gestionado_en, canal, resultado, notas, cliente:cliente_id(razon_social), usuario:gestionado_por(nombre)")
      .order("gestionado_en", { ascending: false })
      .limit(12),
  ]);

  const filas = (cartera ?? []) as unknown as FilaCartera[];

  const total = filas.reduce((s, f) => s + Number(f.saldo), 0);

  // La suma de los tramos tiene que dar exactamente `total`. Es la prueba
  // concreta de que H-01 quedó cerrado, y se enseña en pantalla para que
  // se pueda verificar a simple vista.
  const porTramo = TRAMOS.map((t) => ({
    ...t,
    saldo: filas
      .filter((f) => f.tramo === t.id)
      .reduce((s, f) => s + Number(f.saldo), 0),
    documentos: filas.filter((f) => f.tramo === t.id).length,
  }));

  const sumaTramos = porTramo.reduce((s, t) => s + t.saldo, 0);
  const cuadra = Math.abs(sumaTramos - total) < 0.005;

  const vencido = porTramo
    .filter((t) => t.vencido)
    .reduce((s, t) => s + t.saldo, 0);

  const puedeGestionar = ctx.roles.some((r) =>
    ["recepcion", "administrador", "gerencia"].includes(r),
  );

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

  const listaPromesas = ((promesas ?? []) as unknown as {
    id: string;
    fecha_prometida: string;
    importe: number;
    cliente: { razon_social: string } | null;
  }[]).map((p) => ({
    id: p.id,
    fechaPrometida: p.fecha_prometida,
    importe: Number(p.importe),
    cliente: p.cliente?.razon_social ?? "—",
  }));

  const listaGestiones = (gestiones ?? []) as unknown as {
    id: string;
    gestionado_en: string;
    canal: string;
    resultado: string;
    notas: string | null;
    cliente: { razon_social: string } | null;
    usuario: { nombre: string } | null;
  }[];

  const clientes = (deudaPorCliente ?? []) as unknown as {
    cliente_id: string;
    razon_social: string;
    deuda_total: number;
    vencido: number | null;
    documentos_abiertos: number;
    mora_maxima: number;
  }[];

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Dinero
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Cobranza</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          H-01
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Todo lo de esta pantalla se lee de{" "}
          <code className="font-mono text-xs">v_cartera</code>, la única fuente
          de deuda del sistema. El dashboard, la lista de clientes y
          facturación leen de la misma — por eso enseñan la misma cifra.
        </p>
      </div>

      <div className="grid gap-s3 sm:grid-cols-3">
        <Kpi etiqueta="Por cobrar" valor={soles.format(total)} nota={`${filas.length} documentos abiertos`} />
        <Kpi
          etiqueta="Vencido"
          valor={soles.format(vencido)}
          nota={total > 0 ? `${Math.round((vencido / total) * 100)} % de la cartera` : "—"}
          alerta={vencido > 0}
        />
        <Kpi
          etiqueta="Clientes con deuda"
          valor={String(clientes.length)}
          nota={
            clientes[0] ? `mayor: ${clientes[0].razon_social}` : "ninguno"
          }
        />
      </div>

      {/* La comprobación de H-01, a la vista. Si alguna vez deja de
          cuadrar, la pantalla lo dice en lugar de disimularlo. */}
      <div
        className={`rounded-r1 border px-s3 py-s2 text-sm ${
          cuadra ? "border-ok bg-ok-bg text-ok" : "border-err bg-err-bg text-err"
        }`}
      >
        <span aria-hidden="true">{cuadra ? "■" : "▲"}</span>{" "}
        {cuadra ? (
          <>
            Los tramos suman <b className="font-semibold">{soles.format(sumaTramos)}</b>,
            exactamente el total por cobrar. H-01 sigue cerrado.
          </>
        ) : (
          <>
            <b className="font-semibold">Descuadre:</b> los tramos suman{" "}
            {soles.format(sumaTramos)} y el total es {soles.format(total)}. Hay
            dos cifras de deuda — H-01 se ha reabierto.
          </>
        )}
      </div>

      <div className="grid gap-s3 lg:grid-cols-2">
        <Barras
          titulo="Aging de la cartera"
          descripcion="Cuánto se debe en cada tramo de mora. Los tramos son excluyentes: cada documento cae en uno solo."
          datos={porTramo.map((t) => ({
            etiqueta: t.etiqueta,
            valor: t.saldo,
            glifo: t.glifo,
          }))}
          formato={(n) => solesCorto.format(n)}
        />

        <Barras
          titulo="Quién debe más"
          descripcion="Por saldo pendiente. Sale de la misma fuente que el aging."
          datos={clientes.slice(0, 6).map((c) => ({
            etiqueta: c.razon_social,
            valor: Number(c.deuda_total),
          }))}
          formato={(n) => solesCorto.format(n)}
        />
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Cartera priorizada
          </h2>
          <span className="font-mono text-xs text-ink-3">
            de mayor a menor mora
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="grid min-h-[200px] place-items-center p-s6">
            <div className="flex max-w-[420px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                Nadie debe nada
              </h3>
              <p className="text-base leading-relaxed text-ink-2">
                No hay documentos con saldo pendiente. La deuda aparece aquí
                cuando se emite una factura desde{" "}
                <Link href="/facturacion" className="text-acc hover:underline">
                  Facturación
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Documento</th>
                  <th className="px-pad-x py-s2 font-medium">Cliente</th>
                  <th className="px-pad-x py-s2 font-medium">Vence</th>
                  <th className="px-pad-x py-s2 font-medium">Mora</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Original</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Saldo</th>
                  {puedeGestionar ? (
                    <th className="px-pad-x py-s2 text-right font-medium">Gestión</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const t = TRAMOS.find((x) => x.id === f.tramo)!;
                  const dias = Number(f.dias_mora);

                  return (
                    <tr key={f.cuenta_cobrar_id} className="border-b border-line last:border-0">
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="font-mono text-sm">{f.documento}</span>
                          <span className="font-mono text-xs uppercase text-ink-3">
                            {f.tipo_documento}
                          </span>
                        </div>
                      </td>
                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        {f.razon_social}
                      </td>
                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {fecha.format(new Date(`${f.fecha_vencimiento}T12:00:00`))}
                      </td>
                      {/* El glifo lleva el nivel de mora; el color sólo lo
                          refuerza. El aging se imprime y se revisa en
                          reuniones, a veces en blanco y negro. */}
                      <td className="px-pad-x py-s3">
                        <span
                          className={`font-mono text-sm ${
                            !t.vencido
                              ? "text-ink-2"
                              : f.tramo === "mas_90"
                                ? "text-err"
                                : "text-warn"
                          }`}
                        >
                          <span aria-hidden="true">{t.glifo}</span>{" "}
                          {dias < 0 ? `en ${Math.abs(dias)} d` : `${dias} d`}
                        </span>
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-3">
                        {soles.format(Number(f.importe_original))}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm font-semibold tabular-nums">
                        {soles.format(Number(f.saldo))}
                      </td>
                      {puedeGestionar ? (
                        <td className="px-pad-x py-s3 text-right">
                          <RegistrarGestion
                            clienteId={f.cliente_id}
                            cuentaCobrarId={f.cuenta_cobrar_id}
                            cliente={f.razon_social}
                            documento={f.documento}
                            saldo={Number(f.saldo)}
                            diasMora={dias}
                            tramo={f.tramo}
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line-2 bg-card-2">
                  <td colSpan={5} className="px-pad-x py-s3 text-right text-sm font-semibold">
                    Total por cobrar
                  </td>
                  <td className="px-pad-x py-s3 text-right font-mono text-base font-semibold tabular-nums">
                    {soles.format(total)}
                  </td>
                  {puedeGestionar ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── seguimiento (M-04) ───────────────────────────────────────── */}
      {puedeGestionar ? (
        <div className="grid gap-s3 lg:grid-cols-2">
          <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
            <div className="flex flex-wrap items-baseline justify-between gap-s3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
                Agenda de compromisos
              </h2>
              <span className="font-mono text-xs text-ink-3">
                lo que alguien prometió pagar
              </span>
            </div>
            <Agenda promesas={listaPromesas} hoy={hoy} />
          </section>

          <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
            <div className="flex flex-wrap items-baseline justify-between gap-s3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
                Últimas gestiones
              </h2>
              <span className="font-mono text-xs text-ink-3">
                {listaGestiones.length} registradas
              </span>
            </div>

            {listaGestiones.length === 0 ? (
              <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
                Todavía no se ha registrado ninguna gestión. «Llamé tres
                veces y no contestan» sólo vale si las tres están escritas.
              </p>
            ) : (
              <ul className="flex flex-col">
                {listaGestiones.map((g) => {
                  const r = RESULTADOS.find((x) => x.valor === g.resultado);
                  return (
                    <li
                      key={g.id}
                      className="flex flex-col gap-[2px] border-b border-line py-s2 last:border-0"
                    >
                      <div className="flex flex-wrap items-baseline gap-s2">
                        <span className="font-mono text-sm" aria-hidden="true">
                          {r?.glifo ?? "·"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {g.cliente?.razon_social ?? "—"}
                        </span>
                        <span className="font-mono text-xs uppercase text-ink-3">
                          {r?.etiqueta ?? g.resultado} · {g.canal}
                        </span>
                        <span className="font-mono text-xs text-ink-3">
                          {fecha.format(new Date(g.gestionado_en))}
                        </span>
                      </div>
                      {g.notas ? (
                        <p className="text-sm leading-relaxed text-ink-2">{g.notas}</p>
                      ) : null}
                      {g.usuario ? (
                        <span className="font-mono text-xs text-ink-3">
                          {g.usuario.nombre}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  nota,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex flex-col gap-s1 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</span>
      <span className={`font-mono text-xs ${alerta ? "text-warn" : "text-ink-3"}`}>
        {alerta ? "▲ " : ""}
        {nota}
      </span>
    </div>
  );
}
