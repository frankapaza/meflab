import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Dashboard provisional.
 *
 * Existe para comprobar de extremo a extremo que la sesión llega al
 * servidor con sus claims y que RLS filtra de verdad. El dashboard real
 * —con los seis gráficos por rol— es la historia 16 de la Fase 1.
 */
export default async function Inicio() {
  const supabase = await crearClienteServidor();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const roles = Array.isArray(claims?.roles) ? (claims.roles as string[]) : [];

  // Todo esto pasa por RLS: sólo devuelve lo del propio laboratorio.
  const [{ data: estados }, { data: listas }, { count: usuarios }] = await Promise.all([
    supabase.from("estado_trabajo").select("glifo, nombre, color").order("orden"),
    supabase.from("lista_precio").select("nombre, precios_incluyen_igv"),
    supabase.from("usuario").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="flex flex-col gap-s5 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">Inicio</span>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          Fase 0
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          El armazón está en pie: sesión, guardas por rol, tokens y layout. El
          dashboard con los seis gráficos por rol es la historia 16 del MVP —
          está diseñado en <code className="font-mono">docs/prototipo/</code>.
        </p>
      </div>

      <div className="grid gap-s3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <Tarjeta titulo="Roles del token" valor={String(roles.length)}>
          <div className="flex flex-wrap gap-s1">
            {roles.map((r) => (
              <span
                key={r}
                className="rounded-r1 bg-acc-bg px-s2 py-[3px] font-mono text-xs font-semibold text-acc"
              >
                {r}
              </span>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Usuarios del laboratorio" valor={String(usuarios ?? 0)}>
          <span className="text-sm text-ink-2">visibles a través de RLS</span>
        </Tarjeta>

        <Tarjeta titulo="Estados configurados" valor={String(estados?.length ?? 0)}>
          <span className="text-sm text-ink-2">ciclo real de M‑01</span>
        </Tarjeta>

        <Tarjeta titulo="Listas de precio" valor={String(listas?.length ?? 0)}>
          <div className="flex flex-col gap-s1">
            {listas?.map((l) => (
              <span key={l.nombre} className="text-sm text-ink-2">
                {l.nombre} ·{" "}
                <span className={l.precios_incluyen_igv ? "text-warn" : "text-ink-3"}>
                  {l.precios_incluyen_igv ? "captura con IGV" : "captura sin IGV"}
                </span>
              </span>
            ))}
          </div>
        </Tarjeta>
      </div>

      <section className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Los 10 estados de trabajo
          </h2>
          <span className="font-mono text-xs text-ink-3">
            el glifo sostiene el significado, no el color
          </span>
        </div>
        <div className="flex flex-wrap gap-s2 p-pad-x">
          {estados?.map((e) => (
            <span
              key={e.nombre}
              className="inline-flex items-center gap-s2 rounded-r1 bg-fill px-s3 py-s2 text-xs text-ink-2"
            >
              <span className="font-mono" style={{ color: e.color ?? undefined }}>
                {e.glifo}
              </span>
              {e.nombre}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  children,
}: {
  titulo: string;
  valor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-s2 rounded-r2 border border-line bg-card p-pad-x shadow-e1">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">{titulo}</span>
      <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
        {valor}
      </span>
      {children}
    </div>
  );
}
