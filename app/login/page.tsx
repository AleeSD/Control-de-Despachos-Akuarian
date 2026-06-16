"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";

function BotonEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors px-4 py-3 rounded-button font-medium flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {pending ? (
        <>
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
          Entrando…
        </>
      ) : (
        "Entrar"
      )}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-md">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-soft border border-surface-variant p-xl">
        <div className="flex items-center gap-md mb-xl">
          <div className="bg-surface-container p-sm rounded-lg text-primary">
            <span className="material-symbols-outlined fill-1">local_shipping</span>
          </div>
          <div>
            <h1 className="text-headline-md font-semibold text-on-surface tracking-tight">
              Control de Despachos
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Inicia sesión para continuar
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-md">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-sm">
              Correo electrónico
            </label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-input text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-body-md transition-colors"
              placeholder="tucorreo@empresa.com"
            />
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-sm">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-input text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-body-md transition-colors"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <div className="bg-error-container text-on-error-container border border-error rounded-input px-4 py-2.5 text-body-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {state.error}
            </div>
          )}

          <BotonEntrar />
        </form>
      </div>
    </main>
  );
}
