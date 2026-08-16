"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { entrar, type EstadoLogin } from "./acciones";

const INICIAL: EstadoLogin = { error: null };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  );
}

function Formulario() {
  const params = useSearchParams();
  const volver = params.get("volver") ?? "/";
  const inactivo = params.get("error") === "inactivo";

  const [estado, accion, enviando] = useActionState(entrar, INICIAL);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-s4">
      <div className="w-full max-w-[400px]">
        <div className="mb-s6 flex items-center gap-s3">
          <div className="grid size-[34px] place-items-center rounded-r1 bg-acc text-3 font-bold text-acc-on">
            M
          </div>
          <div className="flex flex-col">
            <span className="text-4 font-semibold tracking-tight">MEFLAB</span>
            <span className="font-mono text-1 tracking-[0.1em] text-ink-3">
              LAB. DENTAL VERA
            </span>
          </div>
        </div>

        <form
          action={accion}
          className="flex flex-col gap-s4 rounded-r2 border border-line bg-card p-s5 shadow-e1"
        >
          <div className="flex flex-col gap-s1">
            <h1 className="text-5 font-semibold tracking-tight">Entrar</h1>
            <p className="text-2 text-ink-2">
              Las cuentas las crea el Administrador. No hay registro público.
            </p>
          </div>

          {inactivo ? (
            <p
              role="alert"
              className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-2 text-warn"
            >
              Tu cuenta está desactivada. Habla con el Administrador.
            </p>
          ) : null}

          <input type="hidden" name="volver" value={volver} />

          <label className="flex flex-col gap-s1">
            <span className="font-mono text-1 uppercase tracking-wide text-ink-2">
              Correo
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className="h-[38px] rounded-r1 border border-line bg-card-2 px-s3 text-3 text-ink outline-none focus-visible:border-acc"
            />
          </label>

          <label className="flex flex-col gap-s1">
            <span className="font-mono text-1 uppercase tracking-wide text-ink-2">
              Contraseña
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={10}
              className="h-[38px] rounded-r1 border border-line bg-card-2 px-s3 text-3 text-ink outline-none focus-visible:border-acc"
            />
          </label>

          {estado.error ? (
            <p
              role="alert"
              className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-2 text-err"
            >
              {estado.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="h-[42px] rounded-r1 bg-acc text-3 font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-progress disabled:opacity-70"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-s4 text-center text-2 text-ink-3">
          ¿Olvidaste tu contraseña? Pídele al Administrador que te la restablezca.
        </p>
      </div>
    </main>
  );
}
