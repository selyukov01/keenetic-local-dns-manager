import { z } from "zod";

// === Схемы валидации ===

const AppModeSchema = z.enum(["demo", "no-auth", "auth"]).default("demo");

const ConfigSchema = z.object({
  // Режим работы
  appMode: AppModeSchema,

  // Авторизация приложения (только для auth режима)
  auth: z.object({
    login: z.string().optional(),
    password: z.string().optional(),
    jwtSecret: z.string().min(32).optional(),
  }),

  // Интернет-центр Keenetic (игнорируется в demo режиме)
  keenetic: z.object({
    host: z.string().optional(),
    login: z.string().optional(),
    password: z.string().optional(),
    cookiePersist: z.boolean().default(false),
  }),

  // Метрики
  metrics: z.object({
    enabled: z.boolean().default(true),
    authEnabled: z.boolean().default(false),
    login: z.string().optional(),
    password: z.string().optional(),
  }),

  // Логирование
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
    format: z.enum(["json", "pretty"]).default("json"),
  }),
});

export type AppMode = z.infer<typeof AppModeSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// === Загрузка конфигурации ===

function loadConfig(): Config {
  const raw = {
    appMode: process.env.APP_MODE || "demo",
    auth: {
      login: process.env.AUTH_LOGIN,
      password: process.env.AUTH_PASSWORD,
      jwtSecret: process.env.AUTH_JWT_SECRET,
    },
    keenetic: {
      host: process.env.KEENETIC_HOST,
      login: process.env.KEENETIC_LOGIN,
      password: process.env.KEENETIC_PASSWORD,
      cookiePersist: process.env.KEENETIC_COOKIE_PERSIST === "true",
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED !== "false",
      authEnabled: process.env.METRICS_AUTH_ENABLED === "true",
      login: process.env.METRICS_AUTH_LOGIN,
      password: process.env.METRICS_AUTH_PASSWORD,
    },
    logging: {
      level: process.env.LOG_LEVEL || "info",
      format: process.env.LOG_FORMAT || "json",
    },
  };

  return ConfigSchema.parse(raw);
}

// Singleton
let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

// === Хелперы ===

export function getAppMode(): AppMode {
  return getConfig().appMode;
}

export function isAuthEnabled(): boolean {
  return getAppMode() === "auth";
}

export function isDemoMode(): boolean {
  return getAppMode() === "demo";
}

export function isNoAuthMode(): boolean {
  return getAppMode() === "no-auth";
}

export function hasKeeneticConfig(): boolean {
  const { keenetic } = getConfig();
  return Boolean(keenetic.host && keenetic.login && keenetic.password);
}

// === Валидация для режимов ===

export function validateConfigForMode(): { valid: boolean; errors: string[] } {
  const config = getConfig();
  const errors: string[] = [];

  if (config.appMode === "auth") {
    if (!config.auth.login || !config.auth.password) {
      errors.push("AUTH_LOGIN and AUTH_PASSWORD are required for auth mode");
    }
    if (!config.auth.jwtSecret || config.auth.jwtSecret.length < 32) {
      errors.push("AUTH_JWT_SECRET must be at least 32 characters for auth mode");
    }
    if (!hasKeeneticConfig()) {
      errors.push("KEENETIC_HOST, KEENETIC_LOGIN, KEENETIC_PASSWORD are required for auth mode");
    }
  }

  if (config.appMode === "no-auth") {
    if (!hasKeeneticConfig()) {
      errors.push("KEENETIC_HOST, KEENETIC_LOGIN, KEENETIC_PASSWORD are required for no-auth mode");
    }
  }

  if (config.metrics.authEnabled) {
    if (!config.metrics.login || !config.metrics.password) {
      errors.push("METRICS_AUTH_LOGIN and METRICS_AUTH_PASSWORD are required when METRICS_AUTH_ENABLED=true");
    }
  }

  return { valid: errors.length === 0, errors };
}

// === Получение credentials для Keenetic ===

export interface KeeneticCredentials {
  host: string;
  login: string;
  password: string;
}

/**
 * Получить credentials для Keenetic в зависимости от режима
 * - auth/no-auth: из env
 * - demo: из заголовков запроса
 */
export function getKeeneticCredentials(
  request?: Request
): KeeneticCredentials | null {
  const config = getConfig();

  // Для demo режима — только из заголовков
  if (config.appMode === "demo") {
    if (!request) return null;
    
    const host = request.headers.get("X-Keenetic-Host");
    const login = request.headers.get("X-Keenetic-Login");
    const password = request.headers.get("X-Keenetic-Password");

    if (!host || !login || !password) {
      return null;
    }

    return { host, login, password };
  }

  // Для auth/no-auth — из env
  const { keenetic } = config;
  if (!keenetic.host || !keenetic.login || !keenetic.password) {
    return null;
  }

  return {
    host: keenetic.host,
    login: keenetic.login,
    password: keenetic.password,
  };
}
