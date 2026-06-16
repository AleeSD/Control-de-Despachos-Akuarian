"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ESTADOS } from "@/lib/estados";
import { fechaHora } from "@/lib/format";

interface Props {
  fecha: string;
  estadosSel: Set<string>;
  onToggleEstado: (e: string) => void;
  onTodos: () => void;
  busqueda: string;
  onBusqueda: (v: string) => void;
  totalConsolidados: number;
  ultimaImportacion: { importado_en: string; filas_consolidadas: number | null } | null;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  fecha,
  estadosSel,
  onToggleEstado,
  onTodos,
  busqueda,
  onBusqueda,
  totalConsolidados,
  ultimaImportacion,
  collapsed,
  onToggle,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cambiarFecha(nueva: string) {
    if (!nueva) return;
    startTransition(() => router.push(`/?fecha=${nueva}`));
  }

  if (collapsed) {
    return (
      <aside className="w-14 bg-surface-container-lowest border-r border-surface-variant flex flex-col items-center py-lg flex-shrink-0">
        <button
          onClick={onToggle}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          title="Mostrar filtros"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </aside>
    );
  }

  const todosActivo = estadosSel.size === 0;

  return (
    <aside className="w-72 bg-surface-container-lowest border-r border-surface-variant flex flex-col flex-shrink-0">
      <div className="p-lg flex justify-between items-center border-b border-surface-variant">
        <h2 className="text-title-lg font-semibold text-on-surface">Filtros</h2>
        <button
          onClick={onToggle}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          title="Ocultar filtros"
        >
          <span className="material-symbols-outlined">menu_open</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-lg space-y-xl">
        {/* Fecha */}
        <div>
          <label className="block text-label-md text-on-surface-variant mb-sm">
            Fecha programada
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              calendar_today
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => cambiarFecha(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-input text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-body-md transition-colors"
            />
            {pending && (
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline animate-spin text-[18px]">
                progress_activity
              </span>
            )}
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-label-md text-on-surface-variant mb-sm">Estado</label>
          <div className="space-y-1">
            <label className="flex items-center gap-sm cursor-pointer hover:bg-surface-container-low p-sm rounded-md transition-colors">
              <input
                type="checkbox"
                checked={todosActivo}
                onChange={onTodos}
                className="form-checkbox text-primary-container border-outline-variant rounded"
              />
              <span className="text-body-md">Todos</span>
            </label>
            {ESTADOS.map((e) => (
              <label
                key={e}
                className="flex items-center gap-sm cursor-pointer hover:bg-surface-container-low p-sm rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={estadosSel.has(e)}
                  onChange={() => onToggleEstado(e)}
                  className="form-checkbox text-primary-container border-outline-variant rounded"
                />
                <span className="text-body-md capitalize">{e}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Búsqueda */}
        <div>
          <label className="block text-label-md text-on-surface-variant mb-sm">Búsqueda</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => onBusqueda(e.target.value)}
              placeholder="N° Pedido, Cliente o Guía…"
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-input text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-body-md transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="p-lg border-t border-surface-variant bg-surface-container-low space-y-3">
        <div className="flex items-center gap-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">sync</span>
          <div className="flex flex-col">
            <span className="text-label-sm">Última importación:</span>
            <span className="text-body-md font-medium text-on-surface">
              {ultimaImportacion ? fechaHora(ultimaImportacion.importado_en) : "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">inventory</span>
          <div className="flex flex-col">
            <span className="text-label-sm">Pedidos consolidados (fecha):</span>
            <span className="text-body-md font-medium text-on-surface">{totalConsolidados}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
