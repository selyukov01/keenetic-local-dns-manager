import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { isAuthEnabled, getAppMode } from "@/lib/config";
import { recordRequest } from "@/lib/metrics";

export async function GET() {
  const startTime = Date.now();
  const appMode = getAppMode();
  
  if (!isAuthEnabled()) {
    recordRequest("GET", "/api/auth/me", 200, Date.now() - startTime);
    return NextResponse.json({
      authenticated: true,
      user: null,
      authRequired: false,
      appMode,
    });
  }

  const { authenticated, user } = await checkAuth();
  
  recordRequest("GET", "/api/auth/me", 200, Date.now() - startTime);
  return NextResponse.json({
    authenticated,
    user,
    authRequired: true,
    appMode,
  });
}
