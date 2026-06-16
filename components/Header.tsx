"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Profile } from "@/lib/types";
import { iniciales } from "@/lib/format";

interface Props {
  perfil: Profile;
  email: string;
  subtitulo: string;
}

export default function Header({ perfil, email, subtitulo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="bg-surface-container-lowest border-b border-surface-variant h-20 px-lg flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
      <div className="flex items-center gap-md">
        <div className="bg-surface-container p-sm rounded-lg text-primary">
          <span className="material-symbols-outlined fill-1">local_shipping</span>
        </div>
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface tracking-tight">
            Control de Despachos
          </h1>
          <p className="text-body-md text-on-surface-variant">{subtitulo}</p>
        </div>
      </div>

      <div className="flex items-center gap-md">
        <button
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="bg-surface-container-lowest text-primary-container border border-outline-variant hover:bg-surface-container-low transition-colors px-4 py-2 rounded-button flex items-center gap-sm text-label-md disabled:opacity-60"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${pending ? "animate-spin" : ""}`}
          >
            refresh
          </span>
          Refrescar
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-title-lg font-semibold"
            title={perfil.nombre ?? email}
          >
            {iniciales(perfil.nombre, email)}
          </button>

          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-variant">
                  <p className="text-body-md font-medium text-on-surface truncate">
                    {perfil.nombre ?? email}
                  </p>
                  <p className="text-label-sm text-on-surface-variant truncate">{email}</p>
                  <span className="inline-block mt-1 text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-primary-container capitalize">
                    {perfil.rol === "almacen" ? "Almacén" : "Jefe (solo lectura)"}
                  </span>
                </div>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
