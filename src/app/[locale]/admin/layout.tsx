import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { hasValidSession, isAdminConfigured } from "@/lib/admin-auth";
import { AdminLogin } from "./AdminLogin";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = {
  title: "Centro de Mando",
  // Aunque robots.ts ya lo excluye, el meta cubre el caso de que alguien
  // enlace la URL directamente desde afuera.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Puerta única del panel.
 *
 * Es un SERVER component a propósito: la validación de la sesión lee una
 * cookie httpOnly firmada con HMAC y nunca cruza al cliente. Si la
 * sesión no es válida, el árbol del panel directamente no se serializa
 * — no es un `display:none`, el HTML del panel no existe en la
 * respuesta.
 *
 * Al estar en el layout, protege de una sola vez todas las subrutas
 * (/admin, /admin/amenities, /admin/media, /admin/masterplan).
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  if (!(await hasValidSession())) {
    return <AdminLogin configured={isAdminConfigured()} />;
  }

  return <AdminShell>{children}</AdminShell>;
}
