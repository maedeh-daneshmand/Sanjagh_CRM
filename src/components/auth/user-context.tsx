"use client";

import React, { createContext, useContext } from "react";

export interface CurrentUser {
  id: string;
  phone: string;
  name: string;
  email?: string | null;
  role: "ADMIN" | "MANAGER" | "SALES";
  avatarUrl?: string | null;
}

interface UserContextType {
  user: CurrentUser;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
