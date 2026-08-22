/**
 * El importe en letras. SUNAT lo exige en el comprobante, y además es lo
 * que impide que un 1 500 se convierta en 11 500 con un trazo de bolígrafo.
 */
export function enLetras(monto: number): string {
  const entero = Math.floor(monto);
  const centimos = Math.round((monto - entero) * 100);
  return `${numeroALetras(entero).toUpperCase()} CON ${String(centimos).padStart(2, "0")}/100 SOLES`;
}

const UNIDADES = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte",
];
const DECENAS = [
  "", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta",
  "ochenta", "noventa",
];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function numeroALetras(n: number): string {
  if (n === 0) return "cero";
  if (n === 100) return "cien";
  if (n <= 20) return UNIDADES[n];

  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 2) return u === 0 ? "veinte" : `veinti${UNIDADES[u]}`;
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
  }

  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? CENTENAS[c] : `${CENTENAS[c]} ${numeroALetras(r)}`;
  }

  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000);
    const r = n % 1000;
    const prefijo = miles === 1 ? "mil" : `${numeroALetras(miles)} mil`;
    return r === 0 ? prefijo : `${prefijo} ${numeroALetras(r)}`;
  }

  const millones = Math.floor(n / 1_000_000);
  const r = n % 1_000_000;
  const prefijo = millones === 1 ? "un millón" : `${numeroALetras(millones)} millones`;
  return r === 0 ? prefijo : `${prefijo} ${numeroALetras(r)}`;
}
