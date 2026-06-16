"use client";

import { useMemo, useState } from "react";
import type { PedidoVista, Profile } from "@/lib/types";
import { fechaLarga } from "@/lib/format";
import Sidebar from "./Sidebar";
import Header from "./Header";
import KpiCards from "./KpiCards";
import EstadoChart from "./EstadoChart";
import PedidosTable from "./PedidosTable";
import ReporteSection from "./ReporteSection";
import UploadCard from "./UploadCard";

interface Props {
  perfil: Profile;
  email: string;
  fecha: string;
  pedidos: PedidoVista[];
  ultimaImportacion: { importado_en: string; filas_consolidadas: number | null } | null;
}

export default function Dashboard({
  perfil,
  email,
  fecha,
  pedidos,
  ultimaImportacion,
}: Props) {
  const [estadosSel, setEstadosSel] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const editable = perfil.rol === "almacen";

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (estadosSel.size > 0 && !estadosSel.has(p.estado)) return false;
      if (q) {
        const hay =
          (p.cliente ?? "").toLowerCase().includes(q) ||
          (p.n_pedido ?? "").toLowerCase().includes(q) ||
          (p.n_guia ?? "").toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [pedidos, estadosSel, busqueda]);

  function toggleEstado(e: string) {
    setEstadosSel((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        fecha={fecha}
        estadosSel={estadosSel}
        onToggleEstado={toggleEstado}
        onTodos={() => setEstadosSel(new Set())}
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        totalConsolidados={pedidos.length}
        ultimaImportacion={ultimaImportacion}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      <main className="flex-1 flex flex-col h-full bg-background relative overflow-y-auto w-full">
        <Header
          perfil={perfil}
          email={email}
          subtitulo={`Pedidos programados para ${fechaLarga(fecha)}`}
        />

        <div className="p-lg md:p-margin max-w-max_width mx-auto w-full space-y-xl">
          <KpiCards pedidos={pedidos} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-xl">
            <EstadoChart pedidos={pedidos} />
            <PedidosTable pedidos={filtrados} editable={editable} />
          </div>

          {editable && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
              <UploadCard />
              <ReporteSection fecha={fecha} totalPedidos={pedidos.length} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
