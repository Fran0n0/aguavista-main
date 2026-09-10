import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="av-glow relative flex min-h-[70svh] flex-col items-center justify-center px-6 py-32 text-center">
      <span
        aria-hidden="true"
        className="font-display text-[clamp(6rem,22vw,14rem)] font-light leading-none text-[color:var(--av-vivo)] opacity-15"
      >
        {t("code")}
      </span>

      <h1 className="-mt-6 font-display text-[clamp(1.75rem,5vw,3rem)] font-light text-ink md:-mt-10">
        {t("title")}
      </h1>

      <p className="mt-4 max-w-sm text-balance font-sans text-sm font-light leading-relaxed text-ink-muted">
        {t("body")}
      </p>

      <Link
        href="/"
        className="mt-10 inline-flex items-center rounded-full bg-[color:var(--av-vivo)] px-9 py-3.5 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#08150F] shadow-av-glow transition-colors duration-300 hover:bg-[color:var(--av-vivo-deep)]"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
