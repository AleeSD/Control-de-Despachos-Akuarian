import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generarReporte } from "@/lib/export";
import type { Pedido, PedidoVista } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function aVista(p: Pedido): PedidoVista {
  const destino_efectivo =
    (p.destino_manual && p.destino_manual.trim()) || p.destino || "";
  let productos = p.productos as unknown;
  if (typeof productos === "string") {
    try {
      productos = JSON.parse(productos);
    } catch {
      productos = [];
    }
  }
  return { ...p, productos: (productos as PedidoVista["productos"]) ?? [], destino_efectivo };
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (perfil?.rol !== "almacen") {
    return NextResponse.json(
      { error: "Solo el rol 'almacen' puede generar el reporte." },
      { status: 403 }
    );
  }

  const fecha = request.nextUrl.searchParams.get("fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Falta el parámetro 'fecha' (YYYY-MM-DD)." }, { status: 400 });
  }

  const { data } = await supabase
    .from("pedidos")
    .select("*")
    .eq("fecha_programada", fecha)
    .order("n_pedido", { ascending: true });

  const pedidos = (data ?? []).map((p) => aVista(p as Pedido));
  const buffer = await generarReporte(pedidos);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="DESPACHO_PENDIENTES_${fecha}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
