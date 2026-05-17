"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/features/auth/context/auth-context";
import { LocaleProvider } from "@/shared/i18n/context/locale-context";

/** Client providers wrapper. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LocaleProvider>
        <AuthProvider>{children}</AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
