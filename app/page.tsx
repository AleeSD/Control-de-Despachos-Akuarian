import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPerfil,
  getFechasDisponibles,
  proximaFecha,
  getPedidos,
  getUltimaImportacion,
} from "@/lib/data";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: { fecha?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await getPerfil();
  if (!perfil) redirect("/login");

  const fechas = await getFechasDisponibles();
  const fechaSel =
    searchParams.fecha && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha)
      ? searchParams.fecha
      : proximaFecha(fechas) ?? new Date().toISOString().slice(0, 10);

  const [pedidos, ultimaImportacion] = await Promise.all([
    getPedidos(fechaSel),
    getUltimaImportacion(),
  ]);

  return (
    <Dashboard
      perfil={perfil}
      email={user.email ?? ""}
      fecha={fechaSel}
      pedidos={pedidos}
      ultimaImportacion={ultimaImportacion}
    />
  );
}
