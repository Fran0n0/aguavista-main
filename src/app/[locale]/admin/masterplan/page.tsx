import { canReadAdminData } from "@/lib/admin-auth";
import { AdminPanel } from "../AdminPanel";

/**
 * Herramienta de mapeo 2D y tours 360 del masterplan.
 *
 * El chequeo de sesion se repite aca aunque el layout ya lo haga: los
 * segmentos hermanos renderizan en paralelo, asi que sin esto el cuerpo
 * de la pagina se ejecuta igual en una request sin cookie. Ver
 * canReadAdminData() en src/lib/admin-auth.ts.
 */
export default async function MasterplanPage() {
  if (!(await canReadAdminData())) return null;

  return <AdminPanel />;
}
