import React from "react";
import { notFound } from "next/navigation";
import { getContact } from "@/server/contacts";
import ContactDetailClient from "./contact-detail-client";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const contact = await getContact(params.id);

  if (!contact) {
    notFound();
  }

  return <ContactDetailClient initialContact={contact} />;
}
