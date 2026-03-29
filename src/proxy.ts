import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getConfig, isAuthEnabled, isDemoMode } from "./lib/config";

// Пути, которые не требуют авторизации
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/health",
  "/metrics",
  "/login",
];

// Проверка JWT из cookie
async function checkJwtAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("keenetic-dns-session")?.value;
  
  if (!token) {
    return false;
  }
  
  // Динамический импорт jose для edge runtime
  const { jwtVerify } = await import("jose");
  const config = getConfig();
  
  if (!config.auth.jwtSecret) {
    return false;
  }
  
  try {
    const secret = new TextEncoder().encode(config.auth.jwtSecret);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // В demo режиме — всё открыто
  if (isDemoMode()) {
    return NextResponse.next();
  }
  
  // Метрики обрабатываются в самом route
  if (pathname === "/metrics") {
    return NextResponse.next();
  }
  
  // Если авторизация не включена и пользователь пытается зайти на /login
  // редиректим на главную (в no-auth режиме логин не нужен)
  if (!isAuthEnabled() && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  // Публичные пути — пропускаем (включая /login для auth режима)
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Статические файлы — пропускаем
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }
  
  // Если авторизация не включена — пропускаем
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }
  
  // Проверка JWT авторизации
  const isAuthenticated = await checkJwtAuth(request);
  
  if (!isAuthenticated) {
    // API запросы — 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Страницы — редирект на логин
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
