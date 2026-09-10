"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { EASE_LUX } from "@/components/motion/Reveal";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { SocialLinks } from "./SocialLinks";

interface MobileDrawerProps {
  links: ReadonlyArray<{ key: string; href: string }>;
  active: string;
  onClose: () => void;
}

/**
 * Menú mobile a pantalla completa.
 *
 * Entra con un clip-path circular desde la esquina superior derecha (de
 * donde salió el dedo al tocar la hamburguesa) y los links caen
 * escalonados. Bloquea el scroll del body y atrapa el foco mientras
 * está abierto.
 */
export function MobileDrawer({ links, active, onClose }: MobileDrawerProps) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const { body } = document;
    // Compensar el ancho de la scrollbar evita el salto lateral del
    // contenido al bloquear el scroll.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Trampa de foco: el tabulador no debe escaparse a la página de atrás.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [onClose]);

  return (
    <motion.div
      id="mobile-drawer"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={tc("menu")}
      className="fixed inset-0 z-[150] flex flex-col bg-base av-noise lg:hidden"
      // El círculo nace en la hamburguesa (arriba a la derecha) y se
      // expande hasta cubrir la pantalla. 150% de radio garantiza que
      // cubra la esquina opuesta en cualquier proporción de pantalla.
      initial={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.25rem)" }}
      animate={{ clipPath: "circle(150% at calc(100% - 2.5rem) 2.25rem)" }}
      exit={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.25rem)" }}
      transition={{ duration: 0.72, ease: EASE_LUX }}
    >
      {/* Luz de fondo para que el panel no sea un bloque de color liso. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 50% at 80% 0%, var(--av-glow-vivo) 0%, transparent 65%), radial-gradient(60% 45% at 10% 100%, var(--av-glow-lux) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex h-[72px] shrink-0 items-center justify-between px-5">
        <Image
          src="/logo-solari.avif"
          alt="AguaVista · Solari Bienes Raíces"
          width={256}
          height={48}
          sizes="150px"
          className="av-logo h-8 w-auto object-contain"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={tc("closeMenu")}
          className="grid size-11 place-items-center rounded-full text-ink transition-colors duration-300 hover:bg-[color:var(--av-elevated)] hover:text-vivo"
        >
          <X className="size-5" strokeWidth={1.25} aria-hidden="true" />
        </button>
      </div>

      {/* ── Links ── */}
      <nav className="relative flex flex-1 flex-col justify-center px-7 pb-6">
        <ul className="flex flex-col gap-1">
          {links.map((link, i) => {
            const isActive = active === link.href.slice(1);
            return (
              <motion.li
                key={link.key}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                // Escalonado: cada link entra 70ms después del anterior,
                // arrancando cuando el clip-path ya abrió lo suficiente.
                transition={{ duration: 0.6, delay: 0.22 + i * 0.07, ease: EASE_LUX }}
              >
                <a
                  href={link.href}
                  onClick={onClose}
                  aria-current={isActive ? "true" : undefined}
                  className="group flex items-baseline gap-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 font-sans text-[10px] tracking-[0.2em] text-ink-faint transition-colors duration-300 group-hover:text-vivo"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={
                      "font-display text-[2rem] font-light leading-tight transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5 " +
                      (isActive ? "text-vivo" : "text-ink group-hover:text-lux-light")
                    }
                  >
                    {t(link.key)}
                  </span>
                </a>
              </motion.li>
            );
          })}
        </ul>

        <motion.a
          href="#contacto"
          onClick={onClose}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 + links.length * 0.07, ease: EASE_LUX }}
          className="mt-9 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--av-vivo)] px-8 py-4 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#08150F] shadow-av-glow transition-colors duration-300 hover:bg-[color:var(--av-vivo-deep)]"
        >
          {t("cta")}
        </motion.a>
      </nav>

      {/* ── Pie del drawer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="relative shrink-0 border-t border-[color:var(--av-border-soft)] px-7 py-5"
      >
        <div className="flex items-center justify-between gap-4">
          <SocialLinks size="sm" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher variant="footer" />
          </div>
        </div>
        <a
          href={`mailto:${siteConfig.contact.email}`}
          className="mt-4 block font-sans text-[10px] uppercase tracking-[0.18em] text-ink-muted transition-colors duration-300 hover:text-vivo"
        >
          {siteConfig.contact.email}
        </a>
      </motion.div>
    </motion.div>
  );
}
