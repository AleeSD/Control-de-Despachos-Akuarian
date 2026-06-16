"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Resultado {
  ok: boolean;
  totalLineas?: number;
  totalPedidos?: number;
  nuevos?: number;
  actualizados?: number;
  error?: string;
}

export default function UploadCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function subir(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setResultado({ ok: false, error: "El archivo debe ser .xlsx" });
      return;
    }
    setSubiendo(true);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data: Resultado = await res.json();
      setResultado(data);
      if (data.ok) router.refresh();
    } catch {
      setResultado({ ok: false, error: "Error de red al subir el archivo." });
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-soft p-lg border border-surface-variant">
      <div className="flex items-center justify-between mb-md">
        <div>
          <h4 className="text-title-lg font-semibold text-on-surface">Subir programación</h4>
          <p className="text-body-md text-on-surface-variant">
            Sube el Excel de Programación. Se consolida por pedido y se conservan los estados.
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const f = e.dataTransfer.files?.[0];
          if (f) subir(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors p-xl flex flex-col items-center justify-center text-center gap-2 ${
          arrastrando
            ? "border-primary-container bg-surface-container-low"
            : "border-outline-variant hover:border-primary-container hover:bg-surface-container-low"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subir(f);
            e.target.value = "";
          }}
        />
        {subiendo ? (
          <>
            <span className="material-symbols-outlined text-primary-container animate-spin">
              progress_activity
            </span>
            <p className="text-body-md text-on-surface-variant">Procesando…</p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-primary-container text-[32px]">
              upload_file
            </span>
            <p className="text-body-md text-on-surface font-medium">
              Arrastra el .xlsx aquí o haz clic para elegirlo
            </p>
            <p className="text-label-sm text-on-surface-variant">
              Hoja “Programación”, una fila por línea de producto
            </p>
          </>
        )}
      </div>

      {resultado && (
        <div
          className={`mt-md rounded-input px-4 py-3 text-body-md border flex items-start gap-2 ${
            resultado.ok
              ? "bg-secondary-container/40 text-on-secondary-container border-secondary-container"
              : "bg-error-container text-on-error-container border-error"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {resultado.ok ? "check_circle" : "error"}
          </span>
          {resultado.ok ? (
            <span>
              Importación lista: <b>{resultado.totalPedidos}</b> pedidos consolidados de{" "}
              <b>{resultado.totalLineas}</b> líneas ({resultado.nuevos} nuevos,{" "}
              {resultado.actualizados} actualizados). Los estados se conservaron.
            </span>
          ) : (
            <span>{resultado.error}</span>
          )}
        </div>
      )}
    </section>
  );
}
