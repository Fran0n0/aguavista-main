"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { MobileDrawer } from "./MobileDrawer";
import { EASE_LUX } from "@/components/motion/Reveal";
import { NAV_LINKS } from "@/config/navigation";

const SOLID_AT = 80;

export function Navbar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const { scrollY } = useScroll();
  
  // 1. Hook para saber en qué URL estamos
  const pathname = usePathname();

  const [solid, setSolid] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState<string>("inicio");

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(latest > SOLID_AT);
    setOverHero(latest < window.innerHeight - 88);
    setHidden(latest > prev && latest > 240 && !drawerOpen);
  });

  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.getElementById(l.href.slice(1))).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5] }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // 2. ¡LA MAGIA! Si estamos en cualquier ruta del admin, el Navbar público se destruye.
  if (pathname?.includes("/admin")) return null;

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: hidden ? "-110%" : 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE_LUX }}
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-[background,border-color,backdrop-filter] duration-500",
          solid
            ? overHero
              ? "av-scrim-top border-b border-transparent"
              : "av-glass border-b shadow-av-md"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <nav
          aria-label={tc("menu")}
          className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-6 px-5 md:h-20 md:px-10"
        >
          <a href="#inicio" className="group flex shrink-0 items-center" aria-label="AguaVista — Inicio">
            <Image
              src="/logo-solari.avif"
              alt="AguaVista · Solari Bienes Raíces"
              width={256}
              height={48}
              priority
              sizes="(max-width: 768px) 150px, 190px"
              className="av-logo h-8 w-auto object-contain transition-opacity duration-300 group-hover:opacity-85 md:h-9"
            />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = active === link.href.slice(1);
              return (
                <li key={link.key}>
                  <a
                    href={link.href}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group relative block px-4 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.22em] transition-colors duration-300",
                      isActive ? "text-vivo" : "text-ink-mid hover:text-ink"
                    )}
                  >
                    {t(link.key)}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-0.5 left-1/2 h-px w-[calc(100%-2rem)] -translate-x-1/2 bg-[color:var(--av-vivo)] origin-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <Button href="#contacto" variant="primary" size="sm" noMagnet className="hidden md:inline-flex">
              {t("cta")}
            </Button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={tc("openMenu")}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              className="group grid size-11 place-items-center rounded-full text-ink transition-colors duration-300 hover:bg-[color:var(--av-elevated)] lg:hidden"
            >
              <span className="flex w-5 flex-col items-end gap-[5px]">
                <span className="h-px w-full bg-current transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-3/4" />
                <span className="h-px w-3/4 bg-current transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
                <span className="h-px w-full bg-current transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-1/2" />
              </span>
            </button>
          </div>
        </nav>

        <div aria-hidden="true" className={cn("av-hairline absolute inset-x-0 bottom-0 transition-opacity duration-500", solid ? "opacity-40" : "opacity-0")} />
      </motion.header>

      <AnimatePresence>
        {drawerOpen && <MobileDrawer links={NAV_LINKS} active={active} onClose={() => setDrawerOpen(false)} />}
      </AnimatePresence>
    </>
  );
}