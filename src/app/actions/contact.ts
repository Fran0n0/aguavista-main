"use server";

import { getServiceClient } from "@/lib/supabase-admin";
import { getLocale } from "next-intl/server";

export async function submitContact(values: any) {
  try {
    // 1. Trampa para bots (Honeypot). Si un bot spammer llena este campo invisible, simulamos que se envió bien.
    if (values.company) {
      return { ok: true };
    }

    // 2. Conectamos con Supabase usando la Llave Maestra (Service Role)
    const supabase = getServiceClient();
    if (!supabase) {
      console.error("Supabase no está configurado en el servidor.");
      return { ok: false, reason: "config-error" };
    }

    // 3. Capturamos el idioma en el que el cliente estaba navegando
    const locale = await getLocale();

    // 4. Inyectamos los datos en la tabla 'leads' que creamos hoy
    const { error } = await supabase.from("leads").insert({
      name: values.name,
      email: values.email,
      phone: values.phone,
      interest: values.interest,
      message: values.message || null,
      locale: locale,
      status: "nuevo",
    });

    if (error) {
      console.error("Error al guardar el mensaje en Supabase:", error);
      return { ok: false, reason: "db-error" };
    }

    // 5. ¡Éxito total! El formulario muestra el check verde.
    return { ok: true };
    
  } catch (error) {
    console.error("Error crítico en submitContact:", error);
    return { ok: false, reason: "server-error" };
  }
}