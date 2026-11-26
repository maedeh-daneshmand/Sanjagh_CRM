import React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getContact, listAssignableUsers } from "@/server/contacts";
import ContactDetailClient from "./contact-detail-client";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = await requireUser();
  const canAssign = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [contact, assignableUsers] = await Promise.all([
    getContact(params.id),
    canAssign ? listAssignableUsers() : Promise.resolve([]),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <ContactDetailClient
      initialContact={contact}
      assignableUsers={assignableUsers}
    />
  );
}
