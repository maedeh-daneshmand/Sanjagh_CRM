import React from "react";
import { requireRole } from "@/server/auth";
import { listUsers } from "@/server/users";
import UsersClient from "./users-client";

export default async function UsersPage() {
  const admin = await requireRole("ADMIN");
  const users = await listUsers();

  return <UsersClient initialUsers={users} currentUserId={admin.id} />;
}
