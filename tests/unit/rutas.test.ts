import { describe, expect, it } from "vitest";

import { permiteRuta } from "@/lib/auth/rutas";

const TECNICO = ["tecnico"];
const ADMIN = ["administrador"];
const SPONSOR = ["administrador", "gerencia"]; // el caso real: doble rol

describe("permiteRuta", () => {
  it("falla cerrado sin roles", () => {
    expect(permiteRuta("/", [])).toBe(false);
    expect(permiteRuta("/tokens", [])).toBe(false);
  });

  it("CIERRA toda ruta sin regla declarada", () => {
    // El fallo que se coló: la regla "/" se evaluaba como prefijo y casaba
    // con cualquier ruta, dejando abierto todo lo no declarado.
    expect(permiteRuta("/ruta-inexistente", TECNICO)).toBe(false);
    expect(permiteRuta("/admin-secreto", ADMIN)).toBe(false);
    expect(permiteRuta("/a/b/c", SPONSOR)).toBe(false);
  });

  it("deja pasar la raíz a cualquier rol interno", () => {
    expect(permiteRuta("/", TECNICO)).toBe(true);
    expect(permiteRuta("/", ADMIN)).toBe(true);
  });

  it("respeta la matriz de permisos de AC-01 §5", () => {
    expect(permiteRuta("/configuracion/usuarios", TECNICO)).toBe(false);
    expect(permiteRuta("/configuracion/usuarios", ADMIN)).toBe(true);
    expect(permiteRuta("/auditoria", TECNICO)).toBe(false);
    expect(permiteRuta("/cobranzas", TECNICO)).toBe(false);
    expect(permiteRuta("/cobranzas", ["recepcion"])).toBe(true);
  });

  it("concede si ALGUNO de los roles lo otorga", () => {
    // gerencia no entra a /configuracion/usuarios, administrador sí.
    // El sponsor tiene ambos, así que pasa: los permisos son la unión.
    expect(permiteRuta("/configuracion/usuarios", ["gerencia"])).toBe(false);
    expect(permiteRuta("/configuracion/usuarios", SPONSOR)).toBe(true);
  });

  it("gana el prefijo más específico, no el primero", () => {
    // /produccion excluye a recepcion, pero /produccion/mis-tareas es aún
    // más restrictivo y tampoco la incluye.
    expect(permiteRuta("/produccion", ["recepcion"])).toBe(false);
    expect(permiteRuta("/produccion/mis-tareas", ["tecnico"])).toBe(true);
    expect(permiteRuta("/produccion/mis-tareas", ["lider_laboratorio"])).toBe(false);
  });

  it("no confunde un prefijo con otro que empieza igual", () => {
    // /pagos no debe casar con una hipotética /pagosx
    expect(permiteRuta("/pagosx", ["recepcion"])).toBe(false);
  });
});
