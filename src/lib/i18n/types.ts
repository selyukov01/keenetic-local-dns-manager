export type Locale = "en" | "ru";

export const LOCALES: Locale[] = ["en", "ru"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
};

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "locale";
