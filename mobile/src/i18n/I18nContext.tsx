// Language state: SecureStore first, server sync via PUT /me/language.
// AuthContext mounts this provider so the two never disagree.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { tr, en, type MessageKey } from "./messages";

export type Language = "tr" | "en";

export const SUPPORTED_LANGUAGES: Language[] = ["tr", "en"];
export const DEFAULT_LANGUAGE: Language = "tr";

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === "en" ? "en" : DEFAULT_LANGUAGE;
}

interface I18nValue {
  language: Language;
  setLanguage: (next: Language) => void;
  t: (key: MessageKey) => string;
  formatDate: (value: string | Date | null | undefined, style?: "date" | "short") => string;
  formatPercent: (value: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  language,
  onLanguageChange,
  children,
}: {
  language: Language;
  onLanguageChange?: (next: Language) => void;
  children: ReactNode;
}) {
  const setLanguage = useCallback(
    (next: Language) => {
      onLanguageChange?.(next);
    },
    [onLanguageChange],
  );

  const value = useMemo<I18nValue>(() => {
    const catalog = language === "en" ? en : tr;
    const t = (key: MessageKey) => catalog[key] ?? tr[key] ?? key;
    const locale = language === "en" ? "en-GB" : "tr-TR";

    const formatDate = (input: string | Date | null | undefined, style: "date" | "short" = "date") => {
      if (input === null || input === undefined || input === "") return "—";
      const date = input instanceof Date ? input : new Date(input);
      if (Number.isNaN(date.getTime())) return String(input);
      try {
        const options: Intl.DateTimeFormatOptions =
          style === "short"
            ? { day: "2-digit", month: "short" }
            : { day: "2-digit", month: "long", year: "numeric" };
        return new Intl.DateTimeFormat(locale, options).format(date);
      } catch {
        // Hermes without Intl: fall back to the ISO date part.
        return typeof input === "string" ? input.slice(0, style === "short" ? 10 : 10) : date.toISOString().slice(0, 10);
      }
    };

    const formatPercent = (value: number) => {
      const rounded = Math.round(value * 10) / 10;
      try {
        return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value / 100);
      } catch {
        return `${rounded}%`;
      }
    };

    return { language, setLanguage, t, formatDate, formatPercent };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export type { MessageKey };
