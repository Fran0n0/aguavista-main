import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Wrappers de Link/router que agregan el prefijo de idioma solos.
 * Importá SIEMPRE desde acá, nunca desde "next/link", o la navegación
 * pierde el locale y manda al usuario al idioma por defecto.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
