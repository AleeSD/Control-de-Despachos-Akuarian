import { describe, it, expect } from "vitest";
import { proximaFecha } from "@/lib/format";

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
});
