"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { useThemeCustomizer } from "@/components/theme/theme-context";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { layout } = useThemeCustomizer();
  const [newDealOpen, setNewDealOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar (left/right depending on RTL) */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader onOpenNewDeal={() => setNewDealOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-muted/20">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
