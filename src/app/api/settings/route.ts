import { NextResponse } from "next/server";
import { KeeneticClient, createKeeneticClient } from "@/lib/keenetic-client";
import { keeneticSettingsSchema } from "@/lib/validations";
import { getAppMode, getKeeneticCredentials, isDemoMode } from "@/lib/config";
import { createLogger } from "@/lib/logger";
import { recordRequest } from "@/lib/metrics";

const logger = createLogger("api-settings");

export async function GET(request: Request) {
  const startTime = Date.now();
  const appMode = getAppMode();
  
  // В demo режиме не возвращаем настройки из env!
  if (isDemoMode()) {
    recordRequest("GET", "/api/settings", 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      data: {
        host: "",
        login: "",
        hasPassword: false,
        isConfigured: false,
        appMode,
      },
    });
  }

  // Для auth/no-auth режимов возвращаем информацию о конфигурации
  const credentials = getKeeneticCredentials();
  
  recordRequest("GET", "/api/settings", 200, Date.now() - startTime);
  return NextResponse.json({
    success: true,
    data: {
      host: credentials?.host || "",
      login: credentials?.login || "",
      hasPassword: !!credentials?.password,
      isConfigured: !!credentials,
      appMode,
    },
  });
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const appMode = getAppMode();

    // Тестирование соединения
    if (body.action === "test") {
      let testCredentials;
      
      if (appMode === "demo") {
        // В demo режиме берём credentials из заголовков или тела
        const host = request.headers.get("X-Keenetic-Host") || body.host;
        const login = request.headers.get("X-Keenetic-Login") || body.login;
        const password = request.headers.get("X-Keenetic-Password") || body.password;
        
        testCredentials = { host, login, password };
      } else {
        // В auth/no-auth режимах можно тестировать с env credentials
        // или с переданными в теле
        if (body.host && body.login && body.password) {
          testCredentials = body;
        } else {
          testCredentials = getKeeneticCredentials();
        }
      }

      const validation = keeneticSettingsSchema.safeParse(testCredentials);

      if (!validation.success) {
        recordRequest("POST", "/api/settings", 400, Date.now() - startTime);
        return NextResponse.json(
          {
            success: false,
            error: validation.error.issues[0]?.message || "Ошибка валидации",
          },
          { status: 400 }
        );
      }

      const client = createKeeneticClient({
        host: validation.data.host,
        login: validation.data.login,
        password: validation.data.password,
      });

      const connected = await client.testConnection();
      
      logger.info({ host: validation.data.host, connected }, "Connection test");

      recordRequest("POST", "/api/settings", 200, Date.now() - startTime);
      return NextResponse.json({
        success: true,
        data: { connected },
      });
    }

    // Сохранение настроек — только информируем пользователя
    const validation = keeneticSettingsSchema.safeParse(body);

    if (!validation.success) {
      recordRequest("POST", "/api/settings", 400, Date.now() - startTime);
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Ошибка валидации",
        },
        { status: 400 }
      );
    }

    recordRequest("POST", "/api/settings", 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      data: {
        message:
          "Для сохранения настроек добавьте следующие переменные в .env.local файл",
        envVariables: {
          KEENETIC_HOST: validation.data.host,
          KEENETIC_LOGIN: validation.data.login,
          KEENETIC_PASSWORD: "***",
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, "POST /api/settings error");
    recordRequest("POST", "/api/settings", 500, Date.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 }
    );
  }
}
