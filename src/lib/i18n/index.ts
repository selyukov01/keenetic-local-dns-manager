export { type Locale, LOCALES, LOCALE_LABELS, LOCALE_FLAGS, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "./types";
export type { Translations, PartialTranslations } from "./translations";
export { en } from "./en";
export { ru } from "./ru";

import type { Locale } from "./types";
import type { Translations, PartialTranslations } from "./translations";
import { en } from "./en";
import { ru } from "./ru";

const translationsMap: Record<Locale, PartialTranslations> = { en, ru };

export function getTranslations(locale: Locale): Translations {
  if (locale === "en") return en;

  // Fallback to English for any missing keys
  const target = translationsMap[locale];
  return new Proxy(target as Translations, {
    get(_, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (value === undefined || value === null) {
        return Reflect.get(en, prop);
      }
      return value;
    },
  });
}
