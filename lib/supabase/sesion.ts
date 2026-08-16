import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { RUTAS_PUBLICAS, permiteRuta } from "@/lib/auth/rutas";

/**
 * Refresca la sesión y aplica las guardas de ruta. Lo usa `proxy.ts`.
 *
 * En Next 16 esto ya no es "middleware": el archivo se llama `proxy.ts` y
 * corre en runtime **nodejs**, no edge. Nos viene bien — `@supabase/ssr`
 * tenía limitaciones en edge.
 */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims() valida la firma del token contra el servidor. NO usar
  // getSession() para decidir permisos: lee la cookie sin verificarla y
  // cualquiera puede fabricarla.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const ruta = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));

  // Sin sesión y en ruta protegida → al login, recordando a dónde iba.
  if (!claims && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("volver", ruta);
    return NextResponse.redirect(url);
  }

  if (claims) {
    // Con sesión en el login → a su pantalla de inicio.
    if (ruta === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Guarda por CONJUNTO de roles: el permiso se concede si alguno lo
    // otorga (AC-01 §7.2). Nunca se comprueba un rol único.
    const roles = Array.isArray(claims.roles) ? (claims.roles as string[]) : [];

    // Un usuario sin tenant es alguien desactivado: el hook le emite un
    // token sin tenant_id a propósito. No entra a ninguna parte.
    if (!claims.tenant_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "inactivo");
      return NextResponse.redirect(url);
    }

    if (!permiteRuta(ruta, roles)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sin-acceso";
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }

  // Devolver ESTA respuesta, no una nueva: lleva las cookies de sesión
  // refrescadas. Crear otra aquí cierra la sesión del usuario cada hora.
  return respuesta;
}
