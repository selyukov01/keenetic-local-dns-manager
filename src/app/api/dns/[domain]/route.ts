import { NextResponse } from "next/server";
import { domainSchema, ipv4Schema } from "@/lib/validations";
import { getClientForRequest, handleApiError, needsSetupResponse, successResponse } from "@/lib/api-helpers";
import { createLogger } from "@/lib/logger";
import { recordRequest } from "@/lib/metrics";

const logger = createLogger("api-dns-domain");

interface RouteParams {
  params: Promise<{ domain: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const startTime = Date.now();
  try {
    const client = getClientForRequest(request);
    
    if (!client) {
      recordRequest("PUT", "/api/dns/[domain]", 503, Date.now() - startTime);
      return NextResponse.json(needsSetupResponse(), { status: 503 });
    }

    const { domain: oldDomain } = await params;
    const body = await request.json();
    const oldAddress = body.oldAddress;

    if (!oldAddress) {
      recordRequest("PUT", "/api/dns/[domain]", 400, Date.now() - startTime);
      return NextResponse.json(
        {
          success: false,
          error: "Старый IP-адрес обязателен для обновления записи",
        },
        { status: 400 }
      );
    }

    // Валидация входных данных
    const domainValidation = domainSchema.safeParse(body.domain);
    const addressValidation = ipv4Schema.safeParse(body.address);

    if (!domainValidation.success) {
      recordRequest("PUT", "/api/dns/[domain]", 400, Date.now() - startTime);
      return NextResponse.json(
        {
          success: false,
          error: domainValidation.error.issues[0]?.message || "Неверный формат домена",
        },
        { status: 400 }
      );
    }

    if (!addressValidation.success) {
      recordRequest("PUT", "/api/dns/[domain]", 400, Date.now() - startTime);
      return NextResponse.json(
        {
          success: false,
          error: addressValidation.error.issues[0]?.message || "Неверный формат IP-адреса",
        },
        { status: 400 }
      );
    }

    await client.updateDnsRecord(
      decodeURIComponent(oldDomain),
      oldAddress,
      domainValidation.data,
      addressValidation.data
    );

    logger.info(
      { oldDomain, oldAddress, newDomain: domainValidation.data, newAddress: addressValidation.data },
      "DNS record updated"
    );

    recordRequest("PUT", "/api/dns/[domain]", 200, Date.now() - startTime);
    return NextResponse.json(
      successResponse({
        domain: domainValidation.data,
        address: addressValidation.data,
      })
    );
  } catch (error) {
    recordRequest("PUT", "/api/dns/[domain]", 500, Date.now() - startTime);
    const result = handleApiError(error, "PUT /api/dns/[domain]");
    return NextResponse.json(result, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const startTime = Date.now();
  try {
    const client = getClientForRequest(request);
    
    if (!client) {
      recordRequest("DELETE", "/api/dns/[domain]", 503, Date.now() - startTime);
      return NextResponse.json(needsSetupResponse(), { status: 503 });
    }

    const { domain } = await params;
    const body = await request.json();
    const address = body.address;

    if (!address) {
      recordRequest("DELETE", "/api/dns/[domain]", 400, Date.now() - startTime);
      return NextResponse.json(
        {
          success: false,
          error: "IP-адрес обязателен для удаления записи",
        },
        { status: 400 }
      );
    }

    await client.deleteDnsRecord(decodeURIComponent(domain), address);

    logger.info({ domain, address }, "DNS record deleted");

    recordRequest("DELETE", "/api/dns/[domain]", 200, Date.now() - startTime);
    return NextResponse.json(
      successResponse({
        domain: decodeURIComponent(domain),
        address,
      })
    );
  } catch (error) {
    recordRequest("DELETE", "/api/dns/[domain]", 500, Date.now() - startTime);
    const result = handleApiError(error, "DELETE /api/dns/[domain]");
    return NextResponse.json(result, { status: 500 });
  }
}
