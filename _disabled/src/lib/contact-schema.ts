import { z } from "zod";

export const INTEREST_OPTIONS = ["lote", "visita", "inversion", "otro"] as const;
export type Interest = (typeof INTEREST_OPTIONS)[number];

/**
 * Teléfono internacional laxo: 8 a 15 dígitos, con espacios, guiones,
 * paréntesis y un "+" opcional adelante. No se valida por país porque
 * el sitio recibe consultas de PY, AR, BR y EE.UU.
 */
const PHONE_RE = /^\+?[\d\s().-]{8,20}$/;

/** Mensajes de error, ya traducidos por el llamador. */
export interface ContactMessages {
  nameRequired: string;
  nameShort: string;
  nameLong: string;
  emailRequired: string;
  emailInvalid: string;
  phoneRequired: string;
  phoneInvalid: string;
  interestRequired: string;
  messageLong: string;
  privacyRequired: string;
}

/**
 * El schema se construye con los mensajes ya traducidos en vez de
 * devolver claves: así el error que ve el usuario sale en su idioma sin
 * una capa extra de mapeo en el componente.
 */
export function buildContactSchema(m: ContactMessages) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, m.nameRequired)
      .min(2, m.nameShort)
      .max(80, m.nameLong),
    email: z
      .string()
      .trim()
      .min(1, m.emailRequired)
      .email(m.emailInvalid)
      .max(160, m.emailInvalid),
    phone: z
      .string()
      .trim()
      .min(1, m.phoneRequired)
      .regex(PHONE_RE, m.phoneInvalid)
      // Cuenta solo dígitos: "+595 (98) 5-12-34-56" tiene 12 dígitos reales.
      .refine((v) => v.replace(/\D/g, "").length >= 8, m.phoneInvalid),
    interest: z.enum(INTEREST_OPTIONS, { message: m.interestRequired }),
    message: z.string().trim().max(1000, m.messageLong).optional().or(z.literal("")),
    privacy: z.literal(true, { message: m.privacyRequired }),
    /* Honeypot: campo invisible para humanos. Si viene con algo, es un
       bot. Se acepta la petición con éxito falso para no darle señal. */
    company: z.string().max(0).optional().or(z.literal("")),
  });
}

export type ContactFormValues = z.infer<ReturnType<typeof buildContactSchema>>;

/** Validación del lado del servidor: mensajes neutros, no se muestran. */
export const contactServerSchema = buildContactSchema({
  nameRequired: "name",
  nameShort: "name",
  nameLong: "name",
  emailRequired: "email",
  emailInvalid: "email",
  phoneRequired: "phone",
  phoneInvalid: "phone",
  interestRequired: "interest",
  messageLong: "message",
  privacyRequired: "privacy",
});
