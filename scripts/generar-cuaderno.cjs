/**
 * Genera docs/MEFLAB - Cuaderno de puesta en marcha.xlsx
 *
 * El cuaderno que se le manda al laboratorio para recoger sus datos reales:
 * decisiones abiertas, áreas, usuarios, tarifario, flujos y cartera.
 *
 * Se guarda el generador y no sólo el .xlsx porque el cuaderno va a cambiar
 * —cada respuesta que llegue quita una pregunta— y editarlo a mano en Excel
 * pierde el formato y el porqué de cada columna.
 *
 * Uso:  npx --yes exceljs@4 >/dev/null 2>&1; node scripts/generar-cuaderno.cjs
 * (exceljs no es dependencia de MEFLAB: es una herramienta de una vez.)
 */

const ExcelJS = require("exceljs");
const path = require("path");

const TEAL = "FF0F766E";
const TEAL_SUAVE = "FFDDF2EF";
const AMBAR = "FFFBEED6";
const AMBAR_TXT = "FF8A5300";
const GRIS = "FFF4F4F2";
const LINEA = "FFD9D9D6";
const TINTA_2 = "FF5A5A55";

const libro = new ExcelJS.Workbook();
libro.creator = "MEFLAB";
libro.created = new Date(2026, 7, 19);

const borde = {
  top: { style: "thin", color: { argb: LINEA } },
  left: { style: "thin", color: { argb: LINEA } },
  bottom: { style: "thin", color: { argb: LINEA } },
  right: { style: "thin", color: { argb: LINEA } },
};

/** Título de la hoja, con su explicación debajo. */
function cabecera(hoja, titulo, bajada, anchoFusion) {
  hoja.mergeCells(1, 1, 1, anchoFusion);
  const t = hoja.getCell(1, 1);
  t.value = titulo;
  t.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
  t.alignment = { vertical: "middle", indent: 1 };
  hoja.getRow(1).height = 30;

  hoja.mergeCells(2, 1, 2, anchoFusion);
  const b = hoja.getCell(2, 1);
  b.value = bajada;
  b.font = { name: "Calibri", size: 10, color: { argb: TINTA_2 } };
  b.alignment = { vertical: "middle", wrapText: true, indent: 1 };
  hoja.getRow(2).height = 34;

  hoja.getRow(3).height = 6;
}

/** Fila de encabezados de una tabla, a partir de la fila indicada. */
function encabezados(hoja, fila, columnas) {
  const r = hoja.getRow(fila);
  columnas.forEach((c, i) => {
    const cel = r.getCell(i + 1);
    cel.value = c;
    cel.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
    cel.alignment = { vertical: "middle", wrapText: true, horizontal: "left", indent: 1 };
    cel.border = borde;
  });
  r.height = 30;
}

/** Marca una fila como ejemplo: se ve distinta y se borra antes de llenar. */
function filaEjemplo(hoja, fila) {
  hoja.getRow(fila).eachCell({ includeEmpty: true }, (cel) => {
    cel.font = { name: "Calibri", size: 10, italic: true, color: { argb: TINTA_2 } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
    cel.alignment = { vertical: "middle", wrapText: true, indent: 1 };
    cel.border = borde;
  });
}

/** Filas en blanco listas para escribir. */
function filasVacias(hoja, desde, cuantas, columnas) {
  for (let f = desde; f < desde + cuantas; f++) {
    const r = hoja.getRow(f);
    r.height = 20;
    for (let c = 1; c <= columnas; c++) {
      const cel = r.getCell(c);
      cel.border = borde;
      cel.alignment = { vertical: "middle", wrapText: true, indent: 1 };
      cel.font = { name: "Calibri", size: 10 };
    }
  }
}

function nota(hoja, fila, texto, ancho) {
  hoja.mergeCells(fila, 1, fila, ancho);
  const c = hoja.getCell(fila, 1);
  c.value = texto;
  c.font = { name: "Calibri", size: 9, color: { argb: AMBAR_TXT } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBAR } };
  c.alignment = { vertical: "middle", wrapText: true, indent: 1 };
  hoja.getRow(fila).height = Math.max(24, Math.ceil(texto.length / (ancho * 11)) * 14 + 10);
}

function anchos(hoja, lista) {
  lista.forEach((w, i) => (hoja.getColumn(i + 1).width = w));
}

/* ═══════════════════════════════════════════════════════════════════════
   0 · LÉEME
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("Léeme", { views: [{ showGridLines: false }] });
  anchos(h, [4, 30, 60, 18, 22]);
  cabecera(
    h,
    "MEFLAB · Cuaderno de puesta en marcha",
    "Todo lo que el laboratorio tiene que responder o entregar para que MEFLAB pase de funcionar con datos de prueba a funcionar con los datos reales del negocio. Cada hoja es independiente: se pueden llenar en cualquier orden y por personas distintas.",
    5,
  );

  let f = 5;
  const bloque = (titulo, texto) => {
    h.mergeCells(f, 2, f, 5);
    const c = h.getCell(f, 2);
    c.value = titulo;
    c.font = { name: "Calibri", size: 12, bold: true, color: { argb: TEAL } };
    f++;
    h.mergeCells(f, 2, f, 5);
    const d = h.getCell(f, 2);
    d.value = texto;
    d.font = { name: "Calibri", size: 10, color: { argb: TINTA_2 } };
    d.alignment = { wrapText: true, vertical: "top" };
    h.getRow(f).height = Math.max(30, Math.ceil(texto.length / 105) * 14);
    f += 2;
  };

  bloque(
    "Cómo se llena",
    "Las celdas grises en cursiva son EJEMPLOS: bórralas y escribe encima. Las columnas marcadas con * son obligatorias. Si algo no se sabe todavía, se deja vacío y se escribe el motivo en la columna de observaciones — un hueco explicado vale más que un dato inventado.",
  );
  bloque(
    "Qué pasa con lo que hay ahora en el sistema",
    "MEFLAB funciona hoy con datos de prueba: un laboratorio llamado «Laboratorio Dental Vera», un RUC inventado, 14 servicios con precios inventados y 3 flujos de producción inventados. Todo eso se borra y se reemplaza con lo que salga de este cuaderno. No hace falta conservar nada.",
  );
  bloque(
    "Qué es urgente y qué no",
    "Las hojas 1 a 5 son las que bloquean: sin ellas no se puede cargar el laboratorio de verdad. Las hojas 6 a 10 se pueden ir llenando en paralelo. La hoja 11 son cuentas externas que hay que crear para poder publicar.",
  );

  f++;
  encabezados(h, f, ["", "Hoja", "Qué se pide", "Fecha límite", "Quién lo responde"]);
  const filas = [
    ["1", "Decisiones abiertas", "Cuatro preguntas de negocio que el sistema no puede decidir solo", "Dos en semana 12", "Sponsor"],
    ["2", "Datos del laboratorio", "RUC, razón social, sedes, IGV, condiciones por defecto", "Semana 12", "Administración"],
    ["3", "Áreas productivas", "Cuántas áreas hay y qué hace cada una", "Semana 12", "Sponsor + jefe de taller"],
    ["4", "Usuarios y roles", "Quién entra al sistema y con qué permisos", "Semana 12", "Sponsor"],
    ["5", "Matriz de permisos", "Referencia: qué puede hacer cada rol. Sólo para revisar", "—", "Lectura"],
    ["6", "Tarifario", "El catálogo de servicios con sus precios reales", "Semana 12", "Administración"],
    ["7", "Listas de precio", "Convenios y tarifas especiales por cliente", "Semana 14", "Administración"],
    ["8", "Procesos del taller", "Los pasos de fabricación y cuánto dura cada uno", "Semana 14", "Jefe de taller"],
    ["9", "Flujos de producción", "Qué pasos lleva cada tipo de trabajo, en qué orden", "Semana 14", "Jefe de taller"],
    ["10", "Clientes y doctores", "La cartera para la carga inicial", "Semana 16", "Recepción"],
    ["11", "Cuentas y accesos", "Servicios externos que hay que contratar", "Semana 12", "Sponsor"],
  ];
  f++;
  filas.forEach((fila) => {
    const r = h.getRow(f);
    fila.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      c.font = { name: "Calibri", size: 10, bold: i === 1 };
      c.alignment = { vertical: "middle", wrapText: true, indent: 1 };
      c.border = borde;
      if (i === 0) c.alignment = { vertical: "middle", horizontal: "center" };
    });
    r.height = 22;
    f++;
  });

  f++;
  nota(
    h,
    f,
    "Nada de este cuaderno bloquea que el desarrollo siga. Bloquea que MEFLAB se pueda usar con los datos del laboratorio, que es distinto: se puede seguir construyendo con datos de prueba, pero no se puede arrancar en producción sin esto.",
    5,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   1 · DECISIONES ABIERTAS
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("1 · Decisiones", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 38, 46, 42, 16, 34]);
  cabecera(
    h,
    "1 · Decisiones abiertas",
    "Cuatro preguntas que el sistema no puede decidir solo porque dependen de cómo trabaja este laboratorio. Cada una dice qué se bloquea si no se responde y qué pasa mientras tanto.",
    6,
  );

  encabezados(h, 4, ["#", "La pregunta", "Por qué hace falta", "Qué pasa mientras no se responda", "Límite", "RESPUESTA"]);

  const d = [
    [
      "1",
      "¿Cuántas áreas productivas tiene el laboratorio?\n\n¿CAD-CAM es un área propia o vive dentro de Fija? ¿La prótesis total va con la parcial o aparte?",
      "El área es lo que enruta el trabajo al equipo correcto y lo que permite que un Líder de Área vea sólo lo suyo. También es la base de los indicadores por área.",
      "Todo cae en un área única llamada GENERAL y nadie nota nada. El esquema ya lleva la columna en cada tabla, así que activar las áreas después cuesta una pantalla — pero sólo si se hace ANTES de cargar datos reales. Después obliga a reasignar a mano cada registro.",
      "Semana 12",
      "",
    ],
    [
      "2",
      "¿Quién será el segundo Administrador?",
      "Hoy sólo hay una persona con permiso para crear usuarios, tocar el catálogo y los precios. Si esa persona no está disponible, el laboratorio no puede dar de alta a nadie ni corregir una tarifa.",
      "La operación queda sin respaldo. No es un problema técnico: es que un solo administrador es un punto único de fallo.",
      "Semana 12",
      "",
    ],
    [
      "3",
      "¿Quién hace el control de calidad?\n\n¿El líder de área o el líder de laboratorio?",
      "Define quién firma que un trabajo está bien antes de que salga, y a quién se le notifica una no conformidad.",
      "El módulo de calidad es de la Fase 3, así que no bloquea nada todavía. Pero conviene decidirlo antes de diseñarlo.",
      "Semana 21",
      "",
    ],
    [
      "4",
      "¿Cuántos técnicos hay por área y qué sabe hacer cada uno?",
      "Es lo que permite sugerir a quién asignar una etapa según su competencia y su carga, en vez de asignársela siempre al mismo.",
      "La asignación funciona igual, pero manual: el responsable elige a ojo. El sistema ya enseña la carga de cada uno para ayudar.",
      "Semana 21",
      "",
    ],
  ];

  let f = 5;
  d.forEach((fila) => {
    const r = h.getRow(f);
    fila.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      c.font = { name: "Calibri", size: 10, bold: i === 1 };
      c.alignment = { vertical: "top", wrapText: true, indent: 1 };
      c.border = borde;
      if (i === 5) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_SUAVE } };
      if (i === 0) c.alignment = { vertical: "top", horizontal: "center" };
    });
    r.height = 110;
    f++;
  });

  f++;
  nota(
    h,
    f,
    "Las decisiones 1 y 2 vencen en la semana 12, que es la misma semana en la que el MVP debería entrar en producción. Son las dos que hay que responder primero.",
    6,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   2 · DATOS DEL LABORATORIO
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("2 · Laboratorio", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 34, 40, 44, 34]);
  cabecera(
    h,
    "2 · Datos del laboratorio",
    "Lo que identifica al negocio y aparece en los documentos. Ahora mismo el sistema tiene datos inventados que hay que reemplazar.",
    5,
  );

  encabezados(h, 4, ["#", "Dato", "Qué hay ahora (inventado)", "Qué se necesita", "RESPUESTA"]);

  const d = [
    ["1", "Razón social *", "Laboratorio Dental Vera", "El nombre exacto como figura en SUNAT. Sale en las facturas.", ""],
    ["2", "RUC *", "20512345671 (falso)", "El RUC real. El sistema valida el dígito verificador, así que uno mal tecleado lo rechaza al guardar.", ""],
    ["3", "Nombre comercial", "—", "Si el laboratorio usa un nombre distinto del de SUNAT.", ""],
    ["4", "Dirección fiscal *", "San Isidro, Lima", "La dirección completa que va en el comprobante.", ""],
    ["5", "Teléfono", "—", "El que se da a los doctores.", ""],
    ["6", "Correo", "—", "Al que llegan las respuestas de los doctores.", ""],
    ["7", "Sedes *", "Una: «Sede principal»", "¿Hay más de un local? Si sí, listarlas en las filas de abajo con su dirección.", ""],
    ["8", "Tasa de IGV *", "18 %", "Confirmar que sigue siendo 18 %. Está en configuración, no en el código: si cambia por ley, se cambia sin tocar el sistema.", ""],
    ["9", "Días de crédito por defecto", "30 días", "Los que se le ponen a un cliente nuevo si no se dice otra cosa. Se puede cambiar cliente por cliente.", ""],
    ["10", "Serie de las órdenes", "Formato OT-2026-000001", "Confirmar si sirve o si el laboratorio ya usa otra numeración que haya que respetar. Si ya tiene un correlativo en curso, decir por qué número va.", ""],
    ["11", "Logo", "—", "Archivo PNG o SVG con fondo transparente, para la cabecera y los documentos.", ""],
    ["12", "Horario de trabajo", "8 h/día, se descansa domingo", "Es lo que usa el sistema para calcular «faltan 3 días hábiles» y la capacidad del taller. Confirmar o corregir.", ""],
  ];

  let f = 5;
  d.forEach((fila) => {
    const r = h.getRow(f);
    fila.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      c.font = { name: "Calibri", size: 10, bold: i === 1, italic: i === 2 };
      c.alignment = { vertical: "top", wrapText: true, indent: 1 };
      c.border = borde;
      if (i === 2) c.font = { name: "Calibri", size: 10, italic: true, color: { argb: TINTA_2 } };
      if (i === 4) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_SUAVE } };
      if (i === 0) c.alignment = { vertical: "top", horizontal: "center" };
    });
    r.height = 42;
    f++;
  });

  f++;
  h.mergeCells(f, 1, f, 5);
  h.getCell(f, 1).value = "Sedes, si hay más de una";
  h.getCell(f, 1).font = { name: "Calibri", size: 12, bold: true, color: { argb: TEAL } };
  f++;
  encabezados(h, f, ["#", "Código corto", "Nombre de la sede", "Dirección", "¿Se entregan trabajos aquí?"]);
  f++;
  h.getRow(f).values = ["ej.", "PRINCIPAL", "Sede principal", "Av. Ejemplo 123, San Isidro, Lima", "Sí"];
  filaEjemplo(h, f);
  filasVacias(h, f + 1, 5, 5);
}

/* ═══════════════════════════════════════════════════════════════════════
   3 · ÁREAS PRODUCTIVAS
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("3 · Áreas", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 18, 26, 46, 26, 20, 30]);
  cabecera(
    h,
    "3 · Áreas productivas",
    "Un área es un grupo de trabajo del taller con su propio responsable. Sirve para enrutar cada trabajo al equipo que lo hace, para que un líder vea sólo lo suyo, y para medir por área. Es la decisión 1 de la hoja anterior, desarrollada.",
    7,
  );

  encabezados(h, 4, ["#", "Código corto *", "Nombre del área *", "Qué trabajos hace (para saber qué servicios enrutar aquí)", "Quién la lidera", "¿Cuántos técnicos?", "Observaciones"]);

  let f = 5;
  const ej = [
    ["ej.", "FIJA", "Prótesis fija", "Coronas, puentes, incrustaciones, carillas cerámicas", "Nombre y apellido", "3", "Incluye el metal-porcelana"],
    ["ej.", "CADCAM", "CAD-CAM / digital", "Escaneo, diseño, fresado y sinterizado", "Nombre y apellido", "2", "¿Es área propia o parte de Fija?"],
    ["ej.", "REMOVIBLE", "Prótesis removible", "Parciales acrílicas y de cromo, totales", "Nombre y apellido", "2", ""],
  ];
  ej.forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 26;
    f++;
  });
  filasVacias(h, f, 10, 7);
  f += 11;

  nota(
    h,
    f,
    "Si el laboratorio funciona como un solo equipo sin división real, la respuesta correcta es UNA sola área. No hay que inventarse divisiones para llenar la tabla: un área que no existe en el taller sólo añade un paso al registro.",
    7,
  );
  f += 2;
  nota(
    h,
    f,
    "Ojo con el momento: definir las áreas ANTES de cargar los servicios y las órdenes reales cuesta llenar esta tabla. Definirlas DESPUÉS obliga a reasignar a mano cada servicio, cada proceso y cada trabajo ya registrado.",
    7,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   4 · USUARIOS Y ROLES
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("4 · Usuarios", { views: [{ showGridLines: false, state: "frozen", ySplit: 5 }] });
  anchos(h, [5, 26, 30, 16, 13, 11, 15, 12, 13, 11, 18, 26]);
  cabecera(
    h,
    "4 · Usuarios y roles",
    "Quién entra a MEFLAB y qué puede hacer. Una persona puede tener VARIOS roles: se marcan todos los que le correspondan y sus permisos son la suma. Nunca se inventa un rol mezclado tipo «Recepción-Caja»; se marcan los dos.",
    12,
  );

  encabezados(h, 4, [
    "#", "Nombre y apellido *", "Correo *", "Teléfono",
    "Adminis-\ntrador", "Gerencia", "Líder de\nlaboratorio", "Recepción", "Líder de\nárea", "Técnico",
    "Si es Líder de área,\n¿cuál?", "Observaciones",
  ]);

  // Segunda fila de encabezado con la pista de marcar X
  const r5 = h.getRow(5);
  ["", "", "", "", "X", "X", "X", "X", "X", "X", "", ""].forEach((v, i) => {
    const c = r5.getCell(i + 1);
    c.value = v ? "marca X" : "";
    c.font = { name: "Calibri", size: 8, italic: true, color: { argb: TINTA_2 } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
    c.border = borde;
  });
  r5.height = 16;

  let f = 6;
  const ej = [
    ["ej.", "Alberto Vera Ramos", "alberto@labvera.pe", "999 888 777", "X", "X", "", "", "", "", "", "Es el sponsor: administra y además mira los números"],
    ["ej.", "Carlos Quispe Ninaja", "carlos@labvera.pe", "", "", "", "", "", "", "X", "", ""],
    ["ej.", "Paola Requena Soto", "paola@labvera.pe", "", "", "", "", "X", "", "", "", "Mostrador. En la Fase 2 también facturará y cobrará"],
  ];
  ej.forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 26;
    f++;
  });
  filasVacias(h, f, 18, 12);
  f += 19;

  nota(
    h,
    f,
    "El correo es la identidad: con él se entra y a él llega la invitación. Tiene que ser único y de una persona, no compartido — «recepcion@labvera.pe» usado por tres personas hace imposible saber quién registró qué, y la bitácora deja de servir para nada.",
    12,
  );
  f += 2;
  nota(
    h,
    f,
    "Hacen falta AL MENOS DOS administradores (decisión 2). Con uno solo, si esa persona no está, nadie puede crear usuarios ni corregir una tarifa.",
    12,
  );
  f += 2;
  nota(
    h,
    f,
    "Las contraseñas NO van en este archivo. Cada persona recibe una invitación por correo y elige la suya. Nadie, ni el administrador, puede ver la contraseña de otro.",
    12,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   5 · MATRIZ DE PERMISOS (referencia)
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("5 · Permisos", { views: [{ showGridLines: false, state: "frozen", ySplit: 5, xSplit: 1 }] });
  anchos(h, [30, 14, 14, 16, 13, 13, 12, 30]);
  cabecera(
    h,
    "5 · Matriz de permisos · referencia",
    "Qué puede hacer cada rol en cada módulo. Esta hoja NO se llena: es para revisar que los roles de la hoja anterior son los correctos. Si algo aquí no cuadra con cómo trabaja el laboratorio, decirlo en la columna de la derecha.",
    8,
  );

  const r4 = h.getRow(4);
  r4.getCell(1).value = "Leyenda:   T = total (ver, crear, editar, eliminar)   ·   E = editar   ·   C = sólo consulta   ·   A = sólo su área   ·   P = sólo lo propio   ·   — = sin acceso";
  h.mergeCells(4, 1, 4, 8);
  r4.getCell(1).font = { name: "Calibri", size: 9, italic: true, color: { argb: TINTA_2 } };
  r4.height = 18;

  encabezados(h, 5, ["Módulo", "Gerencia", "Adminis-\ntrador", "Líder de\nlaboratorio", "Recepción", "Líder de\nárea", "Técnico", "¿Está bien? Observaciones"]);

  const m = [
    ["Dashboard", "T", "T", "T", "C", "A", "P"],
    ["Clientes", "C", "T", "C", "E", "—", "—"],
    ["Doctores", "C", "T", "C", "E", "C", "C"],
    ["Pacientes", "C", "T", "C", "E", "A", "P"],
    ["Órdenes de trabajo", "C", "T", "E", "E", "A", "P"],
    ["Producción", "C", "T", "T", "C", "A", "P"],
    ["Asignación de tareas", "C", "T", "T", "—", "A", "—"],
    ["Entregas", "C", "T", "E", "E", "A", "—"],
    ["Catálogo y tarifas", "E", "T", "C", "C", "C", "—"],
    ["Listas de precio", "E", "T", "C", "C", "C", "—"],
    ["Procesos y flujos", "C", "T", "C", "—", "C", "—"],
    ["Adjuntos de la orden", "C", "T", "E", "E", "C", "C"],
    ["Calidad  (Fase 3)", "C", "T", "E", "C", "A", "C"],
    ["Retrabajos  (Fase 3)", "E", "T", "E", "C", "A", "C"],
    ["Inventario  (Fase 3)", "C", "T", "E", "C", "A", "P"],
    ["Compras  (Fase 4)", "E", "T", "E", "—", "C", "—"],
    ["Facturación  (Fase 2)", "C", "T", "—", "E", "—", "—"],
    ["Pagos  (Fase 2)", "C", "T", "—", "E", "—", "—"],
    ["Caja  (Fase 2)", "C", "T", "—", "E", "—", "—"],
    ["Cuentas por cobrar  (Fase 2)", "C", "T", "—", "E", "—", "—"],
    ["Cobranza  (Fase 2)", "E", "T", "—", "E", "—", "—"],
    ["Reportes  (Fase 3)", "T", "T", "E", "C", "A", "P"],
    ["Auditoría  (Fase 3)", "C", "T", "—", "—", "—", "—"],
    ["Configuración", "C", "T", "—", "—", "—", "—"],
    ["Usuarios y permisos", "C", "T", "—", "—", "—", "—"],
  ];

  let f = 6;
  m.forEach((fila) => {
    const r = h.getRow(f);
    fila.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      c.font = { name: "Calibri", size: 10, bold: i === 0 };
      c.alignment = i === 0
        ? { vertical: "middle", indent: 1 }
        : { vertical: "middle", horizontal: "center" };
      c.border = borde;
      if (i > 0 && v === "T") c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_SUAVE } };
      if (i > 0 && v === "—") c.font = { name: "Calibri", size: 10, color: { argb: "FFAAAAA5" } };
    });
    r.getCell(8).border = borde;
    r.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_SUAVE } };
    r.height = 20;
    f++;
  });

  f++;
  h.mergeCells(f, 1, f, 8);
  h.getCell(f, 1).value = "Permisos de aprobación · quién puede autorizar cada excepción";
  h.getCell(f, 1).font = { name: "Calibri", size: 12, bold: true, color: { argb: TEAL } };
  f++;
  encabezados(h, f, ["Acción", "Quién puede hoy", "", "", "", "", "", "¿Está bien? Observaciones"]);
  h.mergeCells(f, 2, f, 7);
  f++;

  const ap = [
    ["Vender por encima de la línea de crédito", "Gerencia, Administrador"],
    ["Anular un documento ya emitido", "Gerencia, Administrador"],
    ["Cobrar un retrabajo al doctor", "Gerencia, Líder de laboratorio"],
    ["Aprobar un ajuste de inventario", "Administrador, Líder de laboratorio"],
    ["Autorizar una diferencia de arqueo de caja", "Gerencia, Administrador"],
    ["Modificar precios del catálogo", "Gerencia, Administrador"],
    ["Reasignar una tarea ya empezada", "Líder de área (la suya), Líder de laboratorio"],
    ["Mover un trabajo de un área a otra", "Líder de laboratorio"],
    ["Crear o desactivar usuarios", "Administrador"],
    ["Borrar un adjunto de una orden", "Administrador"],
  ];
  ap.forEach((fila) => {
    const r = h.getRow(f);
    r.getCell(1).value = fila[0];
    r.getCell(1).font = { name: "Calibri", size: 10, bold: true };
    r.getCell(1).alignment = { vertical: "middle", indent: 1 };
    r.getCell(1).border = borde;
    h.mergeCells(f, 2, f, 7);
    r.getCell(2).value = fila[1];
    r.getCell(2).font = { name: "Calibri", size: 10 };
    r.getCell(2).alignment = { vertical: "middle", indent: 1 };
    r.getCell(2).border = borde;
    r.getCell(8).border = borde;
    r.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_SUAVE } };
    r.height = 20;
    f++;
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   6 · TARIFARIO
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("6 · Tarifario", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 16, 40, 22, 16, 16, 20, 26]);
  cabecera(
    h,
    "6 · Tarifario de servicios",
    "El catálogo real del laboratorio. Lo que hay cargado ahora son 14 servicios con precios inventados que se borran. IMPORTANTE: hay que decir si los precios que se escriben aquí llevan el IGV incluido o no — es la pregunta que más caro sale equivocar.",
    8,
  );

  encabezados(h, 4, ["#", "Código *", "Nombre del servicio *", "Categoría *", "Precio *", "¿El precio\nlleva IGV?", "Área que lo hace", "Observaciones"]);

  let f = 5;
  const ej = [
    ["ej.", "COR-ZIR", "Corona de zirconio monolítica", "Prótesis fija", 620, "No", "CADCAM", ""],
    ["ej.", "COR-MET", "Corona metal-porcelana", "Prótesis fija", 380, "No", "FIJA", ""],
    ["ej.", "PPR-CRO", "Prótesis parcial removible de cromo", "Prótesis removible", 880, "No", "REMOVIBLE", "Precio por unidad"],
  ];
  ej.forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 22;
    f++;
  });
  filasVacias(h, f, 40, 8);
  h.getColumn(5).numFmt = '"S/" #,##0.00';
  f += 41;

  nota(
    h,
    f,
    "Sobre el IGV: MEFLAB guarda SIEMPRE el valor de venta sin IGV, porque es lo que exige el comprobante. Pero muchos laboratorios pactan con el doctor un precio «a todo costo» que ya lo incluye. Si en esta hoja se escriben precios con IGV incluido, el sistema los convierte solo al cargarlos. Lo que no puede es adivinarlo: por eso la columna es obligatoria.",
    8,
  );
  f += 3;
  nota(
    h,
    f,
    "El código viaja en la orden y en el comprobante electrónico. Admite letras, números y guiones, sin espacios ni tildes. Si el laboratorio ya usa códigos propios, se respetan.",
    8,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   7 · LISTAS DE PRECIO
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("7 · Listas de precio", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 34, 22, 24, 40, 30]);
  cabecera(
    h,
    "7 · Listas de precio",
    "Una lista es una tarifa pactada con un cliente o grupo de clientes. Un cliente sin lista asignada paga el precio del tarifario. Cada lista declara por separado si SUS precios se teclean con IGV o sin él.",
    6,
  );

  encabezados(h, 4, ["#", "Nombre de la lista *", "¿Sus precios\nllevan IGV? *", "¿Es la lista por\ndefecto?", "Para qué clientes es", "Observaciones"]);

  let f = 5;
  [
    ["ej.", "Tarifario general", "No", "Sí", "Todos los que no tengan convenio", "Es la que manda si un cliente no tiene otra"],
    ["ej.", "Convenio Clínica Sonrisa Plena", "Sí", "No", "Clínica Dental Sonrisa Plena S.A.C.", "Pactado a todo costo, con IGV incluido"],
  ].forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 22;
    f++;
  });
  filasVacias(h, f, 10, 6);
  f += 11;

  h.mergeCells(f, 1, f, 6);
  h.getCell(f, 1).value = "Precios de cada lista, sólo donde se aparta del tarifario";
  h.getCell(f, 1).font = { name: "Calibri", size: 12, bold: true, color: { argb: TEAL } };
  f += 1;
  h.mergeCells(f, 1, f, 6);
  h.getCell(f, 1).value = "Sólo hay que poner los servicios cuyo precio cambia en esa lista. Los que no aparezcan se cobran al precio del tarifario.";
  h.getCell(f, 1).font = { name: "Calibri", size: 9, italic: true, color: { argb: TINTA_2 } };
  f += 2;

  encabezados(h, f, ["#", "Lista", "Código del servicio", "Precio en esta lista", "¿Ese precio lleva IGV? (igual que la lista)", "Observaciones"]);
  f++;
  h.getRow(f).values = ["ej.", "Convenio Clínica Sonrisa Plena", "COR-ZIR", 708, "Sí", "620 sin IGV = 731.60 con IGV; se pactó 708"];
  filaEjemplo(h, f);
  filasVacias(h, f + 1, 25, 6);
  h.getColumn(4).numFmt = '"S/" #,##0.00';
}

/* ═══════════════════════════════════════════════════════════════════════
   8 · PROCESOS DEL TALLER
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("8 · Procesos", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 18, 34, 20, 20, 22, 32]);
  cabecera(
    h,
    "8 · Procesos del taller",
    "Un proceso es un paso de fabricación: modelo, escaneo, diseño, fresado, cerámica, acabado… El tiempo estimado no es burocracia: es lo que permite decir a un doctor si su trabajo llega para el jueves, y lo que reparte la carga entre los técnicos.",
    7,
  );

  encabezados(h, 4, ["#", "Código *", "Nombre del proceso *", "Tiempo estimado *\n(horas)", "Área que lo hace", "¿Lo hace un tercero?\n(sí / no)", "Observaciones"]);

  let f = 5;
  [
    ["ej.", "MODELO", "Modelo / vaciado", 1, "FIJA", "No", ""],
    ["ej.", "ESCANEO", "Escaneo del modelo", 0.5, "CADCAM", "No", "Media hora = 0.5"],
    ["ej.", "FRESADO", "Fresado / sinterizado", 3, "CADCAM", "No", "Incluye el horno"],
    ["ej.", "PRUEBA", "Prueba en clínica", 0.25, "FIJA", "No", "No consume taller, pero para el reloj"],
  ].forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 22;
    f++;
  });
  filasVacias(h, f, 25, 7);
  h.getColumn(4).numFmt = "0.00";
  f += 26;

  nota(
    h,
    f,
    "El tiempo va en HORAS con decimales: media hora es 0.5, un cuarto de hora es 0.25, hora y media es 1.5. En pantalla el sistema lo traduce solo a «1 h 30 min», que es como se dice en el taller.",
    7,
  );
  f += 2;
  nota(
    h,
    f,
    "Si un paso lo hace un tercero (fresado externo, por ejemplo), márcalo igual: ocupa tiempo del calendario aunque no ocupe a un técnico, y hay que verlo en el tablero para saber por qué un trabajo está parado.",
    7,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   9 · FLUJOS DE PRODUCCIÓN
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("9 · Flujos", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 34, 10, 22, 34, 30]);
  cabecera(
    h,
    "9 · Flujos de producción",
    "Un flujo es la receta de un tipo de trabajo: qué pasos lleva y en qué orden. Cuando se registra una orden, el flujo del servicio se copia en tareas concretas — es lo que llena el tablero. Un servicio SIN flujo entra en producción sin ninguna tarea y no aparece en el tablero de nadie.",
    6,
  );

  encabezados(h, 4, ["#", "Nombre del flujo *", "Paso nº *", "Código del proceso *", "Servicios que siguen este flujo (códigos, separados por coma)", "Observaciones"]);

  let f = 5;
  [
    ["ej.", "Corona de zirconio (CAD-CAM)", 1, "MODELO", "COR-ZIR, PUE-ZIR, INC-ONL", "Se escribe una fila por paso"],
    ["ej.", "Corona de zirconio (CAD-CAM)", 2, "ESCANEO", "", ""],
    ["ej.", "Corona de zirconio (CAD-CAM)", 3, "CAD", "", ""],
    ["ej.", "Corona de zirconio (CAD-CAM)", 4, "FRESADO", "", ""],
    ["ej.", "Corona de zirconio (CAD-CAM)", 5, "ACABADO", "", ""],
    ["ej.", "Corona metal-porcelana", 1, "MODELO", "COR-MET", ""],
    ["ej.", "Corona metal-porcelana", 2, "ENCERADO", "", ""],
    ["ej.", "Corona metal-porcelana", 3, "CERAMICA", "", ""],
    ["ej.", "Corona metal-porcelana", 4, "PRUEBA", "", "Un mismo proceso puede repetirse"],
    ["ej.", "Corona metal-porcelana", 5, "ACABADO", "", ""],
  ].forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 20;
    f++;
  });
  filasVacias(h, f, 45, 6);
  f += 46;

  nota(
    h,
    f,
    "Un mismo proceso puede aparecer dos veces en un flujo: hay trabajos con dos pruebas en clínica, y cada una es una etapa distinta que se registra por separado.",
    6,
  );
  f += 2;
  nota(
    h,
    f,
    "Todo servicio del tarifario debería tener un flujo. Los que se queden sin él seguirán vendiéndose, pero no generarán tareas: la orden entra en producción sin que nadie sepa que hay que fabricarla. El sistema lo avisa, pero es mejor no llegar ahí.",
    6,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   10 · CLIENTES Y DOCTORES
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("10 · Clientes y doctores", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 36, 16, 16, 16, 14, 16, 26, 30]);
  cabecera(
    h,
    "10 · Clientes y doctores",
    "El CLIENTE es a quien se le factura y se le cobra. El DOCTOR es quien pide el trabajo. Una clínica agrupa varios doctores y una sola deuda; un doctor que trabaja por su cuenta es su propio cliente — en ese caso basta con ponerlo en la segunda tabla y marcar «por su cuenta».",
    9,
  );

  encabezados(h, 4, ["#", "Razón social / nombre *", "Tipo *\n(clínica /\ndoctor indep.)", "Tipo doc.", "Número *", "Días de\ncrédito", "Línea de\ncrédito", "Lista de precio asignada", "Dirección, teléfono, correo"]);

  let f = 5;
  [
    ["ej.", "Clínica Dental Sonrisa Plena S.A.C.", "clínica", "RUC", "20512345671", 30, 7500, "Convenio Clínica Sonrisa Plena", "San Isidro · 987654321"],
    ["ej.", "Dra. Elsa Salcedo Peña", "doctor indep.", "DNI", "45871239", 0, 0, "Tarifario general", "Contado"],
  ].forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 22;
    f++;
  });
  filasVacias(h, f, 25, 9);
  h.getColumn(7).numFmt = '"S/" #,##0.00';
  f += 26;

  h.mergeCells(f, 1, f, 9);
  h.getCell(f, 1).value = "Doctores";
  h.getCell(f, 1).font = { name: "Calibri", size: 12, bold: true, color: { argb: TEAL } };
  f += 2;

  encabezados(h, f, ["#", "Nombre del doctor *", "¿A qué cliente\nse le factura? *", "Colegiatura", "Especialidad", "Teléfono", "Correo", "Sede de entrega habitual", "Observaciones"]);
  f++;
  [
    ["ej.", "Dr. Ramiro Jáuregui Ponce", "Clínica Dental Sonrisa Plena S.A.C.", "COP 24817", "Rehabilitación oral", "987654321", "rj@ejemplo.pe", "San Isidro", ""],
    ["ej.", "Dra. Elsa Salcedo Peña", "por su cuenta", "COP 31204", "Ortodoncia", "999888777", "", "Miraflores", "El sistema le crea su cliente solo"],
  ].forEach((fila) => {
    h.getRow(f).values = fila;
    filaEjemplo(h, f);
    h.getRow(f).height = 22;
    f++;
  });
  filasVacias(h, f, 30, 9);
  f += 31;

  nota(
    h,
    f,
    "Si un cliente tiene días de crédito, hay que ponerle también línea de crédito. Crédito sin línea es crédito sin techo: el aviso por deuda nunca saltaría.",
    9,
  );
  f += 2;
  nota(
    h,
    f,
    "El RUC se valida con su dígito verificador al cargarlo. Uno mal tecleado se rechaza aquí en vez de llegar a SUNAT y volver rebotado con el doctor esperando su factura.",
    9,
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   11 · CUENTAS Y ACCESOS
   ═══════════════════════════════════════════════════════════════════════ */
{
  const h = libro.addWorksheet("11 · Cuentas", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  anchos(h, [5, 22, 46, 20, 18, 20, 28]);
  cabecera(
    h,
    "11 · Cuentas y servicios externos",
    "Servicios que hay que crear o contratar para poder publicar MEFLAB. Nada de esto bloquea seguir construyendo — hoy todo corre en un ordenador — pero sin ellos no se puede poner en producción.",
    7,
  );

  encabezados(h, 4, ["#", "Servicio", "Para qué hace falta", "Coste aproximado", "¿Bloquea\nla semana 12?", "Quién la crea", "Estado / observaciones"]);

  const d = [
    ["1", "Supabase", "La base de datos y los archivos, en la nube. Hacen falta dos proyectos: uno de pruebas y uno de producción. Región recomendada: São Paulo, la más cercana a Perú.", "Gratis para empezar; ~25 USD/mes el plan Pro cuando crezca", "SÍ", "Sponsor", ""],
    ["2", "Vercel", "Publicar la aplicación en internet con su dominio y su certificado de seguridad.", "Gratis para empezar; ~20 USD/mes por usuario en el plan Pro", "SÍ", "Sponsor", ""],
    ["3", "Dominio propio", "La dirección web del laboratorio, p. ej. meflab.labvera.pe", "~15-40 USD/año", "SÍ", "Sponsor", ""],
    ["4", "Sentry", "Enterarse de los errores que le pasan a la gente sin que tengan que avisar.", "Gratis hasta cierto volumen", "No, pero muy recomendable", "Sponsor", ""],
    ["5", "Proveedor de facturación electrónica (PSE)", "Emitir facturas y boletas válidas ante SUNAT. Hay que elegir cuál: Nubefact, Efact, Bizlinks, TCI…", "Según el proveedor y el volumen", "No — es Fase 2 (semana 16)", "Administración", "¿El laboratorio ya usa alguno?"],
    ["6", "Envío de correo (Resend o similar)", "Que las invitaciones y los estados de cuenta lleguen al correo del doctor.", "Gratis hasta 3.000 correos/mes", "No — Fase 2", "Sponsor", ""],
    ["7", "WhatsApp Business API", "Avisar al doctor de que su trabajo está listo, por donde de verdad lo lee.", "Por conversación", "No — Fase 2", "Sponsor", "¿Se quiere realmente? Añade coste y complejidad"],
  ];

  let f = 5;
  d.forEach((fila) => {
    const r = h.getRow(f);
    fila.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      c.font = { name: "Calibri", size: 10, bold: i === 1 };
      c.alignment = { vertical: "top", wrapText: true, indent: 1 };
      c.border = borde;
      if (i === 4 && v === "SÍ") {
        c.font = { name: "Calibri", size: 10, bold: true, color: { argb: AMBAR_TXT } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBAR } };
      }
      if (i === 6) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_SUAVE } };
      if (i === 0) c.alignment = { vertical: "top", horizontal: "center" };
    });
    r.height = 58;
    f++;
  });

  f++;
  nota(
    h,
    f,
    "Las contraseñas de estas cuentas NO se escriben en este archivo ni se mandan por correo o WhatsApp. Cuando estén creadas, se comparte el acceso desde el propio panel de cada servicio, invitando al correo de quien deba entrar.",
    7,
  );
}

const salida = path.join(
  __dirname,
  "..",
  "docs",
  "MEFLAB - Cuaderno de puesta en marcha.xlsx",
);

libro.xlsx.writeFile(salida).then(() => console.log("Escrito:", salida));
