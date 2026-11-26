import React from "react";
import { requireUser } from "@/server/auth";
import { listTasks } from "@/server/tasks";
import { listContactsForDealSelect } from "@/server/deals";
import { listAssignableUsers } from "@/server/contacts";
import TasksClient from "./tasks-client";

export default async function TasksPage() {
  const currentUser = await requireUser();
  const canAssign = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [tasksData, contactOptions, assignableUsers] = await Promise.all([
    listTasks(),
    listContactsForDealSelect(),
    canAssign ? listAssignableUsers() : Promise.resolve([]),
  ]);

  return (
    <TasksClient
      initialTasks={tasksData.tasks}
      contactOptions={contactOptions}
      assignableUsers={assignableUsers}
    />
  );
}
