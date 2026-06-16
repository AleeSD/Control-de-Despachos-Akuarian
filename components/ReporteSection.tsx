"use client";

import { useState } from "react";

export default function ReporteSection({
  fecha,
  totalPedidos,
}: {
  fecha: string;
  totalPedidos: number;
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch(`/api/export?fecha=${fecha}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo generar el reporte.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DESPACHO_PENDIENTES_${fecha}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Error de red al generar el reporte.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-soft p-lg border border-surface-variant flex flex-col md:flex-row items-center justify-between gap-md">
      <div>
        <h4 className="text-title-lg font-semibold text-on-surface">Reporte para envíos</h4>
        <p className="text-body-md text-on-surface-variant">
          Genera el documento DESPACHO PENDIENTES con los {totalPedidos} pedidos de esta fecha.
        </p>
        {error && (
          <p className="text-body-md text-on-error-container mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-sm w-full md:w-auto">
        <button
          onClick={descargar}
          disabled={generando || totalPedidos === 0}
          className="bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors px-6 py-3 rounded-button text-label-md flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${generando ? "animate-spin" : ""}`}
          >
            {generando ? "progress_activity" : "description"}
          </span>
          {generando ? "Generando…" : "Generar reporte para envíos"}
        </button>
      </div>
    </section>
  );
}
