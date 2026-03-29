"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DnsTable } from "@/components/dns-table";
import { useDnsRecords } from "@/hooks/use-dns-records";
import { useTranslations } from "@/contexts/i18n-context";
import Link from "next/link";


export default function HomePage() {
  const {
    records,
    isLoading,
    error,
    needsSetup,
    refresh,
  } = useDnsRecords();
  const t = useTranslations();

  const handleRefresh = () => {
    refresh();
    toast.info(t.refreshing);
  };

  if (needsSetup) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader>
          <CardTitle>{t.setupTitle}</CardTitle>
          <CardDescription>
            {t.setupDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings">
            <Button className="w-full">{t.goToSettings}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (error && !needsSetup) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader>
          <CardTitle className="text-destructive">{t.connectionErrorTitle}</CardTitle>
          <CardDescription>
            {t.connectionErrorDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : t.unknownError}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              {t.retry}
            </Button>
            <Link href="/settings">
              <Button>{t.settings}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DnsTable
      records={records}
      isLoading={isLoading}
    />
  );
}
