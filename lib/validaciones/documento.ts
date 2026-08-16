/**
 * Validación de documentos de identidad peruanos.
 *
 * No es cosmética: el RUC viaja en el comprobante electrónico y SUNAT lo
 * rechaza si está mal. Detectarlo al registrar el cliente cuesta nada;
 * detectarlo al emitir la factura significa una factura rechazada, con el
 * doctor esperando.
 */

/** Los dos primeros dígitos declaran qué tipo de contribuyente es. */
const PREFIJOS_RUC: Record<string, string> = {
  "10": "persona natural con negocio",
  "15": "persona natural (régimen antiguo)",
  "17": "persona natural (régimen antiguo)",
  "20": "persona jurídica",
};

/**
 * RUC: 11 dígitos con dígito verificador módulo 11.
 *
 * Los 10 primeros se multiplican por los factores 5,4,3,2,7,6,5,4,3,2; el
 * resto de dividir la suma entre 11 se resta de 11, y 10 y 11 se colapsan
 * a 0 y 1. El resultado tiene que coincidir con el último dígito.
 */
export function validarRuc(valor: string): { ok: boolean; motivo?: string } {
  const ruc = valor.replace(/\D/g, "");

  if (ruc.length !== 11) {
    return { ok: false, motivo: "El RUC tiene 11 dígitos." };
  }

  const prefijo = ruc.slice(0, 2);
  if (!PREFIJOS_RUC[prefijo]) {
    return {
      ok: false,
      motivo: `Un RUC empieza por 10, 15, 17 o 20. El tuyo empieza por ${prefijo}.`,
    };
  }

  const FACTORES = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = FACTORES.reduce((acc, f, i) => acc + Number(ruc[i]) * f, 0);

  let verificador = 11 - (suma % 11);
  if (verificador === 10) verificador = 0;
  if (verificador === 11) verificador = 1;

  if (verificador !== Number(ruc[10])) {
    return {
      ok: false,
      motivo: "El dígito verificador no cuadra. Revisa si hay algún número cambiado.",
    };
  }

  return { ok: true };
}

/** DNI: 8 dígitos. No lleva verificador propio en el número base. */
export function validarDni(valor: string): { ok: boolean; motivo?: string } {
  const dni = valor.replace(/\D/g, "");

  if (dni.length !== 8) {
    return { ok: false, motivo: "El DNI tiene 8 dígitos." };
  }
  if (/^0{8}$/.test(dni)) {
    return { ok: false, motivo: "Ese DNI no es válido." };
  }

  return { ok: true };
}

export function validarDocumento(
  tipo: string,
  numero: string,
): { ok: boolean; motivo?: string } {
  if (tipo === "RUC") return validarRuc(numero);
  if (tipo === "DNI") return validarDni(numero);
  // Carné de extranjería y pasaporte no tienen formato fijo verificable.
  return numero.trim().length >= 6
    ? { ok: true }
    : { ok: false, motivo: "El documento es demasiado corto." };
}

/** Qué tipo de contribuyente es, para mostrarlo al registrar. */
export function tipoContribuyente(ruc: string): string | null {
  const limpio = ruc.replace(/\D/g, "");
  return limpio.length >= 2 ? (PREFIJOS_RUC[limpio.slice(0, 2)] ?? null) : null;
}

/** Sólo dígitos: es como se guarda, para que las búsquedas cuadren. */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Cómo se guarda el número, según su tipo.
 *
 * RUC y DNI son numéricos por definición, así que se les quitan guiones y
 * espacios: si no, el mismo cliente entra dos veces con formatos distintos.
 * El carné de extranjería y el pasaporte SÍ pueden llevar letras, y
 * quitárselas los convertiría en otro documento — sólo se recortan.
 */
export function normalizarDocumento(tipo: string, numero: string): string {
  if (tipo === "RUC" || tipo === "DNI") return soloDigitos(numero);
  return numero.trim().toUpperCase();
}
