"use client";

import { useEffect, useState } from "react";

/**
 * Hoja viva de tokens. Equivale a la pantalla "Sistema de diseño" del
 * prototipo y existe por dos motivos:
 *
 *  1. Verificar que cada token resuelve como utilidad de Tailwind. Que
 *     `globals.css` compile no prueba nada; que `bg-card` pinte, sí.
 *  2. Servir de referencia al construir componentes, para no volver a
 *     inventar un color o un tamaño.
 */

const SUPERFICIES = [
  ["bg-bg", "--bg", "Fondo"],
  ["bg-card", "--card", "Tarjeta"],
  ["bg-card-2", "--card-2", "Elevación"],
  ["bg-fill", "--fill", "Relleno"],
  ["bg-line", "--line", "Borde"],
  ["bg-line-2", "--line-2", "Borde fuerte"],
] as const;

const SEMANTICOS = [
  ["bg-acc", "--acc", "Primario"],
  ["bg-acc-bg", "--acc-bg", "Primario suave"],
  ["bg-ok", "--ok", "Éxito"],
  ["bg-ok-bg", "--ok-bg", "Éxito suave"],
  ["bg-warn", "--warn", "Advertencia"],
  ["bg-warn-bg", "--warn-bg", "Advertencia suave"],
  ["bg-err", "--err", "Error"],
  ["bg-err-bg", "--err-bg", "Error suave"],
] as const;

/** El glifo es lo que sostiene el significado; el color solo refuerza.
 *  Así el tablero se lee impreso en gris y con daltonismo. */
const ESTADOS = [
  ["○", "bg-st-1", "Recibido"],
  ["◔", "bg-st-2", "Modelo / Vaciado"],
  ["◑", "bg-st-3", "Diseño CAD"],
  ["◕", "bg-st-4", "En fabricación"],
  ["●", "bg-st-5", "Cerámica / Montaje"],
  ["◇", "bg-st-6", "Prueba en clínica"],
  ["◈", "bg-st-7", "Acabado"],
  ["◆", "bg-st-8", "Control de calidad"],
  ["▣", "bg-st-9", "Listo para entrega"],
  ["■", "bg-st-10", "Entregado"],
] as const;

const ESCALA = [
  ["text-8", "32 px", "S/ 84,320"],
  ["text-7", "26 px", "S/ 84,320"],
  ["text-6", "20 px", "Título de pantalla"],
  ["text-5", "16 px", "Subtítulo"],
  ["text-4", "14 px", "Título de tarjeta"],
  ["text-3", "13 px", "Cuerpo del texto"],
  ["text-2", "12 px", "Secundario"],
  ["text-1", "11 px", "Etiqueta · piso de la escala"],
] as const;

const DENSIDADES = ["dz-compacto", "dz-normal", "dz-amplio"] as const;

export default function TokensPage() {
  const [dark, setDark] = useState(false);
  const [dz, setDz] = useState<(typeof DENSIDADES)[number]>("dz-normal");

  /* La clase del tema va en <html>, no en un div interior.
     `body` pinta el fondo detrás de todo: si la clase queda en un
     subárbol, body sigue leyendo el valor de :root y aparece una banda
     clara detrás de la interfaz oscura. Así lo hará el conmutador real. */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className={`${dz} min-h-screen bg-bg text-ink`}>
        <header className="flex flex-wrap items-center gap-s3 border-b border-line bg-card px-s6 py-s4">
          <h1 className="text-6 font-semibold tracking-tight">Tokens del sistema de diseño</h1>
          <div className="flex-1" />
          <button
            onClick={() => setDark((v) => !v)}
            className="h-tap rounded-r1 border border-line bg-card-2 px-s3 font-mono text-1 text-ink-2 hover:bg-fill"
          >
            {dark ? "CLARO" : "OSCURO"}
          </button>
          <div className="flex overflow-hidden rounded-r1 border border-line">
            {DENSIDADES.map((d) => (
              <button
                key={d}
                onClick={() => setDz(d)}
                className={`h-tap px-s3 font-mono text-1 ${
                  dz === d ? "bg-acc text-acc-on" : "bg-card-2 text-ink-2 hover:bg-fill"
                }`}
              >
                {d.replace("dz-", "").toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <main className="flex flex-col gap-s6 px-s6 py-s6">
          <Panel titulo="Superficies" meta="el tema y la densidad se heredan del ancestro">
            <div className="flex flex-wrap gap-s3">
              {SUPERFICIES.map(([cls, tok, nombre]) => (
                <Muestra key={tok} cls={cls} tok={tok} nombre={nombre} />
              ))}
            </div>
          </Panel>

          <Panel titulo="Texto" meta="contraste medido sobre --card, todos ≥ 4.5:1">
            <div className="flex flex-col gap-s2">
              <p className="text-3 text-ink">Primario · --ink · 17.6:1</p>
              <p className="text-3 text-ink-2">Secundario · --ink-2 · 5.9:1</p>
              <p className="text-3 text-ink-3">Terciario · --ink-3 · 4.7:1</p>
            </div>
          </Panel>

          <Panel titulo="Marca y semánticos">
            <div className="flex flex-wrap gap-s3">
              {SEMANTICOS.map(([cls, tok, nombre]) => (
                <Muestra key={tok} cls={cls} tok={tok} nombre={nombre} />
              ))}
            </div>
          </Panel>

          <Panel titulo="Los 10 estados de trabajo" meta="el glifo sostiene el significado, no el color">
            <div className="flex flex-wrap gap-s2">
              {ESTADOS.map(([glifo, cls, nombre]) => (
                <span
                  key={nombre}
                  className="inline-flex items-center gap-s2 rounded-r1 bg-fill px-s3 py-s2 text-1 text-ink-2"
                >
                  <span className={`inline-block size-[10px] rounded-full ${cls}`} />
                  <span className="font-mono">{glifo}</span>
                  {nombre}
                </span>
              ))}
            </div>
          </Panel>

          <Panel titulo="Escala tipográfica" meta="8 pasos, piso de 11 px, sin medios píxeles">
            <div className="flex flex-col gap-s3">
              {ESCALA.map(([cls, px, txt]) => (
                <div key={cls} className="flex items-baseline gap-s4 border-b border-line pb-s2">
                  <span className={`${cls} flex-1 font-semibold tracking-tight`}>{txt}</span>
                  <span className="font-mono text-1 text-ink-3">
                    {cls} · {px}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel titulo="Radios, elevación y objetivo táctil">
            <div className="flex flex-wrap items-end gap-s4">
              {(["rounded-r1", "rounded-r2", "rounded-r3"] as const).map((r) => (
                <div key={r} className="flex flex-col items-center gap-s2">
                  <div className={`size-[72px] border border-line-2 bg-card-2 ${r}`} />
                  <span className="font-mono text-1 text-ink-3">{r}</span>
                </div>
              ))}
              {(["shadow-e1", "shadow-e2", "shadow-e3"] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-s2">
                  <div className={`size-[72px] rounded-r2 bg-card ${s}`} />
                  <span className="font-mono text-1 text-ink-3">{s}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-s2">
                <button className="h-tap rounded-r1 bg-acc px-s4 text-2 font-semibold text-acc-on">
                  Objetivo táctil
                </button>
                <span className="font-mono text-1 text-ink-3">h-tap</span>
              </div>
            </div>
          </Panel>

          <Panel titulo="Cifras monetarias" meta="mono tabular siempre: las columnas quedan alineadas">
            <div className="flex flex-col gap-s2">
              {["S/ 1,675.60", "S/ 84,320.00", "S/ 6,145.60", "S/ 980.00"].map((v) => (
                <div key={v} className="flex justify-between border-b border-line pb-s1">
                  <span className="text-2 text-ink-2">Importe</span>
                  <span className="num text-3 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </Panel>
      </main>
    </div>
  );
}

function Panel({
  titulo,
  meta,
  children,
}: {
  titulo: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
      <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
        <h2 className="text-2 font-semibold uppercase tracking-wide text-ink-2">{titulo}</h2>
        {meta ? <span className="font-mono text-1 text-ink-3">{meta}</span> : null}
      </div>
      <div className="px-pad-x py-s4">{children}</div>
    </section>
  );
}

function Muestra({ cls, tok, nombre }: { cls: string; tok: string; nombre: string }) {
  return (
    <div className="flex w-[126px] flex-col gap-s1">
      <span className={`h-[46px] rounded-r1 ring-1 ring-inset ring-line-2 ${cls}`} />
      <span className="text-2 font-medium">{nombre}</span>
      <span className="font-mono text-1 text-ink-3">{tok}</span>
    </div>
  );
}
