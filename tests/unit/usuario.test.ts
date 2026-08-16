import { describe, expect, it } from "vitest";

import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  exigeMfa,
} from "@/lib/validaciones/usuario";

const BASE = {
  nombre: "Marisol Ríos Cabrera",
  email: "M.Rios@LabVera.pe",
  password: "provisional-2026",
  telefono: "987 654 321",
  roles: ["recepcion"],
};

describe("crearUsuarioSchema", () => {
  it("acepta un alta correcta y normaliza el correo a minúsculas", () => {
    const r = crearUsuarioSchema.parse(BASE);
    // El correo es la identidad de la cuenta: si no se normaliza,
    // "M.Rios@" y "m.rios@" serían dos cuentas distintas.
    expect(r.email).toBe("m.rios@labvera.pe");
  });

  it("exige al menos un rol", () => {
    // Sin rol la cuenta entra pero no ve nada: es un alta inútil que
    // además parece un fallo del sistema a quien la usa.
    const r = crearUsuarioSchema.safeParse({ ...BASE, roles: [] });
    expect(r.success).toBe(false);
  });

  it("acepta VARIOS roles: es el caso real, no la excepción", () => {
    // Recepción cubre facturación, caja y cobranza; el sponsor es
    // Gerencia y Administrador a la vez (AC-01 §4).
    const r = crearUsuarioSchema.parse({
      ...BASE,
      roles: ["recepcion", "administrador"],
    });
    expect(r.roles).toHaveLength(2);
  });

  it("rechaza roles repetidos", () => {
    const r = crearUsuarioSchema.safeParse({
      ...BASE,
      roles: ["recepcion", "recepcion"],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza un rol que no existe", () => {
    const r = crearUsuarioSchema.safeParse({ ...BASE, roles: ["superadmin"] });
    expect(r.success).toBe(false);
  });

  it("exige contraseña de 10 caracteres, igual que la config de Auth", () => {
    // RNF-003. Si el esquema pidiera menos que Auth, el alta fallaría en
    // el servidor con un mensaje de Supabase en inglés.
    expect(crearUsuarioSchema.safeParse({ ...BASE, password: "corta123" }).success).toBe(false);
    expect(crearUsuarioSchema.safeParse({ ...BASE, password: "diez-chars" }).success).toBe(true);
  });

  it("rechaza un correo mal formado", () => {
    expect(crearUsuarioSchema.safeParse({ ...BASE, email: "sin-arroba" }).success).toBe(false);
  });
});

describe("actualizarUsuarioSchema", () => {
  it("no acepta contraseña: cambiarla es otra operación", () => {
    const r = actualizarUsuarioSchema.parse({
      usuarioId: "11111111-1111-4111-8111-111111111111",
      nombre: "Marisol Ríos",
      telefono: "",
      roles: ["recepcion"],
    });
    expect(r).not.toHaveProperty("password");
  });

  it("exige un id válido", () => {
    const r = actualizarUsuarioSchema.safeParse({
      usuarioId: "no-es-uuid",
      nombre: "Marisol Ríos",
      roles: ["recepcion"],
    });
    expect(r.success).toBe(false);
  });
});

describe("exigeMfa", () => {
  it("lo exige a los dos roles con más poder (docs/03 §4)", () => {
    expect(exigeMfa(["administrador"])).toBe(true);
    expect(exigeMfa(["gerencia"])).toBe(true);
  });

  it("no lo exige al resto", () => {
    expect(exigeMfa(["tecnico"])).toBe(false);
    expect(exigeMfa(["recepcion"])).toBe(false);
    expect(exigeMfa([])).toBe(false);
  });

  it("basta con que UNO de los roles lo exija", () => {
    // El caso del sponsor: gerencia + administrador.
    expect(exigeMfa(["tecnico", "administrador"])).toBe(true);
  });
});
