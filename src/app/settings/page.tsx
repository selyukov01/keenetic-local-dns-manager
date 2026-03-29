"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle, XCircle, AlertTriangle, ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createLocalizedSettingsSchema, type KeeneticSettingsInput } from "@/lib/validations";
import { useAppMode } from "@/contexts/app-mode-context";
import { useDemoCredentials, getDemoHeaders } from "@/contexts/demo-context";
import { useDnsRecords } from "@/hooks/use-dns-records";
import { useTranslations } from "@/contexts/i18n-context";

export default function SettingsPage() {
  const { mode, isLoading: isModeLoading } = useAppMode();
  const { credentials, setCredentials, clearCredentials, isConfigured } = useDemoCredentials();
  const { refresh } = useDnsRecords();
  const t = useTranslations();

  const localizedSettingsSchema = useMemo(() => createLocalizedSettingsSchema(t), [t]);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [envSettings, setEnvSettings] = useState<{ host: string; login: string } | null>(null);

  const form = useForm<KeeneticSettingsInput>({
    resolver: zodResolver(localizedSettingsSchema),
    defaultValues: {
      host: "",
      login: "",
      password: "",
    },
  });

  // Загружаем настройки
  useEffect(() => {
    if (mode === "demo" && credentials) {
      // В demo режиме загружаем из sessionStorage
      form.reset({
        host: credentials.host,
        login: credentials.login,
        password: credentials.password,
      });
    } else if (mode !== "demo") {
      // В auth/no-auth режимах загружаем из API (env)
      const loadEnvSettings = async () => {
        try {
          const res = await fetch("/api/settings");
          const data = await res.json();
          if (data.success && data.data) {
            setEnvSettings({ host: data.data.host, login: data.data.login });
            form.reset({
              host: data.data.host || "",
              login: data.data.login || "",
              password: data.data.hasPassword ? "••••••••" : "",
            });
          }
        } catch (e) {
          console.error("Failed to load settings:", e);
        }
      };
      loadEnvSettings();
    }
  }, [mode, credentials, form]);

  const handleTestConnection = async () => {
    const values = form.getValues();
    const validation = localizedSettingsSchema.safeParse(values);

    if (!validation.success) {
      form.trigger();
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // В demo режиме передаём credentials в заголовках
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(mode === "demo" ? getDemoHeaders(values) : {}),
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...values, action: "test" }),
      });

      const result = await res.json();

      if (result.success && result.data?.connected) {
        setTestResult("success");
        toast.success(t.connectionSuccess);
      } else {
        setTestResult("error");
        toast.error(t.connectionFailed, {
          description: t.connectionFailedDesc,
        });
      }
    } catch (error) {
      setTestResult("error");
      toast.error(t.connectionErrorDesc, {
        description: error instanceof Error ? error.message : t.unknownError,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveDemo = () => {
    const values = form.getValues();
    const validation = localizedSettingsSchema.safeParse(values);

    if (!validation.success) {
      form.trigger();
      return;
    }

    setCredentials(values);
    toast.success(t.settingsSaved, {
      description: t.settingsSavedDesc,
    });
    
    // Перезагружаем данные DNS
    refresh();
  };

  const handleClearDemo = () => {
    clearCredentials();
    form.reset({ host: "", login: "", password: "" });
    setTestResult(null);
    toast.info(t.settingsCleared);
  };

  if (isModeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.settingsTitle}</h1>
        <p className="text-muted-foreground">
          {t.settingsDescription}
        </p>
      </div>

      {/* Предупреждение для demo режима */}
      {mode === "demo" && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
          <AlertTriangle />
          <AlertTitle>{t.demoModeTitle}</AlertTitle>
          <AlertDescription>
            {t.demoModeDescription}
          </AlertDescription>
        </Alert>
      )}

      {/* Информация для auth/no-auth режимов */}
      {mode !== "demo" && (
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t.envSettingsTitle}</AlertTitle>
          <AlertDescription className="block">
            {t.envSettingsDescription(mode)}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.routerConnectionTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.routerAddressLabel}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="192.168.1.1" 
                        {...field}
                        disabled={mode !== "demo"}
                      />
                    </FormControl>
                    <FormDescription>
                      {t.routerAddressDescription}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="login"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.loginFieldLabel}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="admin" 
                        {...field} 
                        disabled={mode !== "demo"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.passwordFieldLabel}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        disabled={mode !== "demo"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode === "demo" && (
                <>
                  <div className="flex items-center gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={mode !== "demo" || isTesting}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t.testing}
                        </>
                      ) : testResult === "success" ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          {t.connected}
                        </>
                      ) : testResult === "error" ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2 text-red-600" />
                          {t.error}
                        </>
                      ) : (
                        t.testConnection
                      )}
                    </Button>
                    <Button type="button" onClick={handleSaveDemo}>
                      {t.saveDemoSettings}
                    </Button>
                    {isConfigured && (
                      <Button type="button" variant="ghost" onClick={handleClearDemo}>
                        {t.forgetSettings}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Instructions for non-demo modes */}
      {mode !== "demo" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.envConfigTitle}</CardTitle>
            <CardDescription>
              {t.envConfigDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible className="data-[state=open]:bg-muted rounded-md">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="group w-full">
                  {t.configExample}
                  <ChevronDownIcon className="ml-auto group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col items-start gap-2 p-2.5 pt-0 text-sm">
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`# Mode: demo | no-auth | auth
APP_MODE=auth

# Keenetic router settings
KEENETIC_HOST=192.168.1.1
KEENETIC_LOGIN=admin
KEENETIC_PASSWORD=your_password

# Authorization (only for APP_MODE=auth)
AUTH_LOGIN=admin
AUTH_PASSWORD=your_app_password
AUTH_JWT_SECRET=your-32-character-secret-key-here`}
                </code>
              </pre>
              </CollapsibleContent>
            </Collapsible>
            <p className="text-sm text-muted-foreground mt-4">
              {t.restartServerNote}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
