// Generación del reporte .xlsx con el formato DESPACHO PENDIENTES.
// Port de export.py: usa la plantilla como base, respeta cabeceras (fila 3) y
// estilos, limpia datos viejos (fila 4 hacia abajo), DESOCULTA filas y quita el
// autofiltro heredado (si no, el reporte sale "vacío"). Fechas como valores
// reales con formato dd/mm/yyyy.

import ExcelJS from "exceljs";
import type { PedidoVista } from "./types";
import { PLANTILLA_BASE64 } from "./plantilla-base64";

const HOJA_PLANTILLA = "DESPACHOS PENDIENTES";
const HEADER_ROW = 3;
const DATA_START_ROW = 4;
const FECHA_FORMATO = "dd/mm/yyyy";

interface ColDef {
  letra: string;
  campo: keyof PedidoVista;
  esFecha: boolean;
  esBultos: boolean;
}

const EXPORT_COLUMNAS: ColDef[] = [
  { letra: "B", campo: "n_pedido",          esFecha: false, esBultos: false },
  { letra: "C", campo: "cliente",            esFecha: false, esBultos: false },
  { letra: "D", campo: "n_guia",             esFecha: false, esBultos: false },
  { letra: "E", campo: "destino_efectivo",   esFecha: false, esBultos: false },
  { letra: "F", campo: "distrito",           esFecha: false, esBultos: false },
  { letra: "G", campo: "fecha_programada",   esFecha: true,  esBultos: false },
  { letra: "H", campo: "fecha_entrega",      esFecha: true,  esBultos: false },
  { letra: "I", campo: "hora_cita",          esFecha: false, esBultos: false },
  { letra: "J", campo: "bultos",             esFecha: false, esBultos: true  },
  { letra: "K", campo: "observaciones",      esFecha: false, esBultos: false },
  { letra: "L", campo: "estado",             esFecha: false, esBultos: false },
];

// 'YYYY-MM-DD' -> Date local a medianoche (mismo día de calendario en el Excel).
function isoADate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

// Tipo mínimo del modelo de hoja que usa ExcelJS internamente.
interface WsModel {
  merges?: string[];
  autoFilter?: unknown;
}

export async function generarReporte(pedidos: PedidoVista[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const plantillaBuffer = Buffer.from(PLANTILLA_BASE64, "base64");
  await wb.xlsx.load(plantillaBuffer as any);

  const ws = wb.getWorksheet(HOJA_PLANTILLA) ?? wb.worksheets[0];
  if (!ws) throw new Error("La plantilla no tiene hojas.");

  // Acceso seguro al modelo interno para leer los rangos combinados.
  const wsModel = (ws as unknown as { model: WsModel }).model;
  const merges: string[] = [...(wsModel.merges ?? [])];

  // 1) Deshacer celdas combinadas de la zona de datos.
  for (const rango of merges) {
    const topRef = rango.split(":")[0]; // "B4" -> row = 4
    const rowNum = parseInt(topRef.replace(/[A-Z]/gi, ""), 10);
    if (rowNum >= DATA_START_ROW) {
      try { ws.unMergeCells(rango); } catch { /* ya sin combinar */ }
    }
  }

  // 2) Limpiar valores + DESOCULTAR filas de datos de la plantilla.
  const lastRow = ws.rowCount;
  for (let r = DATA_START_ROW; r <= lastRow; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
    row.hidden = false;
  }

  // 3) Quitar autofiltro heredado (causa que las filas se vean "filtradas/vacías").
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as unknown as { model: any }).model.autoFilter = undefined;

  // Estilo base tomado de la cabecera B3 para mantener la tipografía.
  const hdr = ws.getCell(`B${HEADER_ROW}`);
  const baseFont: Partial<ExcelJS.Font> = {
    name: hdr.font?.name ?? "Arial",
    size: hdr.font?.size ?? 10,
  };
  const thin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF000000" } };
  const border: Partial<ExcelJS.Borders> = { top: thin, left: thin, right: thin, bottom: thin };

  let fila = DATA_START_ROW;
  for (const p of pedidos) {
    for (const { letra, campo, esFecha, esBultos } of EXPORT_COLUMNAS) {
      const cell = ws.getCell(`${letra}${fila}`);
      const valor = p[campo];

      cell.font = { ...baseFont };

      if (esFecha) {
        const d = isoADate(valor);
        cell.value = d ?? null;
        if (d) {
          cell.numFmt = FECHA_FORMATO;
          cell.border = border;
        }
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (esBultos) {
        const n = typeof valor === "number"
          ? valor
          : parseInt(String(valor ?? 0), 10);
        cell.value = Number.isFinite(n) ? n : 0;
        if (n > 0) cell.border = border;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        const valorStr = valor === null || valor === undefined ? "" : String(valor);
        cell.value = valorStr;
        if (valorStr.trim()) cell.border = border;
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      }
    }
    fila += 1;
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
