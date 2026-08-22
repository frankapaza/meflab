// Carga supabase/demo.sql en la base local: deja el laboratorio con un
// ciclo del dinero completo y recorrible, para enseñar la aplicación sin
// teclear nada. Es idempotente — se puede volver a correr cuando la demo
// se llene de pruebas.
//
// psql manda los NOTICE a stderr aunque todo vaya bien, así que se juntan
// las dos salidas: si no, la línea de resumen no se vería nunca.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const r = spawnSync(
  "docker",
  ["exec", "-i", "supabase_db_meflab", "psql", "-U", "postgres", "-d", "postgres", "-q", "-v", "ON_ERROR_STOP=1"],
  { input: readFileSync("supabase/demo.sql"), encoding: "utf8" },
);

const salida = `${r.stderr ?? ""}${r.stdout ?? ""}`.replace(/^psql:<stdin>:\d+: /gm, "  ");

if (r.status !== 0) {
  console.error(salida);
  console.error("\n  ✗ la demo no se cargó\n");
  process.exit(1);
}

process.stdout.write(salida);
console.log("\n  ✓ demo cargada · entra con sponsor@labvera.pe\n");
