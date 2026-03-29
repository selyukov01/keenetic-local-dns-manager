import { NextResponse } from "next/server";
import { getMetricsRegistry, checkMetricsAuth, isMetricsEnabled, refreshRouterMetrics } from "@/lib/metrics";

export async function GET(request: Request) {
  // Проверяем, включены ли метрики
  if (!isMetricsEnabled()) {
    return NextResponse.json(
      { error: "Metrics are disabled" },
      { status: 404 }
    );
  }
  
  // Проверяем авторизацию
  if (!checkMetricsAuth(request)) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Metrics"',
      },
    });
  }
  
  try {
    // Обновляем метрики интернет-центра перед отдачей
    await refreshRouterMetrics();
    
    const register = getMetricsRegistry();
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": register.contentType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to collect metrics" },
      { status: 500 }
    );
  }
}
