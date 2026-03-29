"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useDnsRecords } from "@/hooks/use-dns-records";
import { useTranslations } from "@/contexts/i18n-context";

export function ConnectionStatus() {
  const { isLoading, error, needsSetup } = useDnsRecords();
  const t = useTranslations();

  if (needsSetup) {
    return (
      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
        {t.connectionNotConfigured}
      </Badge>
    );
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {t.connectionConnecting}
        <Spinner data-icon="inline-end" />
      </Badge>
    );
  }

  if (error) {
    return (
      <Badge variant="outline" className="text-red-600 border-red-600">
        {t.connectionError}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-green-600 border-green-600">
      {t.connectionConnected}
    </Badge>
  );
}
