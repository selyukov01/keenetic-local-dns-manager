import { NextResponse } from "next/server";
import { getAppMode, validateConfigForMode } from "@/lib/config";
import { APP_VERSION } from "@/lib/version";
import { recordRequest } from "@/lib/metrics";

export async function GET() {
  const startTime = Date.now();
  const appMode = getAppMode();
  const configValidation = validateConfigForMode();

  const health = {
    status: configValidation.valid ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    appMode,
    version: APP_VERSION,
    checks: {
      config: {
        status: configValidation.valid ? "pass" : "fail",
        errors: configValidation.errors,
      },
    },
  };

  const statusCode = configValidation.valid ? 200 : 503;
  recordRequest("GET", "/api/health", statusCode, Date.now() - startTime);

  return NextResponse.json(health, { status: statusCode });
}
