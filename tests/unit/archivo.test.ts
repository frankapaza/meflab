import { describe, expect, it } from "vitest";

import {
  TAMANO_MAXIMO,
  claseDeArchivo,
  pesoLegible,
  rutaDeAdjunto,
  validarArchivo,
} from "@/lib/validaciones/archivo";

describe("validarArchivo", () => {
  it("acepta una foto, un escaneo y una prescripción", () => {
    expect(validarArchivo("color-a3.jpg", 2_000_000).ok).toBe(true);
    expect(validarArchivo("arcada-superior.stl", 60_000_000).ok).toBe(true);
    expect(validarArchivo("prescripcion.pdf", 300_000).ok).toBe(true);
  });

  it("acepta un STL de arcada completa sin comprimir", () => {
    // Es el caso que decidió el límite: con los 50 MB de fábrica, la mitad
    // de los escaneos se rechazarían en el mostrador.
    expect(validarArchivo("arcada.stl", 80 * 1024 * 1024).ok).toBe(true);
  });

  it("rechaza lo que pasa del máximo, y dice cuánto pesa", () => {
    const r = validarArchivo("gigante.stl", TAMANO_MAXIMO + 1);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("100 MB");
    expect(r.motivo).toContain("ZIP");
  });

  it("rechaza un archivo vacío", () => {
    // Un 0 bytes suele ser una subida que se cortó, y deja un adjunto que
    // parece estar y no está.
    expect(validarArchivo("foto.jpg", 0).ok).toBe(false);
  });

  it("rechaza una extensión que no se admite", () => {
    const r = validarArchivo("virus.exe", 1000);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain(".exe");
  });

  it("no se deja engañar por las mayúsculas de la extensión", () => {
    // Las cámaras de móvil escriben ".JPG" en mayúscula.
    expect(validarArchivo("FOTO.JPG", 1000).ok).toBe(true);
    expect(validarArchivo("Escaneo.STL", 1000).ok).toBe(true);
  });
});

describe("claseDeArchivo", () => {
  it("distingue foto, escaneo y documento", () => {
    // El glifo sale de aquí: se ve qué es sin leer la extensión y sin
    // depender del color.
    expect(claseDeArchivo("color.heic")).toBe("foto");
    expect(claseDeArchivo("modelo.ply")).toBe("escaneo");
    expect(claseDeArchivo("receta.pdf")).toBe("documento");
  });
});

describe("pesoLegible", () => {
  it("usa la unidad que se entiende de un vistazo", () => {
    expect(pesoLegible(512)).toBe("512 B");
    expect(pesoLegible(2048)).toBe("2 KB");
    expect(pesoLegible(3.5 * 1024 * 1024)).toBe("3.5 MB");
    expect(pesoLegible(64 * 1024 * 1024)).toBe("64 MB");
  });
});

describe("rutaDeAdjunto", () => {
  const TENANT = "a0000000-0000-4000-8000-000000000001";
  const ORDEN = "b2c297b5-8da1-4029-a460-c20a35ee286c";
  const ID = "d3b4d0a5-3761-4a55-a444-57c4ce0e1af8";

  it("pone el laboratorio como PRIMER segmento", () => {
    // No es cosmético: es lo único a lo que se agarra la política de
    // Storage, que no tiene una columna tenant_id. Cambiar esto sin tocar
    // la política tumba el aislamiento en silencio.
    const ruta = rutaDeAdjunto(TENANT, ORDEN, "foto.jpg", ID);
    expect(ruta.split("/")[0]).toBe(TENANT);
    expect(ruta.split("/")[1]).toBe(ORDEN);
  });

  it("limpia acentos y espacios del nombre", () => {
    // Una ruta con acentos o espacios se escapa distinto en cada cliente y
    // acaba dando 404 al firmarla.
    const ruta = rutaDeAdjunto(TENANT, ORDEN, "prescripción del doctor.pdf", ID);
    expect(ruta).not.toMatch(/[óá ]/);
    expect(ruta.endsWith("prescripcion-del-doctor.pdf")).toBe(true);
  });

  it("dos archivos con el mismo nombre no chocan", () => {
    const a = rutaDeAdjunto(TENANT, ORDEN, "foto.jpg", "11111111-1111-4111-8111-111111111111");
    const b = rutaDeAdjunto(TENANT, ORDEN, "foto.jpg", "22222222-2222-4222-8222-222222222222");
    expect(a).not.toBe(b);
  });
});
