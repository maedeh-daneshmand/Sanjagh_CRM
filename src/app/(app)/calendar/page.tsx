import React from "react";
import jalaali from "jalaali-js";
import { requireUser } from "@/server/auth";
import { getTasksByRange, getTehranDayBounds } from "@/server/tasks";
import { listContactsForDealSelect } from "@/server/deals";
import { listAssignableUsers } from "@/server/contacts";
import CalendarClient from "./calendar-client";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default async function CalendarPage() {
  const currentUser = await requireUser();
  const canAssign = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const { tehranYmd } = getTehranDayBounds();
  const [gy, gm, gd] = tehranYmd.split("-").map(Number);
  const todayJ = jalaali.toJalaali(new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0)));

  const monthLen = jalaali.jalaaliMonthLength(todayJ.jy, todayJ.jm);
  const gStart = jalaali.toGregorian(todayJ.jy, todayJ.jm, 1);
  const gEnd = jalaali.toGregorian(todayJ.jy, todayJ.jm, monthLen);

  const fromIso = new Date(
    `${gStart.gy}-${pad(gStart.gm)}-${pad(gStart.gd)}T00:00:00.000+03:30`
  ).toISOString();
  const toIso = new Date(
    `${gEnd.gy}-${pad(gEnd.gm)}-${pad(gEnd.gd)}T23:59:59.999+03:30`
  ).toISOString();

  const [initialTasks, contactOptions, assignableUsers] = await Promise.all([
    getTasksByRange(fromIso, toIso),
    listContactsForDealSelect(),
    canAssign ? listAssignableUsers() : Promise.resolve([]),
  ]);

  return (
    <CalendarClient
      initialYear={todayJ.jy}
      initialMonth={todayJ.jm}
      todayJalali={{ jy: todayJ.jy, jm: todayJ.jm, jd: todayJ.jd }}
      initialTasks={initialTasks}
      contactOptions={contactOptions}
      assignableUsers={assignableUsers}
    />
  );
}
