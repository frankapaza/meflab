// Ejecuta cada suite de supabase/tests/ contra la base local.
// Sale con código 1 si alguna falla, para que CI la pare.
//
// psql manda los NOTICE a stderr aunque todo vaya bien, así que se mezclan
// las dos salidas: si no, las líneas "OK n · ..." no se verían nunca.
import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const CONTENEDOR = "supabase_db_meflab";
const suites = readdirSync("supabase/tests")
  .filter((f) => f.endsWith(".sql"))
  .sort();

let fallos = 0;

for (const suite of suites) {
  const r = spawnSync(
    "docker",
    ["exec", "-i", CONTENEDOR, "psql", "-U", "postgres", "-d", "postgres", "-q", "-v", "ON_ERROR_STOP=1"],
    { input: readFileSync(`supabase/tests/${suite}`), encoding: "utf8" },
  );

  const limpio = `${r.stderr ?? ""}${r.stdout ?? ""}`.replace(/^psql:<stdin>:\d+: /gm, "  ");

  if (r.status !== 0) {
    fallos++;
    console.error(`\n  ✗ ${suite}\n${limpio}`);
  } else {
    process.stdout.write(limpio);
  }
}

if (fallos) {
  console.error(`\n  ${fallos} de ${suites.length} suites fallaron\n`);
  process.exit(1);
}

console.log(`\n  ${suites.length} suites · todas pasan\n`);
