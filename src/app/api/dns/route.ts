import { NextResponse } from "next/server";
import { z } from "zod";
import { createDnsRecordSchema, dnsRecordSchema } from "@/lib/validations";
import { getClientForRequest, handleApiError, needsSetupResponse, successResponse } from "@/lib/api-helpers";
import { createLogger } from "@/lib/logger";
import { setDnsRecordsCount, setRouterConnected, recordRequest } from "@/lib/metrics";

const logger = createLogger("api-dns");

// Схема для массового добавления записей
const bulkCreateSchema = z.object({
  records: z.array(dnsRecordSchema).min(1, "Необходима хотя бы одна запись"),
});

// Схема для массового удаления
const bulkDeleteSchema = z.object({
  records: z.array(dnsRecordSchema).min(1, "Необходима хотя бы одна запись"),
});

export async function GET(request: Request) {
  const startTime = Date.now();
  try {
    const client = getClientForRequest(request);
    
    if (!client) {
      setRouterConnected(false);
      recordRequest("GET", "/api/dns", 503, Date.now() - startTime);
      return NextResponse.json(needsSetupResponse(), { status: 503 });
    }

    const records = await client.getDnsRecords();
    logger.info({ count: records.length }, "DNS records fetched");
    
    // Обновляем метрики
    setDnsRecordsCount(records.length);
    setRouterConnected(true);
    recordRequest("GET", "/api/dns", 200, Date.now() - startTime);

    return NextResponse.json(successResponse({ records }));
  } catch (error) {
    setRouterConnected(false);
    recordRequest("GET", "/api/dns", 500, Date.now() - startTime);
    const result = handleApiError(error, "GET /api/dns");
    return NextResponse.json(result, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const client = getClientForRequest(request);
    
    if (!client) {
      recordRequest("POST", "/api/dns", 503, Date.now() - startTime);
      return NextResponse.json(needsSetupResponse(), { status: 503 });
    }

    const body = await request.json();
    
    // Проверяем, это массовое добавление или одиночное
    if (body.records && Array.isArray(body.records)) {
      // Массовое добавление
      const validation = bulkCreateSchema.safeParse(body);

      if (!validation.success) {
        recordRequest("POST", "/api/dns", 400, Date.now() - startTime);
        return NextResponse.json(
          {
            success: false,
            error: validation.error.issues[0]?.message || "Ошибка валидации",
            errors: validation.error.issues,
          },
          { status: 400 }
        );
      }

      const results = [];

      for (const record of validation.data.records) {
        try {
          await client.addDnsRecord(record.domain, record.address);
          results.push({ ...record, success: true });
        } catch (error) {
          results.push({
            ...record,
            success: false,
            error: error instanceof Error ? error.message : "Ошибка",
          });
        }
      }

      logger.info({ count: validation.data.records.length }, "Bulk DNS records added");
      recordRequest("POST", "/api/dns", 200, Date.now() - startTime);
      return NextResponse.json(successResponse({ results }));
    } else {
      // Одиночное добавление
      const validation = createDnsRecordSchema.safeParse(body);

      if (!validation.success) {
        recordRequest("POST", "/api/dns", 400, Date.now() - startTime);
        return NextResponse.json(
          {
            success: false,
            error: validation.error.issues[0]?.message || "Ошибка валидации",
            errors: validation.error.issues,
          },
          { status: 400 }
        );
      }

      const { domain, address } = validation.data;
      await client.addDnsRecord(domain, address);

      recordRequest("POST", "/api/dns", 200, Date.now() - startTime);
      return NextResponse.json(successResponse({ domain, address }));
    }
  } catch (error) {
    recordRequest("POST", "/api/dns", 500, Date.now() - startTime);
    const result = handleApiError(error, "POST /api/dns");
    return NextResponse.json(result, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const startTime = Date.now();
  try {
    const client = getClientForRequest(request);
    
    if (!client) {
      recordRequest("DELETE", "/api/dns", 503, Date.now() - startTime);
      return NextResponse.json(needsSetupResponse(), { status: 503 });
    }

    const url = new URL(request.url);
    const deleteAll = url.searchParams.get("all") === "true";

    if (deleteAll) {
      // Удаление всех записей
      await client.deleteAllDnsRecords();
      logger.info("All DNS records deleted");
      setDnsRecordsCount(0);
      recordRequest("DELETE", "/api/dns", 200, Date.now() - startTime);
      return NextResponse.json(successResponse({ message: "Все DNS записи удалены" }));
    } else {
      // Массовое удаление выбранных записей
      const body = await request.json();
      const validation = bulkDeleteSchema.safeParse(body);

      if (!validation.success) {
        recordRequest("DELETE", "/api/dns", 400, Date.now() - startTime);
        return NextResponse.json(
          {
            success: false,
            error: validation.error.issues[0]?.message || "Ошибка валидации",
            errors: validation.error.issues,
          },
          { status: 400 }
        );
      }

      const results = [];

      for (const record of validation.data.records) {
        try {
          await client.deleteDnsRecord(record.domain, record.address);
          results.push({ ...record, success: true });
        } catch (error) {
          results.push({
            ...record,
            success: false,
            error: error instanceof Error ? error.message : "Ошибка",
          });
        }
      }

      logger.info({ count: validation.data.records.length }, "Bulk DNS records deleted");
      recordRequest("DELETE", "/api/dns", 200, Date.now() - startTime);
      return NextResponse.json(successResponse({ results }));
    }
  } catch (error) {
    recordRequest("DELETE", "/api/dns", 500, Date.now() - startTime);
    const result = handleApiError(error, "DELETE /api/dns");
    return NextResponse.json(result, { status: 500 });
  }
}
