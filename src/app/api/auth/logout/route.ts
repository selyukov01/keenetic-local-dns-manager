import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { recordRequest } from "@/lib/metrics";

const logger = createLogger("auth-logout");

export async function POST() {
  const startTime = Date.now();
  try {
    await clearAuthCookie();
    logger.info("User logged out");
    recordRequest("POST", "/api/auth/logout", 200, Date.now() - startTime);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Logout error");
    recordRequest("POST", "/api/auth/logout", 500, Date.now() - startTime);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
