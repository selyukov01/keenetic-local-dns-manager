"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppMode } from "@/contexts/app-mode-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import Logo from "@/components/logo";
import { Field, FieldGroup, FieldLabel, FieldSet, } from "@/components/ui/field"
import { useTranslations } from "@/contexts/i18n-context";
import { LanguageToggle } from "@/components/language-toggle";


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode, login, isLoading: isAppLoading, isAuthenticated } = useAppMode();
  const t = useTranslations();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Редирект если уже авторизован или режим не auth
  useEffect(() => {
    if (!isAppLoading && !isRedirecting) {
      if (isAuthenticated || mode !== "auth") {
        setIsRedirecting(true);
        const from = searchParams.get("from") || "/";
        router.replace(from);
      }
    }
  }, [isAppLoading, isAuthenticated, mode, router, searchParams, isRedirecting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(username, password);
      
      if (success) {
        setIsRedirecting(true);
        const from = searchParams.get("from") || "/";
        router.replace(from);
      } else {
        setError(t.invalidCredentials);
      }
    } catch (err) {
      setError(t.authError);
    } finally {
      setIsLoading(false);
    }
  };

  // Показываем загрузку пока проверяем авторизацию или редирект
  if (isAppLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 pt-20">
      <div className="h-7 mb-8">
        <Logo type="brand"/>
      </div>
      <Card className="mb-4 w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold">{t.loginTitle}</CardTitle>
          <CardDescription>{t.loginDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <FieldSet className="">
              <FieldGroup className="gap-4">
                <Field className="gap-2">
                  <FieldLabel htmlFor="username">{t.loginLabel}</FieldLabel>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.loginPlaceholder}
                    required
                    autoComplete="username"
                  />
                </Field>
                <Field className="gap-2">
                  <FieldLabel htmlFor="password">{t.passwordLabel}</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t.loggingIn}
                </>
              ) : (
                t.loginButton
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex justify-end w-full max-w-md gap-2 items-center">
        <div className="text-sm">{t.language}:</div>
        <LanguageToggle size="icon-xs"/>
      </div>
    </div>
  );
}
