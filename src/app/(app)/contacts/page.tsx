import React from "react";
import { ContactKind } from "@prisma/client";
import { listContacts } from "@/server/contacts";
import ContactsClient from "./contacts-client";

export default async function ContactsPage() {
  const { items } = await listContacts({
    kind: ContactKind.CUSTOMER,
  });

  return <ContactsClient initialContacts={items} />;
}
