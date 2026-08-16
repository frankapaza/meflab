"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { error: string | null };

export async function entrar(
  _estadoPrevio: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const volver = String(formData.get("volver") ?? "/");

  if (!email || !password) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje genérico a propósito: distinguir "no existe" de "contraseña
    // incorrecta" le dice a un atacante qué correos son válidos.
    return { error: "Correo o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect(volver.startsWith("/") ? volver : "/");
}

export async function salir() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
