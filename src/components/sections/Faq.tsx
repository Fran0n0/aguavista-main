"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { cn } from "@/lib/utils";

interface FaqItem {
  q: string;
  a: string;
}

export function Faq() {
  const t = useTranslations("faq");
  // Los ítems vienen como array en el JSON de mensajes, así se traducen
  // pregunta y respuesta juntas sin inventar una clave por índice.
  const items = t.raw("items") as FaqItem[];
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section id="faq" className="relative bg-[color:var(--av-surface)] py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-5 md:px-10">
        <header className="mb-12 text-center md:mb-16">
          <Reveal>
            <span className="av-kicker">{t("kicker")}</span>
          </Reveal>
          <SplitText
            as="h2"
            text={t("title")}
            className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.08] text-ink"
          />
        </header>

        <ul className="flex flex-col">
          {items.map((item, i) => {
            const isOpen = open === i;
            const panelId = `${baseId}-panel-${i}`;
            const buttonId = `${baseId}-button-${i}`;

            return (
              <Reveal as="li" key={item.q} delay={i * 0.05} amount={0.3}>
                <div className="border-b border-[color:var(--av-border-soft)]">
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      // Click en el abierto lo cierra: acordeón, no radio.
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-start justify-between gap-6 py-6 text-left"
                    >
                      <span
                        className={cn(
                          "font-display text-lg font-normal leading-snug transition-colors duration-300 md:text-xl",
                          isOpen ? "text-vivo" : "text-ink group-hover:text-lux-light"
                        )}
                      >
                        {item.q}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-1 grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          isOpen
                            ? "rotate-[135deg] border-[color:var(--av-vivo)] text-vivo"
                            : "border-[color:var(--av-border)] text-ink-muted group-hover:border-[color:var(--av-lux)]"
                        )}
                      >
                        <Plus className="size-3.5" strokeWidth={1.75} />
                      </span>
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-7 pr-12 font-sans text-sm font-light leading-relaxed text-ink-muted md:text-[15px]">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
