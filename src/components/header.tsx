"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, Database, LogOut, User } from "lucide-react";
import { ConnectionStatus } from "@/components/connection-status";
import { useAppMode } from "@/contexts/app-mode-context";
import { useTranslations } from "@/contexts/i18n-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, isAuthenticated, user, logout, isLoading } = useAppMode();
  const t = useTranslations();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Не показываем header на странице логина
  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="shadow-header dark:border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-18 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Logo/>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {mode === "demo" && (
              <Badge variant="outline" className="text-xs">
                {t.demo}
              </Badge>
            )}
            <ConnectionStatus />
            <ModeToggle />
            <LanguageToggle />
            <Button variant="ghost" size="icon" title={t.settings} onClick={() => router.push("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
            {mode === "auth" && isAuthenticated && !isLoading && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleLogout} title={t.logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
