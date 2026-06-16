import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { leerProgramacion } from "@/lib/etl";

// Construye un .xlsx en memoria con la hoja "Programación" y devuelve su Buffer.
function hojaPrograma(filas: unknown[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Programación");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const CABECERAS = [
  "Referencia del pedido", "Cliente", "GUIA REMISION", "Descripcion", "Distrito",
  "Fecha de Entrega", "Fecha de Entrega", "Hora Citas Agendadas", "Bultos",
  "Observaciones", "Codigo", "Nombre", "Cantidad",
];

describe("leerProgramacion — consolidación", () => {
  it("agrupa por pedido|guía y SUMA bultos y cantidad", () => {
    const buf = hojaPrograma([
      CABECERAS,
      ["P1", "Cliente A", "G1", "Dir", "Lima", "16/06/2026", "", "10:00", 2, "obs", "C1", "Prod 1", 3],
      ["P1", "Cliente A", "G1", "Dir", "Lima", "16/06/2026", "", "10:00", 5, "obs", "C2", "Prod 2", 4],
    ]);
    const r = leerProgramacion(buf);
    expect(r.totalLineas).toBe(2);
    expect(r.totalPedidos).toBe(1);
    const p = r.pedidos[0];
    expect(p.clave_pedido).toBe("P1|G1");
    expect(p.bultos).toBe(7);
    expect(p.cantidad_total).toBe(7);
    expect(p.productos).toHaveLength(2);
    expect(p.fecha_programada).toBe("2026-06-16");
  });

  it("trata pedidos con distinta guía como pedidos separados", () => {
    const buf = hojaPrograma([
      CABECERAS,
      ["P1", "A", "G1", "Dir", "Lima", "16/06/2026", "", "", 1, "", "", "", 1],
      ["P1", "A", "G2", "Dir", "Lima", "16/06/2026", "", "", 1, "", "", "", 1],
    ]);
    const r = leerProgramacion(buf);
    expect(r.totalPedidos).toBe(2);
  });

  it("convierte fechas no válidas (CONFIRMAR/ANULADO) a null", () => {
    const buf = hojaPrograma([
      CABECERAS,
      ["P1", "A", "G1", "Dir", "Lima", "CONFIRMAR", "ANULADO", "", 1, "", "", "", 1],
    ]);
    const r = leerProgramacion(buf);
    expect(r.pedidos[0].fecha_programada).toBeNull();
    expect(r.pedidos[0].fecha_entrega).toBeNull();
    expect(r.pedidos[0].tiene_fecha).toBe(false);
  });

  it("rellena un texto vacío con el primer valor no vacío del grupo", () => {
    const buf = hojaPrograma([
      CABECERAS,
      ["P1", "", "G1", "Dir", "Lima", "16/06/2026", "", "", 1, "", "", "", 1],
      ["P1", "Cliente Real", "G1", "Dir", "Lima", "16/06/2026", "", "", 1, "", "", "", 1],
    ]);
    const r = leerProgramacion(buf);
    expect(r.pedidos[0].cliente).toBe("Cliente Real");
  });

  it("lanza error si falta una columna obligatoria", () => {
    const buf = hojaPrograma([["Cliente", "Distrito"], ["A", "Lima"]]);
    expect(() => leerProgramacion(buf)).toThrow(/n_pedido|obligatoria/);
  });
});

// Verificación de integración: el Excel real de origen debe consolidar el
// número de pedidos esperado (referencia del despliegue: 592 / 581 con fecha).
const ARCHIVO_REAL = path.join(
  process.cwd(),
  "Doc tests",
  "Programacion despachos Akuarian 2026.xlsx"
);

describe.runIf(fs.existsSync(ARCHIVO_REAL))("leerProgramacion — archivo real", () => {
  it("consolida 592 pedidos (581 con fecha programada)", () => {
    const buf = fs.readFileSync(ARCHIVO_REAL);
    const r = leerProgramacion(buf);
    expect(r.totalPedidos).toBe(592);
    expect(r.pedidos.filter((p) => p.tiene_fecha).length).toBe(581);
  });
});
