"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function LocalePill() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const pathname = usePathname();

  const nextLocale = locale === "nl" ? "en" : "nl";
  const target =
    nextLocale === "nl"
      ? pathname.replace(/^\/en(\/|$)/, "/")
      : pathname === "/"
        ? "/en"
        : `/en${pathname}`;

  return (
    <button
      onClick={() => router.push(target)}
      className="pointer-events-auto fixed right-4 top-4 z-30 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
      aria-label={`Switch language to ${t("switchTo")}`}
    >
      {t("switchTo")}
    </button>
  );
}
