import jalaali from "jalaali-js";

const PERSIAN_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEKDAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
];

export function toJalali(date: Date | string | number | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  const j = jalaali.toJalaali(d);
  return {
    year: j.jy,
    month: j.jm,
    day: j.jd,
    monthName: PERSIAN_MONTH_NAMES[j.jm - 1],
    date: d,
  };
}

// Formats as Jalali date with English digits, e.g. "1403/08/25" or "25 آبان 1403"
export function formatJalaliDate(
  date: Date | string | number | null | undefined,
  format: "short" | "long" | "time" | "full" = "short"
): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const j = jalaali.toJalaali(d);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (format === "short") {
    return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
  }

  if (format === "long") {
    return `${j.jd} ${PERSIAN_MONTH_NAMES[j.jm - 1]} ${j.jy}`;
  }

  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  if (format === "time") {
    return `${hours}:${minutes}`;
  }

  return `${j.jd} ${PERSIAN_MONTH_NAMES[j.jm - 1]} ${j.jy} - ${hours}:${minutes}`;
}

export { PERSIAN_MONTH_NAMES, WEEKDAY_NAMES };
