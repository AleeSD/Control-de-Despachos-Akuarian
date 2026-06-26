import { describe, it, expect } from "vitest";
import { proximaFecha } from "@/lib/format";
import { ESTADOS, colorDeEstado } from "@/lib/estados";

describe("proximaFecha", () => {
  const fechas = ["2026-06-10", "2026-06-16", "2026-06-20"];

  it("devuelve la primera fecha >= hoy", () => {
    expect(proximaFecha(fechas, new Date(2026, 5, 14))).toBe("2026-06-16");
  });
  it("incluye el día de hoy si coincide", () => {
    expect(proximaFecha(fechas, new Date(2026, 5, 16))).toBe("2026-06-16");
  });
  it("si todas son pasadas devuelve la última", () => {
    expect(proximaFecha(fechas, new Date(2026, 11, 1))).toBe("2026-06-20");
  });
  it("devuelve null si no hay fechas", () => {
    expect(proximaFecha([], new Date())).toBeNull();
  });

  it("funciona con fechas que vienen de fecha_efectiva (mismo formato ISO)", () => {
    // getFechasDisponibles ahora devuelve fecha_efectiva; el formato es idéntico.
    const fechasEfectivas = ["2026-06-10", "2026-06-18", "2026-06-25"];
    expect(proximaFecha(fechasEfectivas, new Date(2026, 5, 15))).toBe("2026-06-18");
  });
});

describe("ESTADOS", () => {
  it("incluye los estados preparado y última milla", () => {
    expect(ESTADOS).toContain("preparado");
    expect(ESTADOS).toContain("última milla");
  });

  it("mantiene el orden canónico con los estados nuevos", () => {
    const idx = (e: string) => (ESTADOS as readonly string[]).indexOf(e);
    expect(idx("pendiente")).toBeLessThan(idx("preparado"));
    expect(idx("preparado")).toBeLessThan(idx("última milla"));
    expect(idx("última milla")).toBeLessThan(idx("en ruta"));
    expect(idx("en ruta")).toBeLessThan(idx("entregado"));
  });

  it("colorDeEstado devuelve colores distintos para preparado y última milla", () => {
    const preparado = colorDeEstado("preparado");
    const ultimaMilla = colorDeEstado("última milla");
    const pendiente = colorDeEstado("pendiente");
    expect(preparado.bg).not.toBe(pendiente.bg);
    expect(ultimaMilla.bg).not.toBe(preparado.bg);
  });

  it("colorDeEstado devuelve fallback 'otro' para estados desconocidos", () => {
    const fallback = colorDeEstado("estado-inexistente");
    const otro = colorDeEstado("otro");
    expect(fallback.bg).toBe(otro.bg);
  });
});
