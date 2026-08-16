import { describe, expect, it } from "vitest";

import { servicioSchema, valorVentaAlmacenado } from "@/lib/validaciones/servicio";

const SERVICIO = {
  codigo: "COR-ZIR",
  nombre: "Corona de zirconio monolítica",
  categoriaId: "",
  categoriaNueva: "",
  precio: 620,
  afectacion: "gravado",
};

const primerError = (datos: unknown) => {
  const r = servicioSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("servicioSchema", () => {
  it("acepta un servicio bien definido", () => {
    expect(servicioSchema.safeParse(SERVICIO).success).toBe(true);
  });

  it("rechaza un código con espacios o acentos", () => {
    // El código viaja en la orden y en el comprobante electrónico.
    expect(primerError({ ...SERVICIO, codigo: "COR ZIR" })).toContain("guiones");
    expect(primerError({ ...SERVICIO, codigo: "PRÓTESIS" })).toContain("guiones");
  });

  it("acepta código con guiones y números", () => {
    expect(servicioSchema.safeParse({ ...SERVICIO, codigo: "PPR-CR-2" }).success).toBe(
      true,
    );
  });

  it("rechaza un precio negativo", () => {
    expect(primerError({ ...SERVICIO, precio: -1 })).toContain("negativo");
  });

  it("acepta precio cero", () => {
    // Un servicio de cortesía o incluido en otro existe y tiene que poder
    // registrarse; lo que no puede es tener precio negativo.
    expect(servicioSchema.safeParse({ ...SERVICIO, precio: 0 }).success).toBe(true);
  });

  it("convierte el precio que llega del formulario como texto", () => {
    const r = servicioSchema.parse({ ...SERVICIO, precio: "680.50" });
    expect(r.precio).toBe(680.5);
  });

  it("sólo admite las tres afectaciones tributarias reales", () => {
    expect(servicioSchema.safeParse({ ...SERVICIO, afectacion: "exonerado" }).success).toBe(
      true,
    );
    expect(servicioSchema.safeParse({ ...SERVICIO, afectacion: "otro" }).success).toBe(
      false,
    );
  });
});

describe("valorVentaAlmacenado · D-07", () => {
  it("no toca un precio capturado sin IGV", () => {
    expect(valorVentaAlmacenado(620, false)).toBe(620);
  });

  it("quita el IGV de un precio capturado con IGV", () => {
    // El caso exacto que fija D-07: 660.80 pactados "a todo costo" son
    // 560.00 de valor de venta.
    expect(valorVentaAlmacenado(660.8, true)).toBe(560);
  });

  it("redondea a dos decimales, como la base", () => {
    // Si la interfaz enseñara más decimales que los que se guardan, el
    // usuario vería una cifra distinta de la almacenada.
    expect(valorVentaAlmacenado(100, true)).toBe(84.75);
  });

  it("respeta una tasa distinta de la vigente", () => {
    // El IGV peruano ya pasó del 19 % al 18 %: la tasa es un parámetro.
    expect(valorVentaAlmacenado(119, true, 0.19)).toBe(100);
  });
});

describe("valorVentaAlmacenado · es idempotente sobre lo capturado", () => {
  it("aplicado dos veces al MISMO origen da lo mismo", () => {
    // Es la propiedad que hace segura la tarifa: la base deriva el valor
    // de venta de `precio_capturado` en cada escritura, así que guardar
    // dos veces no vuelve a dividir. Convertir en sitio no la cumplía, y
    // un `on conflict do update` dejaba 708.00 en 508.47.
    const capturado = 708;
    expect(valorVentaAlmacenado(capturado, true)).toBe(600);
    expect(valorVentaAlmacenado(capturado, true)).toBe(600);
  });
});
