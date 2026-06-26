import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { generarReporte } from "@/lib/export";
import type { PedidoVista } from "@/lib/types";

// Pedido mínimo de prueba. `fecha_entrega` y `observaciones` van vacíos a
// propósito: la grilla debe bordearlos igual (tabla rectangular, sin huecos).
function pedido(i: number): PedidoVista {
  return {
    clave_pedido: `P${i}|G${i}`,
    n_pedido: `P${i}`,
    n_guia: `G${i}`,
    cliente: `Cliente ${i}`,
    destino: `Destino ${i}`,
    destino_manual: null,
    destino_efectivo: `Destino ${i}`,
    distrito: "Lima",
    fecha_programada: "2026-06-16",
    fecha_entrega: null,
    hora_cita: "",
    bultos: i % 3, // a veces 0
    observaciones: "",
    orden_compra: "",
    cantidad_total: 0,
    vendedor: "",
    ruc: "",
    telefono: "",
    tipo_entrega: "",
    canal_comercial: "",
    productos: [],
    estado: "pendiente",
    nota_estado: null,
    fecha_reprogramada: null,
    actualizado_en: "",
    creado_en: "",
  };
}

const HEADER_ROW = 3;
const DATA_START = 4;
const COLS = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

async function cargar(pedidos: PedidoVista[]) {
  const buf = await generarReporte(pedidos);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb.worksheets[0];
}

function tieneBorde(ws: ExcelJS.Worksheet, ref: string): boolean {
  const b = ws.getCell(ref).border;
  return Boolean(b && (b.top?.style || b.bottom?.style || b.left?.style || b.right?.style));
}

describe("generarReporte — grilla de bordes", () => {
  it("borda el rectángulo completo de datos, incluidas celdas vacías", async () => {
    const ws = await cargar([pedido(1), pedido(2), pedido(3)]);
    const ultimaFila = DATA_START + 3 - 1; // 3 pedidos -> filas 4,5,6
    for (let r = DATA_START; r <= ultimaFila; r++) {
      for (const c of COLS) {
        expect(tieneBorde(ws, `${c}${r}`), `${c}${r} debería tener borde`).toBe(true);
      }
    }
  });

  it("NO deja bordes por debajo del último pedido (sin filas fantasma)", async () => {
    const ws = await cargar([pedido(1), pedido(2)]);
    const primeraVacia = DATA_START + 2; // fila 6 en adelante
    for (let r = primeraVacia; r <= primeraVacia + 20; r++) {
      for (const c of COLS) {
        expect(tieneBorde(ws, `${c}${r}`), `${c}${r} NO debería tener borde`).toBe(false);
      }
    }
  });

  it("con 0 pedidos no borda ninguna fila de datos", async () => {
    const ws = await cargar([]);
    for (let r = DATA_START; r <= DATA_START + 10; r++) {
      for (const c of COLS) {
        expect(tieneBorde(ws, `${c}${r}`)).toBe(false);
      }
    }
  });

  it("mantiene los bordes de la cabecera", async () => {
    const ws = await cargar([pedido(1)]);
    for (const c of COLS) {
      expect(tieneBorde(ws, `${c}${HEADER_ROW}`)).toBe(true);
    }
  });

  it("escribe la fecha programada como Date con formato dd/mm/yyyy", async () => {
    const ws = await cargar([pedido(1)]);
    const cell = ws.getCell(`G${DATA_START}`);
    expect(cell.value).toBeInstanceOf(Date);
    expect(cell.numFmt).toBe("dd/mm/yyyy");
  });

  it("la grilla se extiende hasta el último pedido y ni una fila más", async () => {
    const ws = await cargar([pedido(1), pedido(2), pedido(3), pedido(4), pedido(5)]);
    const ultima = DATA_START + 5 - 1; // fila 8
    // Última fila de datos bordeada en todas las columnas...
    for (const c of COLS) expect(tieneBorde(ws, `${c}${ultima}`)).toBe(true);
    // ...y la inmediatamente siguiente, sin ningún borde.
    for (const c of COLS) expect(tieneBorde(ws, `${c}${ultima + 1}`)).toBe(false);
  });
});

describe("generarReporte — columna K (Observaciones)", () => {
  it("escribe solo observaciones cuando no hay nota ni fecha reprogramada", async () => {
    const p = pedido(1);
    p.observaciones = "Llamar antes de llegar";
    const ws = await cargar([p]);
    expect(ws.getCell(`K${DATA_START}`).value).toBe("Llamar antes de llegar");
  });

  it("concatena nota_estado en columna K", async () => {
    const p = pedido(1);
    p.observaciones = "Obs base";
    p.nota_estado = "Cliente rechazó el pedido";
    const ws = await cargar([p]);
    expect(ws.getCell(`K${DATA_START}`).value).toBe(
      "Obs base | Motivo: Cliente rechazó el pedido",
    );
  });

  it("concatena fecha_reprogramada en columna K", async () => {
    const p = pedido(1);
    p.fecha_reprogramada = "2026-06-20";
    const ws = await cargar([p]);
    expect(ws.getCell(`K${DATA_START}`).value).toBe("Reprog.: 20/06/2026");
  });

  it("concatena nota y fecha cuando ambas están presentes", async () => {
    const p = pedido(1);
    p.observaciones = "Obs";
    p.nota_estado = "Sin stock";
    p.fecha_reprogramada = "2026-06-25";
    const ws = await cargar([p]);
    expect(ws.getCell(`K${DATA_START}`).value).toBe(
      "Obs | Motivo: Sin stock | Reprog.: 25/06/2026",
    );
  });
});
