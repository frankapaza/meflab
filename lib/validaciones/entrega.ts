import { z } from "zod";

/**
 * RF-071: toda entrega registra quién la recibe, con nombre.
 *
 * Es lo único que sostiene un reclamo de «ese trabajo nunca me llegó», que
 * en un laboratorio pasa más de lo que parece: el trabajo sale, lo recoge
 * alguien de la clínica y luego nadie sabe quién.
 */
export const METODOS = [
  { valor: "mostrador", etiqueta: "Recogido en mostrador" },
  { valor: "motorizado", etiqueta: "Motorizado del laboratorio" },
  { valor: "courier", etiqueta: "Courier" },
  { valor: "en_clinica", etiqueta: "Entregado en la clínica" },
] as const;

export const entregaSchema = z.object({
  ordenId: z.string().uuid(),
  receptor: z
    .string()
    .trim()
    .min(3, "Anota quién recibió el trabajo, con nombre y apellido.")
    .max(120),
  metodo: z.enum(["mostrador", "motorizado", "courier", "en_clinica"]),
  observaciones: z.string().trim().max(1000).optional().or(z.literal("")),
  // La evidencia es un adjunto de ESA orden. La base lo comprueba con un
  // trigger: adjuntar la foto de otro trabajo es peor que no adjuntar
  // ninguna, porque parece que hay prueba y no la hay.
  evidenciaId: z.string().uuid().optional().or(z.literal("")),
});

export type DatosEntrega = z.infer<typeof entregaSchema>;
