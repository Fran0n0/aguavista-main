"use client";

import { useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { submitContact } from "@/app/actions/contact";
import {
  buildContactSchema,
  INTEREST_OPTIONS,
  type ContactFormValues,
} from "@/lib/contact-schema";
import { Button } from "@/components/ui/Button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "./Field";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const te = useTranslations("contact.errors");
  const tt = useTranslations("contact.toast");
  const [isPending, startTransition] = useTransition();

  /* El schema se reconstruye solo cuando cambia el idioma: los mensajes
     de error salen ya traducidos desde zod, sin mapeo intermedio. */
  const schema = useMemo(
    () =>
      buildContactSchema({
        nameRequired: te("nameRequired"),
        nameShort: te("nameShort"),
        nameLong: te("nameLong"),
        emailRequired: te("emailRequired"),
        emailInvalid: te("emailInvalid"),
        phoneRequired: te("phoneRequired"),
        phoneInvalid: te("phoneInvalid"),
        interestRequired: te("interestRequired"),
        messageLong: te("messageLong"),
        privacyRequired: te("privacyRequired"),
      }),
    [te]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, touchedFields },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    // onTouched: no se grita el error mientras el usuario todavía escribe
    // por primera vez, pero después de salir del campo valida en cada tecla.
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { interest: undefined, message: "", company: "" },
  });

  const onSubmit = (values: ContactFormValues) => {
    startTransition(async () => {
      const result = await submitContact(values);

      if (result.ok) {
        toast.success(tt("successTitle"), { description: tt("successBody") });
        reset();
        return;
      }

      if (result.reason === "rate-limit") {
        toast.error(tt("rateLimitTitle"), { description: tt("rateLimitBody") });
        return;
      }

      toast.error(tt("errorTitle"), { description: tt("errorBody") });
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
      aria-busy={isPending}
    >
      {/* Honeypot. Fuera de pantalla en vez de display:none — algunos bots
          ignoran los campos ocultos por CSS. tabIndex -1 y aria-hidden
          lo mantienen fuera del alcance de teclado y lectores. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-0 overflow-hidden">
        <label htmlFor="av-company">Company</label>
        <input
          id="av-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("company")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t("name.label")}
          placeholder={t("name.placeholder")}
          type="text"
          autoComplete="name"
          error={errors.name?.message}
          valid={touchedFields.name && !errors.name}
          {...register("name")}
        />
        <TextField
          label={t("phone.label")}
          placeholder={t("phone.placeholder")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          valid={touchedFields.phone && !errors.phone}
          {...register("phone")}
        />
      </div>

      <TextField
        label={t("email.label")}
        placeholder={t("email.placeholder")}
        type="email"
        inputMode="email"
        autoComplete="email"
        error={errors.email?.message}
        valid={touchedFields.email && !errors.email}
        {...register("email")}
      />

      <SelectField
        label={t("interest.label")}
        defaultValue=""
        error={errors.interest?.message}
        {...register("interest")}
      >
        <option value="" disabled>
          {t("interest.placeholder")}
        </option>
        {INTEREST_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(`interest.options.${option}`)}
          </option>
        ))}
      </SelectField>

      <TextAreaField
        label={t("message.label")}
        hint={t("message.optional")}
        placeholder={t("message.placeholder")}
        error={errors.message?.message}
        {...register("message")}
      />

      <CheckboxField error={errors.privacy?.message} {...register("privacy")}>
        {t.rich("privacy", {
          link: (chunks) => (
            <Link
              href="/privacidad"
              className="text-vivo underline underline-offset-4 transition-opacity hover:opacity-75"
            >
              {chunks}
            </Link>
          ),
        })}
      </CheckboxField>

      <Button
        type="submit"
        size="lg"
        loading={isPending}
        disabled={isPending}
        // Nunca se deshabilita por "formulario inválido": un botón muerto
        // desde el inicio no le dice a nadie qué falta completar. Solo se
        // bloquea mientras hay un envío en vuelo, para evitar duplicados.
        className="mt-2 w-full sm:w-auto sm:self-start"
        aria-label={isPending ? t("submitting") : t("submit")}
      >
        {isPending ? t("submitting") : t("submit")}
      </Button>

    </form>
  );
}
