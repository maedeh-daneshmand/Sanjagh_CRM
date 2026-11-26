import React from "react";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { requireUser } from "@/server/auth";
import { getOverdueTaskCount } from "@/server/tasks";
import { UserProvider } from "@/components/auth/user-context";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, overdueTasksCount] = await Promise.all([
    requireUser(),
    getOverdueTaskCount().catch(() => 0),
  ]);

  return (
    <UserProvider
      user={{
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar (left/right depending on RTL) */}
        <AppSidebar overdueTasksCount={overdueTasksCount} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-muted/20">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
