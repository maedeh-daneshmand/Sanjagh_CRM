import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-context";
import { CustomizerDrawer } from "@/components/theme/customizer-drawer";

export const metadata: Metadata = {
  title: "سنجاق | سامانه مدیریت ارتباط با مشتری (CRM)",
  description: "نرم‌افزار CRM سنجاق - پایپ‌لاین فروش، مدیریت مشتریان، اتوماسیون و دستیار هوشمند",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body
        className="font-vazir antialiased bg-background text-foreground min-h-screen selection:bg-primary/20 selection:text-primary"
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
          <CustomizerDrawer />
        </ThemeProvider>
      </body>
    </html>
  );
}
