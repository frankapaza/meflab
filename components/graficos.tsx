import { cn } from "@/lib/utils";

/**
 * Gráficos en SVG puro, sin librería.
 *
 * Reglas que se respetan aquí y que no son estéticas:
 *
 * · UN solo eje por gráfico. Nunca dos escalas verticales: dos magnitudes
 *   distintas son dos gráficos, no uno con truco.
 * · El glifo sostiene el significado y el color lo refuerza. Nada se
 *   transmite sólo por color — el tablero se imprime en gris y hay
 *   daltonismo.
 * · La FLECHA sigue la dirección real del dato; el COLOR dice si eso es
 *   bueno. "Atrasados bajó 25 %" es ▼ verde, nunca ▲ verde.
 * · Una meta puede ser un SUELO (puntualidad) o un TECHO (capacidad).
 *   Estar por debajo del techo es bueno; no todo indicador mejora subiendo.
 *
 * La paleta de datos no es el verde de marca: con croma 0,086 se lee gris
 * como marca de gráfico. Se usa una paleta propia, validada aparte.
 */

export const SERIE = ["var(--dato-1)", "var(--dato-2)", "var(--dato-3)"] as const;

/* ── Tarjeta de KPI con variación ──────────────────────────────────── */

export function Kpi({
  etiqueta,
  valor,
  unidad,
  variacion,
  bueno = "up",
  nota,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  /** Variación porcentual respecto al periodo anterior. */
  variacion?: number | null;
  /** Qué dirección es buena para ESTE indicador. */
  bueno?: "up" | "down";
  nota?: string;
}) {
  const sube = (variacion ?? 0) > 0;
  const plano = variacion === null || variacion === undefined || variacion === 0;
  const favorable = bueno === "up" ? sube : !sube;

  return (
    <div className="flex flex-col gap-s2 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>

      <div className="flex flex-wrap items-baseline gap-s2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{valor}</span>
        {unidad ? <span className="text-base text-ink-3">{unidad}</span> : null}
      </div>

      {plano ? (
        <span className="font-mono text-xs text-ink-3">{nota ?? "sin variación"}</span>
      ) : (
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            favorable ? "text-ok" : "text-warn",
          )}
        >
          {/* La flecha va con el dato, el color con el juicio. */}
          <span aria-hidden="true">{sube ? "▲" : "▼"}</span>{" "}
          {Math.abs(variacion!).toFixed(0)} %{nota ? ` · ${nota}` : ""}
        </span>
      )}
    </div>
  );
}

/* ── Barras horizontales: embudo, rankings ─────────────────────────── */

export type Barra = { etiqueta: string; valor: number; glifo?: string; nota?: string };

export function Barras({
  titulo,
  descripcion,
  datos,
  formato = (n: number) => String(n),
  color = SERIE[0],
}: {
  titulo: string;
  descripcion?: string;
  datos: Barra[];
  formato?: (n: number) => string;
  color?: string;
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));

  return (
    <figure className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <figcaption className="flex flex-col gap-s1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          {titulo}
        </h2>
        {descripcion ? (
          <p className="text-sm leading-relaxed text-ink-3">{descripcion}</p>
        ) : null}
      </figcaption>

      {datos.length === 0 ? (
        <p className="py-s4 text-center text-sm text-ink-3">Sin datos todavía.</p>
      ) : (
        <ul className="flex flex-col gap-s2">
          {datos.map((d) => (
            <li key={d.etiqueta} className="flex items-center gap-s3">
              <span className="w-[150px] shrink-0 truncate text-sm text-ink-2">
                {d.glifo ? (
                  <span aria-hidden="true" className="mr-s1 font-mono">
                    {d.glifo}
                  </span>
                ) : null}
                {d.etiqueta}
              </span>

              {/* Barra fina, con el extremo redondeado y anclada al cero. */}
              <span className="relative h-[10px] flex-1 overflow-hidden rounded-full bg-fill">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.max(2, (d.valor / maximo) * 100)}%`,
                    background: color,
                  }}
                />
              </span>

              <span className="w-[76px] shrink-0 text-right font-mono text-sm tabular-nums">
                {formato(d.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/* ── Serie temporal ────────────────────────────────────────────────── */

export type Punto = { etiqueta: string; valor: number };

export function Linea({
  titulo,
  descripcion,
  datos,
  color = SERIE[0],
}: {
  titulo: string;
  descripcion?: string;
  datos: Punto[];
  color?: string;
}) {
  const ancho = 640;
  const alto = 150;
  const margen = 8;

  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const paso = datos.length > 1 ? (ancho - margen * 2) / (datos.length - 1) : 0;

  const punto = (d: Punto, i: number) => {
    const x = margen + i * paso;
    const y = alto - margen - (d.valor / maximo) * (alto - margen * 2);
    return `${x},${y}`;
  };

  const trazo = datos.map(punto).join(" ");
  const area = datos.length
    ? `${margen},${alto - margen} ${trazo} ${margen + (datos.length - 1) * paso},${alto - margen}`
    : "";

  const total = datos.reduce((s, d) => s + d.valor, 0);

  return (
    <figure className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-s2">
        <div className="flex flex-col gap-s1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            {titulo}
          </h2>
          {descripcion ? (
            <p className="text-sm leading-relaxed text-ink-3">{descripcion}</p>
          ) : null}
        </div>
        <span className="font-mono text-sm tabular-nums text-ink-2">{total} en total</span>
      </figcaption>

      {total === 0 ? (
        <p className="py-s5 text-center text-sm text-ink-3">
          Nada registrado en este periodo.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${ancho} ${alto}`}
            className="h-[150px] w-full"
            role="img"
            aria-label={`${titulo}: ${total} en total`}
          >
            <polygon points={area} fill={color} opacity="0.14" />
            <polyline
              points={trazo}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {datos.map((d, i) => {
              const [x, y] = punto(d, i).split(",");
              // Sólo se etiqueta el máximo: un número en cada punto es
              // ruido, y el que interesa es el pico.
              const esPico = d.valor === maximo;
              return (
                <g key={d.etiqueta}>
                  <circle
                    cx={x}
                    cy={y}
                    r={esPico ? 4.5 : 3}
                    fill={color}
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                  {esPico ? (
                    <text
                      x={x}
                      y={Number(y) - 10}
                      textAnchor="middle"
                      className="fill-[var(--ink-2)] font-mono text-[11px] tabular-nums"
                    >
                      {d.valor}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          <div className="flex justify-between font-mono text-xs text-ink-3">
            <span>{datos[0]?.etiqueta}</span>
            <span>{datos[datos.length - 1]?.etiqueta}</span>
          </div>
        </>
      )}
    </figure>
  );
}

/* ── Medidor con meta ──────────────────────────────────────────────── */

export function Medidor({
  titulo,
  descripcion,
  valor,
  meta,
  /** "suelo": estar por encima es bueno. "techo": estar por debajo es bueno. */
  tipoMeta,
  formato = (n: number) => `${n} %`,
}: {
  titulo: string;
  descripcion?: string;
  valor: number;
  meta: number;
  tipoMeta: "suelo" | "techo";
  formato?: (n: number) => string;
}) {
  const escala = Math.max(100, valor, meta);
  const cumple = tipoMeta === "suelo" ? valor >= meta : valor <= meta;

  return (
    <figure className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <figcaption className="flex flex-col gap-s1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          {titulo}
        </h2>
        {descripcion ? (
          <p className="text-sm leading-relaxed text-ink-3">{descripcion}</p>
        ) : null}
      </figcaption>

      <div className="flex flex-wrap items-baseline gap-s3">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">
          {formato(valor)}
        </span>
        <span className={cn("font-mono text-xs", cumple ? "text-ok" : "text-warn")}>
          <span aria-hidden="true">{cumple ? "■" : "▲"}</span>{" "}
          {cumple ? "dentro de la meta" : "fuera de la meta"}
        </span>
      </div>

      <div className="relative h-[12px] overflow-hidden rounded-full bg-fill">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.min(100, (valor / escala) * 100)}%`,
            background: cumple ? "var(--ok)" : "var(--warn)",
          }}
        />
        {/* La meta se dibuja como una marca, no como el final de la barra:
            un techo y un suelo se leen distinto y hay que poder pasarlos. */}
        <span
          className="absolute inset-y-0 w-[2px] bg-ink shadow-[0_0_0_1px_var(--card)]"
          style={{ left: `${Math.min(100, (meta / escala) * 100)}%` }}
          aria-hidden="true"
        />
      </div>

      <span className="font-mono text-xs text-ink-3">
        meta {formato(meta)} ·{" "}
        {tipoMeta === "suelo"
          ? "cuanto más alto, mejor"
          : "por debajo de la meta es bueno"}
      </span>
    </figure>
  );
}
