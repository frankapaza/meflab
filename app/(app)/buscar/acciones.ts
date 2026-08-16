"use server";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Hallazgo = {
  tipo: "orden" | "doctor" | "paciente" | "cliente";
  id: string;
  titulo: string;
  detalle: string;
  href: string;
};

/**
 * Buscador global.
 *
 * El requisito de Recepción es responder "¿cómo va mi trabajo?" en menos de
 * diez segundos y desde cualquier pantalla, y el doctor no llama diciendo
 * el código de la orden: dice el nombre del paciente, o el suyo.
 *
 * Todo pasa por RLS, así que nadie encuentra lo que no puede ver. El
 * paciente se busca en la VISTA, que ya tapa lo que no toca (RNF-006).
 */
export async function buscar(termino: string): Promise<Hallazgo[]> {
  const limpio = termino.trim();
  if (limpio.length < 2) return [];

  // Sin sesión no se busca nada: RLS ya devolvería vacío, pero mejor no
  // llegar a preguntar.
  if (!(await contextoActual())) return [];

  const supabase = await crearClienteServidor();

  // `%` y `_` son comodines de ILIKE: sin escaparlos, teclear "50%" haría
  // que la búsqueda devolviera media base.
  const patron = `%${limpio.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  const [ordenes, doctores, pacientes, clientes] = await Promise.all([
    supabase
      .from("orden_trabajo")
      .select("id, codigo, fecha_comprometida, cliente:cliente_id(razon_social)")
      .ilike("codigo", patron)
      .limit(6),
    supabase
      .from("doctor")
      .select("id, nombre, colegiatura, cliente:cliente_id(razon_social)")
      .ilike("nombre", patron)
      .limit(6),
    supabase.from("v_paciente").select("id, nombre").ilike("nombre", patron).limit(6),
    supabase
      .from("cliente")
      .select("id, razon_social, numero_documento")
      .or(`razon_social.ilike.${patron},numero_documento.ilike.${patron}`)
      .limit(6),
  ]);

  const hallazgos: Hallazgo[] = [];

  for (const o of ordenes.data ?? []) {
    hallazgos.push({
      tipo: "orden",
      id: o.id,
      titulo: o.codigo,
      detalle:
        (o.cliente as unknown as { razon_social: string } | null)?.razon_social ?? "",
      href: "/trabajos",
    });
  }

  for (const d of doctores.data ?? []) {
    hallazgos.push({
      tipo: "doctor",
      id: d.id,
      titulo: d.nombre,
      detalle:
        [(d.cliente as unknown as { razon_social: string } | null)?.razon_social, d.colegiatura]
          .filter(Boolean)
          .join(" · "),
      href: `/doctores/${d.id}`,
    });
  }

  for (const p of pacientes.data ?? []) {
    hallazgos.push({
      tipo: "paciente",
      id: p.id as string,
      titulo: p.nombre as string,
      detalle: "",
      href: "/pacientes",
    });
  }

  for (const c of clientes.data ?? []) {
    hallazgos.push({
      tipo: "cliente",
      id: c.id,
      titulo: c.razon_social,
      detalle: c.numero_documento ?? "",
      href: "/clientes",
    });
  }

  return hallazgos;
}
