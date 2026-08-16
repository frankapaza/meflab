import { redirect } from "next/navigation";

import { Shell } from "@/components/layout/shell";
import { iniciales, navPara, rolesLegibles } from "@/lib/auth/navegacion";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Armazón de la aplicación. Todo lo de dentro exige sesión.
 *
 * `proxy.ts` ya redirige al login sin sesión, pero esto se comprueba otra
 * vez aquí: el proxy es una comodidad de navegación, no una barrera de
 * seguridad. La barrera de verdad es RLS.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.tenant_id) redirect("/login");

  const roles = Array.isArray(claims.roles) ? (claims.roles as string[]) : [];

  // Ambas lecturas pasan por RLS: devuelven sólo lo del propio laboratorio.
  const [{ data: lab }, { data: perfil }] = await Promise.all([
    supabase.from("tenant").select("nombre").single(),
    supabase.from("usuario").select("nombre, area:area_id(nombre)").eq("id", claims.sub!).single(),
  ]);

  const nombre = perfil?.nombre ?? String(claims.email ?? "Usuario");
  const area = (perfil?.area as { nombre?: string } | null)?.nombre;

  return (
    <Shell
      nav={navPara(roles)}
      laboratorio={lab?.nombre ?? "MEFLAB"}
      usuario={nombre}
      roles={rolesLegibles(roles)}
      iniciales={iniciales(nombre)}
      ambito={`${rolesLegibles(roles)}${area ? ` · área ${area}` : ""}`}
    >
      {children}
    </Shell>
  );
}
