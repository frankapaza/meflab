import { describe, expect, it } from "vitest";

import {
  listaPrecioSchema,
  precioItemSchema,
  variacionSobreBase,
} from "@/lib/validaciones/lista-precio";

const LISTA = {
  nombre: "Convenio Clínica Sonrisa Plena",
  preciosIncluyenIgv: true,
  esDefault: false,
};

const primerError = (datos: unknown) => {
  const r = listaPrecioSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("listaPrecioSchema", () => {
  it("acepta una lista bien definida", () => {
    expect(listaPrecioSchema.safeParse(LISTA).success).toBe(true);
  });

  it("exige un nombre que distinga la lista", () => {
    expect(primerError({ ...LISTA, nombre: "A" })).toContain("obligatorio");
  });

  it("interpreta las casillas que llegan del formulario", () => {
    // Un checkbox no marcado no llega en el FormData; la acción lo traduce
    // a "0"/"1" y el esquema tiene que aceptar ambos.
    const r = listaPrecioSchema.parse({ ...LISTA, preciosIncluyenIgv: false });
    expect(r.preciosIncluyenIgv).toBe(false);
  });
});

describe("precioItemSchema", () => {
  const linea = (precio: string) =>
    precioItemSchema.safeParse({
      servicioId: "b3f1c0a2-5d41-4a9e-9f2b-7c6d8e0a1b23",
      precio,
    });

  it("acepta un precio vacío", () => {
    // Vacío significa "esta lista no fija precio": manda el base. No es
    // lo mismo que cero, que sería regalar el trabajo.
    expect(linea("").success).toBe(true);
  });

  it("acepta cero como precio deliberado", () => {
    expect(linea("0").success).toBe(true);
  });

  it("rechaza un precio negativo", () => {
    expect(linea("-1").success).toBe(false);
  });

  it("rechaza un precio que no es un número", () => {
    expect(linea("seiscientos").success).toBe(false);
  });
});

describe("variacionSobreBase", () => {
  it("no dice nada si la lista no fija precio", () => {
    expect(variacionSobreBase(null, 620)).toBeNull();
  });

  it("da negativo cuando la lista es más barata que el tarifario", () => {
    // Es lo que hace legible un convenio: "Convenio A" no dice nada,
    // "12,9 % por debajo del tarifario" sí.
    expect(variacionSobreBase(540, 620)).toBe(-12.9);
  });

  it("da positivo cuando la lista es más cara", () => {
    expect(variacionSobreBase(682, 620)).toBe(10);
  });

  it("da cero cuando coincide con el precio base", () => {
    expect(variacionSobreBase(620, 620)).toBe(0);
  });

  it("no divide entre cero", () => {
    // Un servicio de cortesía tiene precio base 0 y es válido; calcular su
    // variación daría Infinity y lo pintaría como un porcentaje absurdo.
    expect(variacionSobreBase(50, 0)).toBeNull();
  });
});
