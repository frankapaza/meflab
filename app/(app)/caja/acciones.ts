"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { pagoSchema } from "@/lib/validaciones/facturacion";

export type Resultado = { ok: boolean; mensaje: string | null };

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

function refrescarDinero() {
  revalidatePath("/caja");
  revalidatePath("/cobranzas");
  revalidatePath("/facturacion");
  revalidatePath("/");
}

export async function abrirCaja(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador");
    const monto = Number(formData.get("montoApertura") ?? 0);

    if (!Number.isFinite(monto) || monto < 0) {
      return { ok: false, mensaje: "El monto de apertura no puede ser negativo." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.from("caja_sesion").insert({
      tenant_id: ctx.tenantId,
      monto_apertura: monto,
      abierta_por: ctx.usuarioId,
    });

    if (error) {
      // El índice único deja una sola caja abierta por sede: con dos, el
      // efectivo no se sabe en cuál está y el arqueo deja de significar nada.
      if (error.code === "23505") {
        return { ok: false, mensaje: "Ya hay una caja abierta. Ciérrala antes de abrir otra." };
      }
      return { ok: false, mensaje: error.message };
    }

    refrescarDinero();
    return { ok: true, mensaje: "Caja abierta." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Cierra la caja con arqueo.
 *
 * El teórico lo calcula la base (apertura + ingresos − egresos); el físico
 * lo cuenta la persona. La diferencia se guarda CON SIGNO y congelada: que
 * falte dinero y que sobre son cosas distintas, y ambas hay que poder
 * mirarlas después.
 */
export async function cerrarCaja(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("recepcion", "administrador");

    const sesionId = String(formData.get("sesionId"));
    const fisico = Number(formData.get("montoFisico") ?? NaN);
    const observaciones = String(formData.get("observaciones") ?? "").trim();

    if (!Number.isFinite(fisico) || fisico < 0) {
      return { ok: false, mensaje: "Cuenta el efectivo y escribe cuánto hay." };
    }

    const supabase = await crearClienteServidor();
    const { data, error } = await supabase.rpc("cerrar_caja", {
      p_sesion: sesionId,
      p_monto_fisico: fisico,
      p_observaciones: observaciones || undefined,
    });

    if (error) return { ok: false, mensaje: error.message };

    const diferencia = Number(data ?? 0);
    refrescarDinero();

    if (diferencia === 0) {
      return { ok: true, mensaje: "Caja cerrada. El arqueo cuadra exactamente." };
    }
    return {
      ok: true,
      mensaje:
        diferencia > 0
          ? `Caja cerrada. Sobran S/ ${diferencia.toFixed(2)} respecto de lo esperado.`
          : `Caja cerrada. Faltan S/ ${Math.abs(diferencia).toFixed(2)} respecto de lo esperado.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

export async function registrarMovimiento(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador");

    const sesionId = String(formData.get("sesionId"));
    const tipo = String(formData.get("tipo"));
    const categoria = String(formData.get("categoria") ?? "").trim();
    const concepto = String(formData.get("concepto") ?? "").trim();
    const importe = Number(formData.get("importe") ?? NaN);

    if (concepto.length < 3) {
      return { ok: false, mensaje: "Escribe de qué es el movimiento." };
    }
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "El importe tiene que ser mayor que cero." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.from("caja_movimiento").insert({
      tenant_id: ctx.tenantId,
      sesion_id: sesionId,
      // El importe va siempre positivo; el signo lo lleva el tipo.
      tipo: tipo as "ingreso" | "egreso",
      categoria: categoria || "otros",
      concepto,
      importe,
      created_by: ctx.usuarioId,
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescarDinero();
    return { ok: true, mensaje: "Movimiento registrado." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Registra un pago y lo imputa a los documentos indicados.
 *
 * El pago y su imputación viajan juntos a la base: un pago sin aplicar y
 * una aplicación sin pago son dos formas de descuadrar la cartera.
 */
export async function registrarPago(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("recepcion", "administrador");

    const datos = pagoSchema.parse({
      clienteId: formData.get("clienteId") ?? "",
      importe: formData.get("importe") ?? 0,
      medio: formData.get("medio") ?? "efectivo",
      referencia: formData.get("referencia") ?? "",
      observaciones: formData.get("observaciones") ?? "",
      aplicaciones: JSON.parse(String(formData.get("aplicaciones") ?? "[]")),
    });

    const sesionCaja = String(formData.get("sesionCaja") ?? "");

    const supabase = await crearClienteServidor();
    const { error } = await supabase.rpc("registrar_pago", {
      p_cliente: datos.clienteId,
      p_importe: datos.importe,
      p_medio: datos.medio,
      p_aplicaciones: datos.aplicaciones.map((a) => ({
        cuenta_cobrar_id: a.cuentaCobrarId,
        importe: a.importe,
      })),
      p_referencia: datos.referencia || undefined,
      p_observaciones: datos.observaciones || undefined,
      // Sólo el efectivo entra a caja. Una transferencia no pasa por el
      // cajón, y meterla haría que el arqueo no cuadre nunca.
      p_sesion_caja: datos.medio === "efectivo" && sesionCaja ? sesionCaja : undefined,
    });

    if (error) {
      if (error.message.includes("No se puede aplicar")) {
        return {
          ok: false,
          mensaje: "Se está aplicando más de lo que se debe. Revisa el reparto.",
        };
      }
      return { ok: false, mensaje: error.message };
    }

    const aplicado = datos.aplicaciones.reduce((s, a) => s + a.importe, 0);
    const anticipo = datos.importe - aplicado;

    refrescarDinero();
    return {
      ok: true,
      mensaje:
        anticipo > 0
          ? `Pago registrado. S/ ${anticipo.toFixed(2)} quedan como saldo a favor del cliente.`
          : "Pago registrado y aplicado.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Aplicar un saldo a favor a las deudas abiertas del cliente.
 *
 * No crea un pago: reparte uno que ya entró. Si creara uno nuevo, el
 * laboratorio vería cobrado dos veces el mismo dinero — y en una caja,
 * eso es lo peor que puede pasar.
 */
export async function aplicarAnticipo(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("recepcion", "administrador");

    const pagoId = String(formData.get("pagoId"));
    const aplicaciones = JSON.parse(String(formData.get("aplicaciones") ?? "[]")) as {
      cuentaCobrarId: string;
      importe: number;
    }[];

    if (aplicaciones.length === 0) {
      return { ok: false, mensaje: "No hay ninguna deuda a la que aplicarlo." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.rpc("aplicar_anticipo", {
      p_pago: pagoId,
      p_aplicaciones: aplicaciones.map((a) => ({
        cuenta_cobrar_id: a.cuentaCobrarId,
        importe: a.importe,
      })),
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescarDinero();
    return { ok: true, mensaje: "Saldo a favor aplicado." };
  } catch (e) {
    return comoMensaje(e);
  }
}
