import Link from "next/link";

import { salir } from "@/app/(auth)/login/acciones";

export default function SinAcceso() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-s4">
      <div className="flex max-w-[420px] flex-col items-center gap-s3 text-center">
        <div className="grid size-[60px] place-items-center rounded-r3 border border-dashed border-line-2 text-6 text-ink-3">
          ■
        </div>
        <h1 className="text-5 font-semibold tracking-tight">Sin acceso a esta pantalla</h1>
        <p className="text-3 leading-relaxed text-ink-2">
          Tu rol no incluye este módulo. Si crees que deberías entrar, pídeselo
          al Administrador: los permisos son la unión de todos tus roles.
        </p>
        <div className="mt-s2 flex gap-s2">
          <Link
            href="/"
            className="grid h-tap place-items-center rounded-r1 bg-acc px-s4 text-2 font-semibold text-acc-on"
          >
            Ir a mi inicio
          </Link>
          <form action={salir}>
            <button className="h-tap rounded-r1 border border-line bg-card px-s4 text-2 text-ink">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
