import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import {
  FormularioOrden,
  type OpcionCliente,
  type OpcionColor,
  type OpcionDoctor,
  type OpcionPaciente,
  type OpcionServicio,
} from "./formulario";

export const metadata = { title: "Nueva orden · MEFLAB" };

export default async function NuevaOrdenPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  if (!ctx.roles.some((r) => ["recepcion", "administrador"].includes(r))) {
    redirect("/sin-acceso");
  }

  const supabase = await crearClienteServidor();

  const [
    { data: clientes },
    { data: doctores },
    { data: pacientes },
    { data: servicios },
    { data: colores },
    { data: items },
  ] = await Promise.all([
    supabase.from("cliente").select("id, razon_social, bloqueado").order("razon_social"),
    supabase
      .from("doctor")
      .select("id, cliente_id, nombre")
      .eq("activo", true)
      .order("nombre"),
    // El paciente se lee de la vista, nunca de la tabla (RNF-006).
    supabase.from("v_paciente").select("id, nombre").order("nombre"),
    supabase
      .from("servicio")
      .select("id, codigo, nombre, precio_base, flujo_id")
      .eq("activo", true)
      .order("codigo"),
    supabase.from("color").select("id, codigo, hex").order("orden"),
    supabase.from("lista_precio_item").select("lista_precio_id, servicio_id, precio"),
  ]);

  const { data: clientesConLista } = await supabase
    .from("cliente")
    .select("id, lista_precio_id");

  // Se arma el mapa cliente → servicio → precio para poder ENSEÑAR el
  // importe mientras se registra. El precio que vale es el que resuelve la
  // base: éste no se manda nunca.
  const porLista = new Map<string, Record<string, number>>();
  for (const i of items ?? []) {
    const actual = porLista.get(i.lista_precio_id) ?? {};
    actual[i.servicio_id] = Number(i.precio);
    porLista.set(i.lista_precio_id, actual);
  }

  const preciosPorCliente: Record<string, Record<string, number>> = {};
  for (const c of clientesConLista ?? []) {
    if (c.lista_precio_id) {
      preciosPorCliente[c.id] = porLista.get(c.lista_precio_id) ?? {};
    }
  }

  const opcionesCliente: OpcionCliente[] = (clientes ?? []).map((c) => ({
    id: c.id,
    razonSocial: c.razon_social,
    bloqueado: c.bloqueado,
  }));

  const opcionesDoctor: OpcionDoctor[] = (doctores ?? []).map((d) => ({
    id: d.id,
    clienteId: d.cliente_id,
    nombre: d.nombre,
  }));

  const opcionesPaciente: OpcionPaciente[] = (pacientes ?? []).map((p) => ({
    id: p.id as string,
    nombre: p.nombre as string,
  }));

  const opcionesServicio: OpcionServicio[] = (servicios ?? []).map((s) => ({
    id: s.id,
    codigo: s.codigo,
    nombre: s.nombre,
    precioBase: Number(s.precio_base),
    tieneFlujo: Boolean(s.flujo_id),
  }));

  const opcionesColor: OpcionColor[] = (colores ?? []).map((c) => ({
    id: c.id,
    codigo: c.codigo,
    hex: c.hex ?? "#000000",
  }));

  const faltaAlgo =
    opcionesCliente.length === 0 ||
    opcionesPaciente.length === 0 ||
    opcionesServicio.length === 0;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          <Link href="/trabajos" className="hover:text-acc">
            Tablero
          </Link>
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva orden de trabajo</h1>
      </header>

      {faltaAlgo ? (
        <div className="flex flex-col gap-s2 rounded-r2 border border-warn bg-warn-bg p-s4">
          <h2 className="text-base font-semibold text-warn">
            Faltan datos para poder registrar una orden
          </h2>
          <ul className="flex flex-col gap-s1 text-sm text-warn">
            {opcionesCliente.length === 0 ? (
              <li>
                No hay clientes.{" "}
                <Link href="/clientes" className="underline">
                  Registrar el primero
                </Link>
              </li>
            ) : null}
            {opcionesPaciente.length === 0 ? (
              <li>
                No hay pacientes.{" "}
                <Link href="/pacientes" className="underline">
                  Registrar el primero
                </Link>
              </li>
            ) : null}
            {opcionesServicio.length === 0 ? (
              <li>
                El catálogo está vacío.{" "}
                <Link href="/configuracion" className="underline">
                  Cargar servicios
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <FormularioOrden
          clientes={opcionesCliente}
          doctores={opcionesDoctor}
          pacientes={opcionesPaciente}
          servicios={opcionesServicio}
          colores={opcionesColor}
          preciosPorCliente={preciosPorCliente}
        />
      )}
    </div>
  );
}
