"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import { adminLogin, type LoginState } from "@/app/actions/admin-auth";

const MESSAGES: Record<NonNullable<LoginState["error"]>, string> = {
  // Mensaje deliberadamente genérico: no revela si la contraseña existe
  // ni cuántos caracteres tiene.
  credentials: "Contraseña incorrecta.",
  locked: "Demasiados intentos fallidos. Probá de nuevo en 15 minutos.",
  unconfigured:
    "El panel no está configurado. Falta definir ADMIN_PASSWORD y ADMIN_SESSION_SECRET en el entorno.",
};

/**
 * Pantalla de acceso al panel.
 *
 * El componente no sabe cuál es la contraseña ni cómo se valida: solo
 * envía el formulario a una server action. Todo lo sensible vive en
 * src/lib/admin-auth.ts, que es `server-only`.
 */
export function AdminLogin({ configured = true }: { configured?: boolean }) {
  // Destino tras autenticar: la misma URL que se quiso abrir, para que
  // entrar directo a /es/admin/media no rebote siempre a la bandeja.
  // La action lo valida contra una lista blanca antes de usarlo.
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    adminLogin,
    // Si el entorno no tiene las variables, se avisa antes de que el
    // usuario escriba una contrasena que nunca va a poder validarse.
    { error: configured ? null : "unconfigured" }
  );

  return (
    <div className="av-glow relative flex min-h-screen items-center justify-center bg-base p-5">
      <motion.form
        action={formAction}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="av-glass w-full max-w-sm rounded-3xl p-8 text-center shadow-av-lg"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-[color:var(--av-lux)]/35 text-lux">
          <LockKeyhole className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </span>

        <h1 className="mt-5 font-display text-2xl font-light text-ink">Centro de Mando</h1>
        <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          AguaVista · Masterplan
        </p>

        <input type="hidden" name="next" value={pathname} />

        <label htmlFor="admin-password" className="sr-only">
          Contraseña de administrador
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "admin-login-error" : undefined}
          className="mt-7 w-full rounded-xl border border-[color:var(--av-border)] bg-transparent px-4 py-3 text-center font-sans text-sm tracking-[0.3em] text-ink outline-none transition-colors duration-300 focus:border-[color:var(--av-vivo)]"
        />

        {state.error && (
          <p
            id="admin-login-error"
            role="alert"
            className="mt-3 font-sans text-[12px] font-light leading-relaxed text-[#E2725B]"
          >
            {MESSAGES[state.error]}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-[color:var(--av-vivo)] py-3.5 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#08150F] shadow-av-glow transition-colors duration-300 hover:bg-[color:var(--av-vivo-deep)] disabled:opacity-50"
        >
          {isPending ? "Verificando…" : "Ingresar"}
        </button>
      </motion.form>
    </div>
  );
}
