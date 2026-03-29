import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/header";
import { AppModeProvider } from "@/contexts/app-mode-context";
import { DemoProvider } from "@/contexts/demo-context";
import { I18nProvider } from "@/contexts/i18n-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SELYUKOV | Keenetic DNS manager",
  description: "Управление статическими DNS записями интернет-центра Keenetic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="DNS Manager" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <AppModeProvider>
              <DemoProvider>
                <Header />
                <main className="container mx-auto">{children}</main>
                <Toaster />
              </DemoProvider>
            </AppModeProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
