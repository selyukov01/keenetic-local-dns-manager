import { KeeneticClient, getKeeneticClient, createKeeneticClient } from "./keenetic-client";
import { getKeeneticCredentials, isDemoMode } from "./config";
import { createLogger } from "./logger";

const logger = createLogger("api-helpers");

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  needsSetup?: boolean;
}

/**
 * Получить клиент Keenetic в зависимости от режима работы
 * - demo: из заголовков запроса
 * - auth/no-auth: из env
 */
export function getClientForRequest(request: Request): KeeneticClient | null {
  const credentials = getKeeneticCredentials(request);

  if (!credentials) {
    if (isDemoMode()) {
      logger.debug("Demo mode: missing credentials in headers");
    } else {
      logger.debug("Missing credentials in env");
    }
    return null;
  }

  if (isDemoMode()) {
    // В demo режиме создаём новый клиент для каждого запроса
    return createKeeneticClient(credentials);
  }

  // В auth/no-auth режимах используем singleton
  return getKeeneticClient();
}

/**
 * Обработка ошибки и формирование ответа
 */
export function handleApiError(error: unknown, context: string): ApiResult {
  const message = error instanceof Error ? error.message : "Unknown error";
  logger.error({ error: message, context }, `API error in ${context}`);
  
  return {
    success: false,
    error: message,
  };
}

/**
 * Формирование успешного ответа
 */
export function successResponse<T>(data: T): ApiResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Формирование ответа об ошибке настройки
 */
export function needsSetupResponse(): ApiResult {
  return {
    success: false,
    error: isDemoMode()
      ? "Введите настройки интернет-центра для подключения"
      : "Keenetic не настроен. Проверьте переменные окружения.",
    needsSetup: true,
  };
}
