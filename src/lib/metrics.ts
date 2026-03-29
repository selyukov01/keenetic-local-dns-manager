import { Registry, Gauge, Counter, Histogram, collectDefaultMetrics } from "prom-client";
import { getConfig, getKeeneticCredentials, isDemoMode } from "@/lib/config";
import { APP_VERSION } from "@/lib/version";
import { createKeeneticClient } from "@/lib/keenetic-client";

// Создаём глобальный регистр для метрик (singleton)
const globalForMetrics = globalThis as unknown as {
  metricsRegistry: Registry | undefined;
  metricsInitialized: boolean | undefined;
};

// Инициализация регистра
function getOrCreateRegistry(): Registry {
  if (!globalForMetrics.metricsRegistry) {
    globalForMetrics.metricsRegistry = new Registry();
  }
  return globalForMetrics.metricsRegistry;
}

const register = getOrCreateRegistry();

// Инициализация стандартных метрик (один раз)
if (!globalForMetrics.metricsInitialized) {
  collectDefaultMetrics({ register });
  globalForMetrics.metricsInitialized = true;
}

// Кастомные метрики (создаём только если ещё не существуют)
function getOrCreateGauge(name: string, help: string, labelNames: string[] = []): Gauge {
  const existing = register.getSingleMetric(name);
  if (existing) {
    return existing as Gauge;
  }
  return new Gauge({
    name,
    help,
    labelNames,
    registers: [register],
  });
}

function getOrCreateCounter(name: string, help: string, labelNames: string[] = []): Counter {
  const existing = register.getSingleMetric(name);
  if (existing) {
    return existing as Counter;
  }
  return new Counter({
    name,
    help,
    labelNames,
    registers: [register],
  });
}

function getOrCreateHistogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]): Histogram {
  const existing = register.getSingleMetric(name);
  if (existing) {
    return existing as Histogram;
  }
  return new Histogram({
    name,
    help,
    labelNames,
    buckets,
    registers: [register],
  });
}

// Метрики
const dnsRecordsTotal = getOrCreateGauge(
  "keenetic_dns_records_total",
  "Total number of DNS records on the router"
);

const dnsRequestsTotal = getOrCreateCounter(
  "keenetic_dns_requests_total",
  "Total number of API requests",
  ["method", "endpoint", "status"]
);

const dnsRequestDuration = getOrCreateHistogram(
  "keenetic_dns_request_duration_seconds",
  "Duration of API requests in seconds",
  ["method", "endpoint"],
  [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
);

const routerConnected = getOrCreateGauge(
  "keenetic_router_connected",
  "Whether the router is connected (1) or not (0)"
);

const appInfo = getOrCreateGauge(
  "keenetic_dns_app_info",
  "Application information",
  ["version", "mode"]
);

// Устанавливаем информацию о приложении
const config = getConfig();
appInfo.set({ version: APP_VERSION, mode: config.appMode }, 1);

// Экспорт функций для записи метрик
export function recordRequest(
  method: string,
  endpoint: string,
  status: number,
  duration: number
) {
  dnsRequestsTotal.inc({ method, endpoint, status: String(status) });
  dnsRequestDuration.observe({ method, endpoint }, duration / 1000);
}

export function setDnsRecordsCount(count: number) {
  dnsRecordsTotal.set(count);
}

export function setRouterConnected(connected: boolean) {
  routerConnected.set(connected ? 1 : 0);
}

// Экспорт регистра для endpoint метрик
export function getMetricsRegistry(): Registry {
  return register;
}

// Обновление метрик интернет-центра (вызывается при запросе /metrics)
export async function refreshRouterMetrics(): Promise<void> {
  // В demo режиме всегда сбрасываем значения в 0
  if (isDemoMode()) {
    dnsRecordsTotal.set(0);
    routerConnected.set(0);
    return;
  }

  const credentials = getKeeneticCredentials();
  if (!credentials) {
    routerConnected.set(0);
    dnsRecordsTotal.set(0);
    return;
  }

  try {
    const client = createKeeneticClient(credentials);
    const records = await client.getDnsRecords();
    dnsRecordsTotal.set(records.length);
    routerConnected.set(1);
  } catch {
    routerConnected.set(0);
    dnsRecordsTotal.set(0);
  }
}

// Проверка Basic Auth для метрик
export function checkMetricsAuth(request: Request): boolean {
  const metricsConfig = getConfig().metrics;
  
  if (!metricsConfig.authEnabled) {
    return true;
  }
  
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return false;
  }
  
  const base64 = authHeader.slice(6);
  const decoded = atob(base64);
  const [login, password] = decoded.split(":");
  
  return login === metricsConfig.login && password === metricsConfig.password;
}

// Проверка включены ли метрики
export function isMetricsEnabled(): boolean {
  return getConfig().metrics.enabled;
}
