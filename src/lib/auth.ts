import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getConfig } from "./config";
import { createLogger } from "./logger";

const logger = createLogger("auth");

const COOKIE_NAME = "keenetic-dns-session";
const TOKEN_EXPIRY = "24h";

// Получение секретного ключа
function getJwtSecret(): Uint8Array {
  const config = getConfig();
  const secret = config.auth.jwtSecret;
  
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not configured");
  }
  
  return new TextEncoder().encode(secret);
}

// Payload JWT токена
export interface JwtPayload {
  sub: string; // login пользователя
  iat: number;
  exp: number;
}

// Создание JWT токена
export async function createToken(login: string): Promise<string> {
  const secret = getJwtSecret();
  
  const token = await new SignJWT({ sub: login })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
  
  logger.debug({ login }, "JWT token created");
  return token;
}

// Верификация JWT токена
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    
    return {
      sub: payload.sub as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    logger.debug({ error: (error as Error).message }, "JWT verification failed");
    return null;
  }
}

// Определение HTTPS по заголовкам запроса
function isSecureRequest(request?: Request): boolean {
  if (!request) return false;
  // Reverse proxy / load balancer
  if (request.headers.get("x-forwarded-proto") === "https") return true;
  // Direct HTTPS
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

// Установка cookie с токеном
export async function setAuthCookie(login: string, request?: Request): Promise<void> {
  const token = await createToken(login);
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
  
  logger.info({ login }, "Auth cookie set");
}

// Удаление cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  logger.info("Auth cookie cleared");
}

// Получение текущего пользователя из cookie
export async function getCurrentUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  const payload = await verifyToken(token);
  return payload?.sub || null;
}

// Проверка credentials
export function validateCredentials(login: string, password: string): boolean {
  const config = getConfig();
  
  if (!config.auth.login || !config.auth.password) {
    logger.warn("Auth credentials not configured");
    return false;
  }
  
  const valid = login === config.auth.login && password === config.auth.password;
  
  if (!valid) {
    logger.warn({ login }, "Invalid login attempt");
  }
  
  return valid;
}

// Проверка авторизации для API
export async function checkAuth(): Promise<{ authenticated: boolean; user: string | null }> {
  const user = await getCurrentUser();
  return {
    authenticated: user !== null,
    user,
  };
}
