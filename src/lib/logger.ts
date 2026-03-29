import pino from "pino";
import { getConfig } from "./config";

// Паттерны для маскирования секретов
const SECRET_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /x-keenetic-password/i,
];

// Маскирование значения
function maskValue(value: unknown): unknown {
  if (typeof value === "string" && value.length > 0) {
    return "***";
  }
  return value;
}

// Рекурсивное маскирование объекта
function maskSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const shouldMask = SECRET_PATTERNS.some((pattern) => pattern.test(key));

    if (shouldMask) {
      masked[key] = maskValue(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      masked[key] = maskSecrets(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      masked[key] = value.map((item) =>
        item && typeof item === "object"
          ? maskSecrets(item as Record<string, unknown>)
          : item
      );
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

// Создание логгера
function createBaseLogger() {
  const config = getConfig();
  const isPretty = config.logging.format === "pretty";

  // pino-pretty is loaded dynamically via worker_threads;
  // only enable the transport when the module is actually available
  let usePrettyTransport = false;
  if (isPretty) {
    try {
      require.resolve("pino-pretty");
      usePrettyTransport = true;
    } catch {
      // pino-pretty not installed — fall back to JSON output
    }
  }

  return pino({
    level: config.logging.level,
    ...(usePrettyTransport && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    }),
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

// Singleton
let _logger: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (!_logger) {
    _logger = createBaseLogger();
  }
  return _logger;
}

// Создание child-логгера с контекстом
export function createLogger(context: string): pino.Logger {
  return getLogger().child({ context });
}

// Хелпер для логирования HTTP запросов
export interface RequestLogData {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  status?: number;
  duration?: number;
}

export function logRequest(
  logger: pino.Logger,
  data: RequestLogData,
  message?: string
) {
  const masked = maskSecrets(data as unknown as Record<string, unknown>);
  logger.info(masked, message || `${data.method} ${data.url}`);
}

export function logResponse(
  logger: pino.Logger,
  data: RequestLogData,
  message?: string
) {
  const masked = maskSecrets(data as unknown as Record<string, unknown>);
  logger.info(
    masked,
    message || `${data.method} ${data.url} -> ${data.status} (${data.duration}ms)`
  );
}

// Маскированное логирование объекта
export function logWithMasking(
  logger: pino.Logger,
  level: "debug" | "info" | "warn" | "error",
  obj: Record<string, unknown>,
  message?: string
) {
  const masked = maskSecrets(obj);
  logger[level](masked, message);
}
