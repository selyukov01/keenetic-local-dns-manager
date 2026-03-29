import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { DnsRecord, KeeneticConfig } from "@/types/dns";
import { createLogger } from "./logger";

const logger = createLogger("keenetic-client");

// Путь к файлу куки
const COOKIE_FILE_PATH = path.join(process.cwd(), "data", "keenetic-cookies.json");

interface PersistedCookies {
  host: string;
  cookies: string[];
  savedAt: string;
}

function loadCookiesFromFile(host: string): string[] | null {
  try {
    if (!fs.existsSync(COOKIE_FILE_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(COOKIE_FILE_PATH, "utf-8");
    const data: PersistedCookies = JSON.parse(raw);

    // Проверяем что куки для того же хоста
    if (data.host !== host) {
      logger.debug("Cookie file host mismatch, ignoring");
      return null;
    }

    logger.debug({ host, savedAt: data.savedAt }, "Loaded cookies from file");
    return data.cookies;
  } catch (error) {
    logger.debug({ error: (error as Error).message }, "Failed to load cookies from file");
    return null;
  }
}

function saveCookiesToFile(host: string, cookies: string[]): void {
  try {
    const dir = path.dirname(COOKIE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data: PersistedCookies = {
      host,
      cookies,
      savedAt: new Date().toISOString(),
    };

    fs.writeFileSync(COOKIE_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    logger.debug({ host }, "Cookies saved to file");
  } catch (error) {
    logger.warn({ error: (error as Error).message }, "Failed to save cookies to file");
  }
}

function deleteCookieFile(): void {
  try {
    if (fs.existsSync(COOKIE_FILE_PATH)) {
      fs.unlinkSync(COOKIE_FILE_PATH);
      logger.debug("Cookie file deleted");
    }
  } catch (error) {
    logger.warn({ error: (error as Error).message }, "Failed to delete cookie file");
  }
}

export class KeeneticClient {
  private host: string;
  private login: string;
  private password: string;
  private cookies: string[] = [];
  private cookiePersist: boolean;

  constructor(config: KeeneticConfig & { cookiePersist?: boolean }) {
    this.host = config.host;
    this.login = config.login;
    this.password = config.password;
    this.cookiePersist = config.cookiePersist ?? false;

    // Загружаем куки из файла при создании клиента
    if (this.cookiePersist) {
      const saved = loadCookiesFromFile(this.host);
      if (saved) {
        this.cookies = saved;
      }
    }
  }

  private async authenticate(): Promise<boolean> {
    try {
      // Если есть сохранённые куки — пробуем авторизоваться через них
      if (this.cookies.length > 0) {
        const checkResponse = await fetch(`http://${this.host}/auth`, {
          method: "GET",
          headers: {
            Cookie: this.cookies.join("; "),
          },
        });

        if (checkResponse.status === 200) {
          logger.debug({ host: this.host }, "Authenticated via saved cookies");
          return true;
        }

        // Куки просрочены — сбрасываем
        logger.debug({ host: this.host }, "Saved cookies expired, re-authenticating");
        this.cookies = [];
        if (this.cookiePersist) {
          deleteCookieFile();
        }
      }

      // Step 1: Get challenge and realm
      const authResponse = await fetch(`http://${this.host}/auth`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // If already authenticated (200), we're good
      if (authResponse.status === 200) {
        return true;
      }

      if (authResponse.status !== 401) {
        logger.error({ status: authResponse.status }, "Unexpected auth status");
        return false;
      }

      const challenge = authResponse.headers.get("X-NDM-Challenge");
      const realm = authResponse.headers.get("X-NDM-Realm");

      if (!challenge || !realm) {
        logger.error("Missing challenge or realm headers");
        return false;
      }

      // Save cookies from first response
      const setCookie = authResponse.headers.get("Set-Cookie");
      if (setCookie) {
        this.cookies = setCookie.split(",").map((c) => c.split(";")[0].trim());
      }

      // Step 2: Calculate password hash
      // hash1 = MD5(login:realm:password)
      const hash1 = crypto
        .createHash("md5")
        .update(`${this.login}:${realm}:${this.password}`)
        .digest("hex");

      // hash2 = SHA256(challenge + hash1)
      const hash2 = crypto
        .createHash("sha256")
        .update(challenge + hash1)
        .digest("hex");

      // Step 3: Send authentication request
      const loginResponse = await fetch(`http://${this.host}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: this.cookies.join("; "),
        },
        body: JSON.stringify({
          login: this.login,
          password: hash2,
        }),
      });

      if (loginResponse.ok) {
        // Update cookies from login response
        const newCookie = loginResponse.headers.get("Set-Cookie");
        if (newCookie) {
          this.cookies = newCookie
            .split(",")
            .map((c) => c.split(";")[0].trim());
        }

        // Сохраняем куки в файл для последующих запусков
        if (this.cookiePersist) {
          saveCookiesToFile(this.host, this.cookies);
        }

        logger.debug({ host: this.host }, "Authentication successful");
        return true;
      }

      logger.error({ status: loginResponse.status }, "Authentication failed");
      return false;
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Authentication error");
      return false;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    const authenticated = await this.authenticate();
    if (!authenticated) {
      throw new Error("Authentication failed");
    }

    const response = await fetch(`http://${this.host}${path}`, {
      ...options,
      cache: "no-store" as RequestCache,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookies.join("; "),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  }

  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      return authenticated;
    } catch {
      return false;
    }
  }

  async getDnsRecords(): Promise<DnsRecord[]> {
    try {
      // Keenetic возвращает массив объектов: [{domain: "...", address: "..."}, ...]
      const data = await this.request<DnsRecord[]>("/rci/ip/host");

      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Фильтруем только валидные записи с domain и address
      return data.filter(
        (record): record is DnsRecord =>
          typeof record === "object" &&
          record !== null &&
          typeof record.domain === "string" &&
          typeof record.address === "string"
      );
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to get DNS records");
      throw error;
    }
  }

  async addDnsRecord(domain: string, address: string): Promise<boolean> {
    try {
      // RCI API формат: POST /rci/ip/host с телом {domain: "...", address: "..."}
      await this.request("/rci/ip/host", {
        method: "POST",
        body: JSON.stringify({
          domain: domain,
          address: address,
        }),
      });

      // Save configuration
      await this.saveConfig();

      logger.info({ domain, address }, "DNS record added");
      return true;
    } catch (error) {
      logger.error({ error: (error as Error).message, domain, address }, "Failed to add DNS record");
      throw error;
    }
  }

  async updateDnsRecord(
    oldDomain: string,
    oldAddress: string,
    newDomain: string,
    newAddress: string
  ): Promise<boolean> {
    try {
      // Удаляем старую запись (нужны и домен, и адрес)
      await this.deleteDnsRecord(oldDomain, oldAddress);

      // Добавляем новую запись
      await this.request("/rci/ip/host", {
        method: "POST",
        body: JSON.stringify({
          domain: newDomain,
          address: newAddress,
        }),
      });

      await this.saveConfig();

      logger.info({ oldDomain, oldAddress, newDomain, newAddress }, "DNS record updated");
      return true;
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to update DNS record");
      throw error;
    }
  }

  async deleteDnsRecord(domain: string, address: string): Promise<boolean> {
    try {
      // Удаление конкретной записи: указываем domain, address и no: true
      // Как CLI команда: no ip host {domain} {address}
      await this.request("/rci/ip/host", {
        method: "POST",
        body: JSON.stringify({
          domain: domain,
          address: address,
          no: true,
        }),
      });

      await this.saveConfig();

      logger.info({ domain, address }, "DNS record deleted");
      return true;
    } catch (error) {
      logger.error({ error: (error as Error).message, domain, address }, "Failed to delete DNS record");
      throw error;
    }
  }

  async deleteAllDnsRecords(): Promise<boolean> {
    try {
      // DELETE /rci/ip/host удаляет все записи
      await this.request("/rci/ip/host", {
        method: "DELETE",
      });

      await this.saveConfig();

      logger.info("All DNS records deleted");
      return true;
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to delete all DNS records");
      throw error;
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await this.request("/rci/system/configuration/save", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch (error) {
      logger.warn({ error: (error as Error).message }, "Failed to save configuration");
      // Don't throw - save might fail but record was still added
    }
  }
}

// Singleton instance for the API routes (used in auth/no-auth modes)
let clientInstance: KeeneticClient | null = null;

/**
 * Get Keenetic client from env variables (auth/no-auth modes)
 * For demo mode, use createKeeneticClient with credentials from request
 */
export function getKeeneticClient(): KeeneticClient {
  const host = process.env.KEENETIC_HOST;
  const login = process.env.KEENETIC_LOGIN;
  const password = process.env.KEENETIC_PASSWORD;
  const cookiePersist = process.env.KEENETIC_COOKIE_PERSIST === "true";

  if (!host || !login || !password) {
    throw new Error(
      "Missing Keenetic configuration. Please set KEENETIC_HOST, KEENETIC_LOGIN, and KEENETIC_PASSWORD environment variables."
    );
  }

  if (
    !clientInstance ||
    clientInstance["host"] !== host ||
    clientInstance["login"] !== login
  ) {
    clientInstance = new KeeneticClient({ host, login, password, cookiePersist });
  }

  return clientInstance;
}

/**
 * Create a new Keenetic client with provided credentials (for demo mode)
 * Does not use singleton - creates a new instance for each request
 */
export function createKeeneticClient(config: KeeneticConfig): KeeneticClient {
  return new KeeneticClient(config);
}

export function hasKeeneticConfig(): boolean {
  return !!(
    process.env.KEENETIC_HOST &&
    process.env.KEENETIC_LOGIN &&
    process.env.KEENETIC_PASSWORD
  );
}
