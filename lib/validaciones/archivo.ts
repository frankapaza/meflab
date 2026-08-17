/**
 * Adjuntos de una orden: fotos del color, escaneos y la prescripción.
 *
 * Los límites viven aquí Y en el bucket. La copia del navegador existe
 * para avisar ANTES de subir 80 MB por una conexión de clínica y que el
 * servidor los rechace al final; la del bucket es la que manda.
 */

/** 100 MiB. Un STL de arcada completa sin comprimir pesa entre 40 y 80 MB. */
export const TAMANO_MAXIMO = 100 * 1024 * 1024;

export const EXTENSIONES = [
  ".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp",
  ".stl", ".ply", ".obj", ".dcm", ".zip",
  ".pdf",
] as const;

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto < 0 ? "" : nombre.slice(punto).toLowerCase();
}

export function validarArchivo(
  nombre: string,
  bytes: number,
): { ok: boolean; motivo?: string } {
  if (bytes === 0) return { ok: false, motivo: "El archivo está vacío." };

  if (bytes > TAMANO_MAXIMO) {
    return {
      ok: false,
      motivo: `Pesa ${pesoLegible(bytes)} y el máximo son ${pesoLegible(TAMANO_MAXIMO)}. Comprímelo en un ZIP.`,
    };
  }

  const ext = extensionDe(nombre);
  if (!EXTENSIONES.includes(ext as (typeof EXTENSIONES)[number])) {
    return {
      ok: false,
      motivo: `No se admiten archivos ${ext || "sin extensión"}. Se aceptan fotos, escaneos (STL, PLY, OBJ, DCM, ZIP) y PDF.`,
    };
  }

  return { ok: true };
}

/** Peso en la unidad que se entiende de un vistazo. */
export function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Qué es el archivo, para poder enseñar un glifo y no sólo un color. */
export function claseDeArchivo(nombre: string): "foto" | "escaneo" | "documento" {
  const ext = extensionDe(nombre);
  if ([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"].includes(ext)) return "foto";
  if ([".stl", ".ply", ".obj", ".dcm", ".zip"].includes(ext)) return "escaneo";
  return "documento";
}

export const GLIFO_ARCHIVO: Record<ReturnType<typeof claseDeArchivo>, string> = {
  foto: "◉",
  escaneo: "◈",
  documento: "▤",
};

/**
 * La ruta dentro del bucket.
 *
 * El primer segmento es el laboratorio, y NO es cosmético: es lo que hace
 * efectiva la política de Storage, que no tiene una columna `tenant_id`
 * donde agarrarse. Cambiar esta convención sin tocar la política tumba el
 * aislamiento en silencio.
 */
export function rutaDeAdjunto(
  tenantId: string,
  ordenId: string,
  nombre: string,
  id: string,
): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .slice(-80);
  return `${tenantId}/${ordenId}/${id}-${limpio}`;
}
