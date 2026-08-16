import { salir } from "@/app/(auth)/login/acciones";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Inicio provisional. Existe para verificar de extremo a extremo que la
 * sesión llega al servidor con sus claims. El layout real es el
 * entregable 0.7.
 */
export default async function Inicio() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const roles = Array.isArray(claims?.roles) ? (claims.roles as string[]) : [];

  // Lee a través de RLS: sólo devuelve el laboratorio del propio usuario.
  const { data: lab } = await supabase.from("tenant").select("nombre").single();
  const { data: estados } = await supabase
    .from("estado_trabajo")
    .select("glifo, nombre")
    .order("orden");

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-s5 p-s6">
      <header className="flex flex-wrap items-center gap-s3">
        <div>
          <p className="font-mono text-1 uppercase tracking-wide text-ink-3">
            {lab?.nombre ?? "sin laboratorio"}
          </p>
          <h1 className="text-6 font-semibold tracking-tight">Sesión iniciada</h1>
        </div>
        <div className="flex-1" />
        <form action={salir}>
          <button className="h-tap rounded-r1 border border-line bg-card px-s3 font-mono text-1 text-ink-2 hover:bg-fill">
            SALIR
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <h2 className="font-mono text-1 uppercase tracking-wide text-ink-3">
          Lo que dice tu token
        </h2>
        <dl className="flex flex-col gap-s2 text-3">
          <div className="flex justify-between gap-s3 border-b border-line pb-s2">
            <dt className="text-ink-2">Correo</dt>
            <dd className="num">{String(claims?.email ?? "—")}</dd>
          </div>
          <div className="flex justify-between gap-s3 border-b border-line pb-s2">
            <dt className="text-ink-2">Laboratorio</dt>
            <dd className="num text-2">{String(claims?.tenant_id ?? "—")}</dd>
          </div>
          <div className="flex justify-between gap-s3">
            <dt className="text-ink-2">Roles</dt>
            <dd className="flex flex-wrap gap-s1">
              {roles.map((r) => (
                <span
                  key={r}
                  className="rounded-r1 bg-acc-bg px-s2 py-[3px] font-mono text-1 font-semibold text-acc"
                >
                  {r}
                </span>
              ))}
            </dd>
          </div>
        </dl>
        <p className="text-2 leading-relaxed text-ink-2">
          Los permisos son la <b className="font-semibold text-ink">unión</b> de
          todos tus roles. Ningún rol compuesto, ninguna excepción en el código.
        </p>
      </section>

      <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
        <h2 className="font-mono text-1 uppercase tracking-wide text-ink-3">
          Leído a través de RLS · {estados?.length ?? 0} estados
        </h2>
        <div className="flex flex-wrap gap-s2">
          {estados?.map((e) => (
            <span
              key={e.nombre}
              className="inline-flex items-center gap-s2 rounded-r1 bg-fill px-s3 py-s1 text-1 text-ink-2"
            >
              <span className="font-mono">{e.glifo}</span>
              {e.nombre}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
