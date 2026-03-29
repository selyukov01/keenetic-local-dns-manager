import { NextResponse } from "next/server";
import { setAuthCookie, validateCredentials } from "@/lib/auth";
import { isAuthEnabled } from "@/lib/config";
import { createLogger } from "@/lib/logger";
import { recordRequest } from "@/lib/metrics";

const logger = createLogger("auth-login");

export async function POST(request: Request) {
  const startTime = Date.now();
  
  // Если авторизация выключена — ошибка
  if (!isAuthEnabled()) {
    recordRequest("POST", "/api/auth/login", 400, Date.now() - startTime);
    return NextResponse.json(
      { error: "Auth is not enabled" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { login, password } = body;

    if (!login || !password) {
      recordRequest("POST", "/api/auth/login", 400, Date.now() - startTime);
      return NextResponse.json(
        { error: "Login and password are required" },
        { status: 400 }
      );
    }

    // Проверка credentials
    if (!validateCredentials(login, password)) {
      logger.warn({ login }, "Failed login attempt");
      recordRequest("POST", "/api/auth/login", 401, Date.now() - startTime);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Установка cookie с JWT
    await setAuthCookie(login, request);
    
    logger.info({ login }, "User logged in successfully");
    
    recordRequest("POST", "/api/auth/login", 200, Date.now() - startTime);
    return NextResponse.json({ success: true, user: login });
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Login error");
    recordRequest("POST", "/api/auth/login", 500, Date.now() - startTime);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
