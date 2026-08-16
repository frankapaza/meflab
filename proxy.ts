import type { NextRequest } from "next/server";

import { actualizarSesion } from "@/lib/supabase/sesion";

/**
 * En Next 16 esto era `middleware.ts`. El archivo y la función exportada
 * pasan a llamarse `proxy`, y el runtime es **nodejs**, no edge.
 *
 * Aquí se refresca la sesión de Supabase en cada petición y se aplican las
 * guardas de ruta por conjunto de roles.
 */
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: [
    /*
     * Todo excepto estáticos e imágenes. Es importante que el proxy corra
     * en las rutas de página: si no, la cookie de sesión no se refresca y
     * el usuario se queda fuera al expirar el token (1 h).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
