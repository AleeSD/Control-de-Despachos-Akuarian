import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerProgramacion } from "@/lib/etl";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 1) Autenticación + rol: solo 'almacen' puede importar.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }
  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (perfil?.rol !== "almacen") {
    return NextResponse.json(
      { ok: false, error: "Solo el rol 'almacen' puede importar." },
      { status: 403 }
    );
  }

  // 2) Archivo subido.
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No se recibió archivo." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  // 3) Parseo + consolidación.
  let etl;
  try {
    etl = leerProgramacion(buffer);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error al leer el Excel." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 4) Guardar el archivo en Storage (best-effort; no bloquea la importación).
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `${stamp}_${file.name}`;
  try {
    await admin.storage
      .from("programaciones")
      .upload(storagePath, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false,
      });
  } catch {
    /* el bucket puede no existir aún; seguimos igualmente */
  }

  // 5) ¿Cuáles claves ya existían? (para reportar nuevos vs actualizados)
  const claves = etl.pedidos.map((p) => p.clave_pedido);
  const existentes = new Set<string>();
  for (let i = 0; i < claves.length; i += 1000) {
    const lote = claves.slice(i, i + 1000);
    const { data } = await admin
      .from("pedidos")
      .select("clave_pedido")
      .in("clave_pedido", lote);
    (data ?? []).forEach((r: { clave_pedido: string }) => existentes.add(r.clave_pedido));
  }

  // 6) Upsert. OMITIMOS estado y destino_manual del payload:
  //    - en INSERT toman su DEFAULT ('pendiente' / null);
  //    - en CONFLICT no entran al SET, así que SE PRESERVAN.
  const ahora = new Date().toISOString();
  const rows = etl.pedidos.map((p) => ({
    clave_pedido: p.clave_pedido,
    n_pedido: p.n_pedido,
    n_guia: p.n_guia,
    cliente: p.cliente,
    destino: p.destino,
    distrito: p.distrito,
    fecha_programada: p.fecha_programada,
    fecha_entrega: p.fecha_entrega,
    hora_cita: p.hora_cita,
    bultos: p.bultos,
    observaciones: p.observaciones,
    orden_compra: p.orden_compra,
    cantidad_total: p.cantidad_total,
    vendedor: p.vendedor,
    ruc: p.ruc,
    telefono: p.telefono,
    tipo_entrega: p.tipo_entrega,
    canal_comercial: p.canal_comercial,
    productos: p.productos,
    actualizado_en: ahora,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const lote = rows.slice(i, i + 500);
    const { error } = await admin
      .from("pedidos")
      .upsert(lote, { onConflict: "clave_pedido" });
    if (error) {
      return NextResponse.json(
        { ok: false, error: `Error al guardar: ${error.message}` },
        { status: 500 }
      );
    }
  }

  const nuevos = claves.filter((c) => !existentes.has(c)).length;
  const actualizados = claves.length - nuevos;

  // 7) Bitácora de importación.
  await admin.from("importaciones").insert({
    archivo: file.name,
    filas_consolidadas: etl.totalPedidos,
  });

  return NextResponse.json({
    ok: true,
    totalLineas: etl.totalLineas,
    totalPedidos: etl.totalPedidos,
    nuevos,
    actualizados,
  });
}
