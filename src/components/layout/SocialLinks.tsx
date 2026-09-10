"use client";

import { useTranslations } from "next-intl";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "@/components/ui/BrandIcons";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
} as const;

const SIZES = {
  sm: { box: "size-9", icon: "size-4" },
  md: { box: "size-11", icon: "size-[18px]" },
} as const;

/**
 * Íconos de RRSS con microinteracción de "relleno que sube".
 * El fondo lima entra desde abajo con scale-y y el ícono se levanta 1px.
 */
export function SocialLinks({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const t = useTranslations("footer");
  const s = SIZES[size];

  return (
    <ul aria-label={t("socialLabel")} className={cn("flex items-center gap-2", className)}>
      {siteConfig.social.map((social) => {
        const Icon = ICONS[social.icon];
        return (
          <li key={social.name}>
            <a
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              // El nombre de la red no basta: el lector de pantalla debe
              // saber que abre una pestaña nueva a un sitio externo.
              aria-label={`${social.name} — AguaVista`}
              className={cn(
                "group relative grid place-items-center overflow-hidden rounded-full",
                "border border-[color:var(--av-border)] text-ink-muted",
                "transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:border-[color:var(--av-vivo)] hover:text-[#08150F]",
                s.box
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-bottom scale-y-0 bg-[color:var(--av-vivo)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100"
              />
              <Icon
                className={cn(
                  "relative z-10 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-px",
                  s.icon
                )}
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
