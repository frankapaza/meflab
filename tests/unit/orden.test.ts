import { describe, expect, it } from "vitest";

import {
  arcadaDePieza,
  arcadaDePiezas,
  diasHabilesHasta,
  esPiezaValida,
  ordenSchema,
  piezasDelCuadrante,
} from "@/lib/validaciones/orden";

const manana = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

const ORDEN = {
  clienteId: "b3f1c0a2-5d41-4a9e-9f2b-7c6d8e0a1b23",
  doctorId: "0a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d",
  pacienteId: "11111111-2222-4333-8444-555555555555",
  fechaComprometida: manana(),
  prioridad: "normal",
  tipoRecepcion: "impresion_fisica",
  indicaciones: "",
  lineas: [
    {
      servicioId: "99999999-8888-4777-8666-555555555555",
      cantidad: 2,
      piezasFdi: ["16", "26"],
      colorId: "",
    },
  ],
};

const primerError = (datos: unknown) => {
  const r = ordenSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("ordenSchema", () => {
  it("acepta una orden completa", () => {
    expect(ordenSchema.safeParse(ORDEN).success).toBe(true);
  });

  it("rechaza una orden sin ningún trabajo", () => {
    // Una cabecera sin líneas no es media orden: es un trabajo que no se
    // puede cobrar y que nadie va a fabricar.
    expect(primerError({ ...ORDEN, lineas: [] })).toContain("no es una orden");
  });

  it("rechaza una fecha comprometida en el pasado", () => {
    // Prometer una fecha ya pasada haría nacer el semáforo en rojo.
    expect(primerError({ ...ORDEN, fechaComprometida: "2020-01-01" })).toContain(
      "pasado",
    );
  });

  it("acepta una orden para hoy", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    expect(ordenSchema.safeParse({ ...ORDEN, fechaComprometida: hoy }).success).toBe(
      true,
    );
  });

  it("rechaza una pieza fuera de la notación FDI", () => {
    const malas = { ...ORDEN, lineas: [{ ...ORDEN.lineas[0], piezasFdi: ["19"] }] };
    expect(primerError(malas)).toContain("FDI");
  });

  it("acepta una línea sin piezas", () => {
    // Hay trabajos que no van a una pieza concreta: una férula, un modelo
    // de estudio. Exigir la pieza los bloquearía.
    const sinPiezas = { ...ORDEN, lineas: [{ ...ORDEN.lineas[0], piezasFdi: [] }] };
    expect(ordenSchema.safeParse(sinPiezas).success).toBe(true);
  });

  it("rechaza cantidad cero o negativa", () => {
    expect(
      ordenSchema.safeParse({
        ...ORDEN,
        lineas: [{ ...ORDEN.lineas[0], cantidad: 0 }],
      }).success,
    ).toBe(false);
  });
});

describe("notación FDI", () => {
  it("acepta las 32 piezas permanentes y nada más", () => {
    for (const cuadrante of [1, 2, 3, 4]) {
      for (const pieza of piezasDelCuadrante(cuadrante)) {
        expect(esPiezaValida(pieza)).toBe(true);
      }
    }
    // 5x-8x son dientes de leche, y 19/09 no existen.
    for (const mala of ["19", "09", "51", "85", "1", "160", "abc"]) {
      expect(esPiezaValida(mala)).toBe(false);
    }
  });

  it("cada cuadrante tiene 8 piezas numeradas de dentro afuera", () => {
    expect(piezasDelCuadrante(1)).toEqual([
      "11", "12", "13", "14", "15", "16", "17", "18",
    ]);
  });

  it("deduce la arcada de la pieza", () => {
    expect(arcadaDePieza("16")).toBe("superior");
    expect(arcadaDePieza("26")).toBe("superior");
    expect(arcadaDePieza("36")).toBe("inferior");
    expect(arcadaDePieza("46")).toBe("inferior");
    expect(arcadaDePieza("99")).toBeNull();
  });

  it("deduce la arcada del conjunto, en vez de preguntarla", () => {
    // El dato ya está en las piezas. Pedirlo aparte daría dos formas de
    // decir lo mismo, y acabarían discrepando.
    expect(arcadaDePiezas(["16", "26"])).toBe("superior");
    expect(arcadaDePiezas(["36", "46"])).toBe("inferior");
    expect(arcadaDePiezas(["16", "36"])).toBe("ambas");
    expect(arcadaDePiezas([])).toBeNull();
  });
});

describe("diasHabilesHasta", () => {
  // Miércoles 19 de agosto de 2026, para no depender del día real.
  const MIERCOLES = new Date("2026-08-19T09:00:00");

  it("no cuenta los domingos", () => {
    // Del miércoles al lunes siguiente hay 5 días de calendario, pero el
    // laboratorio no produce en domingo. Decir "5 días" prometería lo que
    // no se puede cumplir.
    expect(diasHabilesHasta("2026-08-24", MIERCOLES)).toBe(4);
  });

  it("cuenta los días seguidos cuando no hay domingo de por medio", () => {
    expect(diasHabilesHasta("2026-08-21", MIERCOLES)).toBe(2);
  });

  it("da cero para hoy y para cualquier fecha ya pasada", () => {
    expect(diasHabilesHasta("2026-08-19", MIERCOLES)).toBe(0);
    expect(diasHabilesHasta("2026-08-01", MIERCOLES)).toBe(0);
  });

  it("devuelve null si la fecha no es una fecha", () => {
    expect(diasHabilesHasta("cuando-se-pueda", MIERCOLES)).toBeNull();
  });
});
