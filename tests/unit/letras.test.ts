import { describe, expect, it } from "vitest";

import { enLetras } from "@/lib/dominio/letras";

/**
 * El importe en letras va impreso en un comprobante. Un error aquí no da
 * un fallo de sistema: da un papel entregado a un cliente que dice una
 * cifra distinta de la que se le cobra. Por eso se prueba el rango de
 * casos raros del castellano, que es donde estas funciones fallan.
 */
describe("enLetras", () => {
  it("escribe los céntimos como fracción sobre cien, siempre con dos dígitos", () => {
    expect(enLetras(708)).toBe("SETECIENTOS OCHO CON 00/100 SOLES");
    expect(enLetras(708.5)).toBe("SETECIENTOS OCHO CON 50/100 SOLES");
    // El caso que rompe la mitad de estas funciones: un solo céntimo.
    expect(enLetras(708.05)).toBe("SETECIENTOS OCHO CON 05/100 SOLES");
  });

  it("distingue «cien» de «ciento»", () => {
    expect(enLetras(100)).toBe("CIEN CON 00/100 SOLES");
    expect(enLetras(101)).toBe("CIENTO UNO CON 00/100 SOLES");
    expect(enLetras(115)).toBe("CIENTO QUINCE CON 00/100 SOLES");
  });

  it("junta los veinti- y separa los demás con «y»", () => {
    expect(enLetras(21)).toBe("VEINTIUNO CON 00/100 SOLES");
    expect(enLetras(28)).toBe("VEINTIOCHO CON 00/100 SOLES");
    expect(enLetras(31)).toBe("TREINTA Y UNO CON 00/100 SOLES");
    expect(enLetras(99)).toBe("NOVENTA Y NUEVE CON 00/100 SOLES");
  });

  it("no dice «uno mil»", () => {
    expect(enLetras(1000)).toBe("MIL CON 00/100 SOLES");
    expect(enLetras(1770)).toBe("MIL SETECIENTOS SETENTA CON 00/100 SOLES");
    expect(enLetras(2000)).toBe("DOS MIL CON 00/100 SOLES");
  });

  it("maneja millones en singular y plural", () => {
    expect(enLetras(1_000_000)).toBe("UN MILLÓN CON 00/100 SOLES");
    expect(enLetras(2_000_000)).toBe("DOS MILLONES CON 00/100 SOLES");
  });

  it("escribe el cero, que es lo que sale en una nota que anula del todo", () => {
    expect(enLetras(0)).toBe("CERO CON 00/100 SOLES");
  });

  it("redondea los céntimos sin arrastrar el error del binario", () => {
    // 0.1 + 0.2 en coma flotante da 0.30000000000000004. Si el redondeo
    // no lo absorbe, el papel diría 29/100 en vez de 30/100.
    expect(enLetras(1250.8)).toBe("MIL DOSCIENTOS CINCUENTA CON 80/100 SOLES");
    expect(enLetras(0.1 + 0.2)).toBe("CERO CON 30/100 SOLES");
  });

  it("cubre los importes reales que emite el laboratorio", () => {
    expect(enLetras(1770)).toBe("MIL SETECIENTOS SETENTA CON 00/100 SOLES");
    expect(enLetras(2407.2)).toBe("DOS MIL CUATROCIENTOS SIETE CON 20/100 SOLES");
    expect(enLetras(96.8)).toBe("NOVENTA Y SEIS CON 80/100 SOLES");
  });
});
