// Lectura, normalización y consolidación del Excel de Programación.
// Port directo de etl.py (prototipo Streamlit). Reglas clave:
//  * Hoja "Programación", cabeceras en la fila 1.
//  * UNA FILA POR LÍNEA DE PRODUCTO; un pedido aparece repetido.
//  * Clave de pedido = `${n_pedido}|${n_guia}`.
//  * Texto: primer valor no vacío del grupo. Bultos / cantidad: SUMA.
//  * Hay DOS columnas "Fecha de Entrega": 1ª = programada, 2ª = entrega.
//  * Solo fechas reales; "CONFIRMAR"/"ANULADO"/vacío -> null.

import * as XLSX from "xlsx";
import type { PedidoConsolidado, ProductoLinea } from "./types";

// xlsx no exporta SSF como tipo público; accedemos vía cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XLSXSSF = (XLSX as unknown as { SSF: any }).SSF as {
  parse_date_code: (n: number) => { y: number; m: number; d: number } | null;
};

const HOJA_PROGRAMACION = "Programación";

const COLUMNAS: Record<string, string[]> = {
  n_pedido: ["Referencia del pedido"],
  cliente: ["Cliente"],
  n_guia: ["GUIA REMISION", "GUÍA REMISIÓN", "Guia Remision"],
  destino: ["Descripcion", "Descripción", "Destino"],
  distrito: ["Distrito"],
  hora_cita: ["Hora Citas Agendadas"],
  bultos: ["Bultos"],
  observaciones: ["Observaciones"],
  orden_compra: ["Orden de Compra"],
  vendedor: ["Vendedor"],
  ruc: ["RUC"],
  telefono: ["Telefono", "Teléfono"],
  tipo_entrega: ["Tipo de Entrega"],
  canal_comercial: ["Canal Comercial"],
  cantidad: ["Cantidad"],
  codigo: ["Codigo", "Código"],
  nombre: ["Nombre"],
};

const COL_FECHA_HEADER = "Fecha de Entrega";
const FECHA_NO_VALIDA = new Set(["CONFIRMAR", "ANULADO", "POR CONFIRMAR", ""]);
const MAX_FILAS_VACIAS = 50;

function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseFecha(v: unknown): string | null {
  if (v === null || v === undefined) return null;

  if (typeof v === "number") {
    // Serial de Excel -> fecha usando el parser interno de SheetJS.
    const d = XLSXSSF.parse_date_code(v);
    if (!d || !d.y) return null;
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  if (v instanceof Date) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }

  const s = String(v).trim();
  if (s === "" || FECHA_NO_VALIDA.has(s.toUpperCase())) return null;

  // dd/mm/yyyy o dd-mm-yyyy
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  // yyyy-mm-dd
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  return null;
}

function parseBultos(v: unknown): number {
  if (v === null || v === undefined || String(v).trim() === "") return 0;
  const f = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(f) ? Math.trunc(f) : 0;
}

function parseCantidad(v: unknown): number {
  if (v === null || v === undefined || String(v).trim() === "") return 0;
  const f = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(f) ? f : 0;
}

function resolverColumnas(headers: unknown[]): Record<string, number> {
  const normHeaders = headers.map((h) => norm(h).toLowerCase());
  const idx: Record<string, number> = {};

  for (const [campo, posibles] of Object.entries(COLUMNAS)) {
    for (const cab of posibles) {
      const i = normHeaders.indexOf(cab.trim().toLowerCase());
      if (i !== -1) {
        idx[campo] = i;
        break;
      }
    }
  }

  // "Fecha de Entrega" aparece dos veces: 1ª = programada, 2ª = entrega.
  const fechasIdx: number[] = [];
  normHeaders.forEach((h, i) => {
    if (h === COL_FECHA_HEADER.toLowerCase()) fechasIdx.push(i);
  });
  if (fechasIdx.length >= 1) idx["fecha_programada"] = fechasIdx[0];
  if (fechasIdx.length >= 2) idx["fecha_entrega"] = fechasIdx[1];

  return idx;
}

export interface ResultadoETL {
  pedidos: PedidoConsolidado[];
  totalLineas: number;
  totalPedidos: number;
}

export function leerProgramacion(data: ArrayBuffer | Buffer): ResultadoETL {
  const wb = XLSX.read(data, { type: "buffer", cellDates: false });

  const nombreHoja = wb.SheetNames.includes(HOJA_PROGRAMACION)
    ? HOJA_PROGRAMACION
    : wb.SheetNames[0];
  const ws = wb.Sheets[nombreHoja];
  if (!ws) throw new Error(`No se encontró la hoja '${HOJA_PROGRAMACION}'.`);

  const filas = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  if (filas.length === 0) throw new Error("La hoja de Programación está vacía.");

  const headers = filas[0];
  const col = resolverColumnas(headers);

  for (const obligatorio of ["n_pedido", "n_guia"]) {
    if (!(obligatorio in col)) {
      throw new Error(
        `No se encontró la columna obligatoria '${obligatorio}'. Cabeceras: ${(headers as unknown[])
          .map((h) => norm(h))
          .filter(Boolean)
          .join(", ")}`
      );
    }
  }

  const get = (row: unknown[], campo: string): unknown => {
    const i = col[campo];
    if (i === undefined || i >= row.length) return null;
    return row[i];
  };

  const grupos = new Map<string, PedidoConsolidado>();
  let totalLineas = 0;
  let vaciasSeguidas = 0;

  for (let r = 1; r < filas.length; r++) {
    const row = filas[r];
    const nPedido = norm(get(row, "n_pedido"));
    if (nPedido === "") {
      vaciasSeguidas += 1;
      if (vaciasSeguidas >= MAX_FILAS_VACIAS) break;
      continue;
    }
    vaciasSeguidas = 0;
    totalLineas += 1;

    const nGuia = norm(get(row, "n_guia"));
    const clave = `${nPedido}|${nGuia}`;

    const fechaProg = parseFecha(get(row, "fecha_programada"));
    const fechaEnt = parseFecha(get(row, "fecha_entrega"));
    const bultos = parseBultos(get(row, "bultos"));

    const cantidad = parseCantidad(get(row, "cantidad"));
    const codigo = norm(get(row, "codigo"));
    const nombre = norm(get(row, "nombre"));
    const linea: ProductoLinea = { codigo, nombre, cantidad };

    const g = grupos.get(clave);
    if (!g) {
      grupos.set(clave, {
        clave_pedido: clave,
        n_pedido: nPedido,
        n_guia: nGuia,
        cliente: norm(get(row, "cliente")),
        destino: norm(get(row, "destino")),
        distrito: norm(get(row, "distrito")),
        fecha_programada: fechaProg,
        fecha_entrega: fechaEnt,
        hora_cita: norm(get(row, "hora_cita")),
        observaciones: norm(get(row, "observaciones")),
        bultos,
        orden_compra: norm(get(row, "orden_compra")),
        vendedor: norm(get(row, "vendedor")),
        ruc: norm(get(row, "ruc")),
        telefono: norm(get(row, "telefono")),
        tipo_entrega: norm(get(row, "tipo_entrega")),
        canal_comercial: norm(get(row, "canal_comercial")),
        cantidad_total: cantidad,
        productos: codigo || nombre ? [linea] : [],
        tiene_fecha: fechaProg !== null,
      });
    } else {
      const textos: Array<[keyof PedidoConsolidado, string]> = [
        ["cliente", norm(get(row, "cliente"))],
        ["destino", norm(get(row, "destino"))],
        ["distrito", norm(get(row, "distrito"))],
        ["hora_cita", norm(get(row, "hora_cita"))],
        ["observaciones", norm(get(row, "observaciones"))],
        ["orden_compra", norm(get(row, "orden_compra"))],
        ["vendedor", norm(get(row, "vendedor"))],
        ["ruc", norm(get(row, "ruc"))],
        ["telefono", norm(get(row, "telefono"))],
        ["tipo_entrega", norm(get(row, "tipo_entrega"))],
        ["canal_comercial", norm(get(row, "canal_comercial"))],
      ];
      for (const [campo, val] of textos) {
        if (!g[campo] && val) (g as Record<string, unknown>)[campo] = val;
      }
      if (g.fecha_programada === null && fechaProg !== null) {
        g.fecha_programada = fechaProg;
        g.tiene_fecha = true;
      }
      if (g.fecha_entrega === null && fechaEnt !== null) g.fecha_entrega = fechaEnt;
      g.bultos += bultos;
      g.cantidad_total += cantidad;
      if (codigo || nombre) g.productos.push(linea);
    }
  }

  const pedidos = Array.from(grupos.values());
  return { pedidos, totalLineas, totalPedidos: pedidos.length };
}
