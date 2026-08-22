/**
 * Cobranza: canales, resultados y el guion por tramo de mora.
 *
 * El guion no es un adorno. Quien cobra no suele ser quien pactó las
 * condiciones, y sin una frase de partida todas las llamadas suenan
 * igual — la de 5 días y la de 90. Cuando suenan igual, el cliente
 * aprende que da lo mismo pagar pronto o tarde.
 */

export const CANALES = [
  { valor: "telefono", etiqueta: "Teléfono" },
  { valor: "whatsapp", etiqueta: "WhatsApp" },
  { valor: "email", etiqueta: "Correo" },
  { valor: "visita", etiqueta: "Visita" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

/**
 * Los seis resultados posibles. Cada uno lleva glifo porque la lista de
 * gestiones se lee de un vistazo y en gris.
 */
export const RESULTADOS = [
  { valor: "promesa_pago", etiqueta: "Prometió pagar", glifo: "◆" },
  { valor: "pagado", etiqueta: "Ya pagó", glifo: "■" },
  { valor: "volver_a_llamar", etiqueta: "Volver a llamar", glifo: "◔" },
  { valor: "sin_respuesta", etiqueta: "No contesta", glifo: "○" },
  { valor: "reclamo", etiqueta: "Tiene un reclamo", glifo: "▲" },
  { valor: "negativa", etiqueta: "Se niega a pagar", glifo: "✕" },
] as const;

export type ResultadoGestion = (typeof RESULTADOS)[number]["valor"];

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

/**
 * Qué decir según cuánto lleve vencido.
 *
 * La progresión es deliberada: recordatorio → petición de fecha →
 * planteamiento del problema → aviso de consecuencia. Saltarse los
 * escalones quema la relación; no subirlos nunca hace que no se cobre.
 */
export function guionPorTramo(
  tramo: string,
  datos: { cliente: string; documento: string; saldo: number; diasMora: number },
): string {
  const { cliente, documento, saldo, diasMora } = datos;
  const importe = soles.format(saldo);
  const nombre = cliente.split(" ").slice(0, 3).join(" ");

  switch (tramo) {
    case "por_vencer":
      return `Aviso amable: «Le llamo de parte del laboratorio por la ${documento}, de ${importe}, que vence en ${Math.abs(diasMora)} días. ¿Le viene bien que la coordinemos ahora?». Todavía no se está cobrando tarde: se está evitando que llegue a tarde.`;

    case "1_30":
      return `Recordatorio: «La ${documento}, de ${importe}, venció hace ${diasMora} días. ¿Se le pasó o hay algo con el comprobante?». Se pregunta antes de reclamar: la mitad de los retrasos a esta altura son un correo que no llegó.`;

    case "31_60":
      return `Pedir fecha concreta: «Tenemos pendiente la ${documento}, de ${importe}, con ${diasMora} días. Necesito una fecha para dejarla anotada, ¿qué día la puede pagar?». Aquí el objetivo ya no es informar, es salir con una fecha.`;

    case "61_90":
      return `Plantear el problema: «${nombre}, la ${documento} lleva ${diasMora} días y son ${importe}. A partir de aquí tengo que informar a Gerencia y se revisa el crédito. Prefiero que lo cerremos hoy, ¿cuánto puede adelantar esta semana?». Se ofrece un pago parcial: es mejor que nada y rompe la inercia.`;

    default:
      return `Aviso de consecuencia: «${nombre}, son ${diasMora} días y ${importe}. Ya no puedo seguir aceptando trabajo nuevo hasta que se regularice, y necesito escalarlo si no acordamos algo hoy». Se dice la consecuencia real, no una amenaza vaga — y se cumple, o la próxima vez no vale.`;
  }
}
