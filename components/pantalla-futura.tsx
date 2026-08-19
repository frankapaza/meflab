import Link from "next/link";

/**
 * Pantalla de un módulo que todavía no se ha construido.
 *
 * La barra lateral enseña a propósito lo que viene, con su marca de fase:
 * el laboratorio ve el camino completo y no cree que MEFLAB "no lo hace".
 * Pero un enlace que lleva al 404 crudo de Next dice lo contrario —parece
 * un error del sistema, no una fase pendiente— y es peor que no tener el
 * enlace.
 *
 * Esto es lo que responde en su lugar: qué traerá, cuándo, y qué se puede
 * hacer hoy mientras tanto.
 */
export function PantallaFutura({
  modulo,
  titulo,
  fase,
  semana,
  traera,
  mientras,
}: {
  /** Referencia del módulo en docs/04, p. ej. "2.5". */
  modulo: string;
  titulo: string;
  fase: 2 | 3 | 4;
  semana: string;
  traera: string[];
  mientras?: { texto: string; href: string; enlace: string };
}) {
  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Módulo {modulo}
        </span>
        <div className="flex flex-wrap items-center gap-s3">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <span className="rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-2">
            FASE {fase}
          </span>
        </div>
      </header>

      <div className="flex max-w-[720px] flex-col gap-s4 rounded-r2 border border-line bg-card p-s5 shadow-e1">
        <div className="flex items-start gap-s3">
          <span
            aria-hidden="true"
            className="grid size-[40px] shrink-0 place-items-center rounded-r2 border border-dashed border-line-2 text-xl text-ink-3"
          >
            ○
          </span>
          <div className="flex flex-col gap-s1">
            <h2 className="text-xl font-semibold tracking-tight">
              Todavía no está construido
            </h2>
            <p className="text-base leading-relaxed text-ink-2">
              Entra en la <b className="font-semibold text-ink">Fase {fase}</b>,
              prevista para la {semana}. No es un error: la pantalla existe en
              el plan y en el prototipo, pero aún no se ha escrito.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-s2 border-t border-line pt-s4">
          <h3 className="font-mono text-xs uppercase tracking-wide text-ink-2">
            Qué traerá
          </h3>
          <ul className="flex flex-col gap-s1">
            {traera.map((t) => (
              <li key={t} className="flex gap-s2 text-base leading-relaxed text-ink-2">
                <span aria-hidden="true" className="shrink-0 font-mono text-ink-3">
                  ·
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {mientras ? (
          <div className="flex flex-col gap-s2 border-t border-line pt-s4">
            <h3 className="font-mono text-xs uppercase tracking-wide text-ink-2">
              Mientras tanto
            </h3>
            <p className="text-base leading-relaxed text-ink-2">
              {mientras.texto}{" "}
              <Link href={mientras.href} className="text-acc hover:underline">
                {mientras.enlace}
              </Link>
              .
            </p>
          </div>
        ) : null}
      </div>

      {/* D-02, dicho también aquí: es el módulo del dinero el que decide la
          deuda, y hasta que exista no hay ninguna cifra de deuda en MEFLAB
          — ni calculada de otra forma "provisional". Así es como se acaba
          con tres cifras distintas para lo mismo. */}
      {fase === 2 ? (
        <p className="max-w-[720px] text-sm leading-relaxed text-ink-3">
          Hasta que exista este módulo, MEFLAB no enseña ninguna cifra de
          deuda en ninguna pantalla. Calcularla «provisionalmente» de otra
          forma es exactamente como se acaba con tres cifras distintas para
          la misma deuda.
        </p>
      ) : null}
    </div>
  );
}
