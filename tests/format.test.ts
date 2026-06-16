import { describe, it, expect } from "vitest";
import { fechaCorta, fechaLarga, iniciales } from "@/lib/format";

describe("fechaCorta", () => {
  it("convierte ISO a dd/mm/aaaa", () => {
    expect(fechaCorta("2026-06-16")).toBe("16/06/2026");
  });
  it("acepta ISO con hora", () => {
    expect(fechaCorta("2026-12-01T05:00:00Z")).toBe("01/12/2026");
  });
  it("devuelve guion para null", () => {
    expect(fechaCorta(null)).toBe("—");
    expect(fechaCorta(undefined)).toBe("—");
  });
  it("devuelve el valor tal cual si no parsea", () => {
    expect(fechaCorta("CONFIRMAR")).toBe("CONFIRMAR");
  });
});

describe("fechaLarga", () => {
  it("formatea con el mes en texto", () => {
    expect(fechaLarga("2026-06-16")).toBe("16 de junio de 2026");
    expect(fechaLarga("2026-01-01")).toBe("1 de enero de 2026");
  });
  it("devuelve guion para null", () => {
    expect(fechaLarga(null)).toBe("—");
  });
});

describe("iniciales", () => {
  it("toma la primera letra de los dos primeros nombres", () => {
    expect(iniciales("Ana Pérez Ruiz")).toBe("AP");
  });
  it("usa dos letras si hay un solo nombre", () => {
    expect(iniciales("Ana")).toBe("AN");
  });
  it("cae al email si no hay nombre", () => {
    expect(iniciales(null, "carlos@x.com")).toBe("CA");
  });
  it("devuelve ? si no hay nada", () => {
    expect(iniciales(null)).toBe("?");
  });
});
