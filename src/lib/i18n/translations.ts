import { en } from "./en";

// The type is derived from the English translations as the source of truth
export type Translations = typeof en;

// Partial type for non-English locales — missing keys fall back to English at runtime
export type PartialTranslations = Partial<Translations>;
