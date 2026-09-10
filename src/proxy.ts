import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  /**
   * Todo menos: rutas de API, internos de Next y cualquier archivo con
   * extensión (los assets de /public). Sin este filtro el proxy correría
   * en cada imagen y video, agregando latencia a decenas de estáticos.
   *
   * OJO con el escapado: el punto va como `\\.` porque dentro de un
   * string de JS `"\."` es un escape inválido y colapsa a `"."`. Con un
   * solo backslash el fragmento `.*\..*` se convertía en `.*..*`, que
   * matchea CUALQUIER ruta de un carácter o más — y el lookahead negativo
   * terminaba excluyendo el sitio entero. Resultado: solo `/` redirigía
   * y `/admin` devolvía 404.
   */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
