import { PantallaFutura } from "@/components/pantalla-futura";

export const metadata = { title: "Auditoría · MEFLAB" };

export default function AuditoriaPage() {
  return (
    <PantallaFutura
      modulo="3.8"
      titulo="Auditoría"
      fase={3}
      semana="fase 3"
      traera={[
        "Consulta de la bitácora con filtros por usuario, módulo, entidad y rango de fechas.",
        "El antes y el después de cada cambio, tal como los guarda el trigger.",
      ]}
      mientras={{
        texto:
          "La bitácora YA se está escribiendo desde el primer día, y es de sólo añadir: nadie puede editarla ni borrarla, ni siquiera el Administrador. Lo que falta es la pantalla para consultarla; los datos están en la tabla `auditoria` y se pueden mirar desde",
        href: "http://127.0.0.1:54323",
        enlace: "Supabase Studio",
      }}
    />
  );
}
