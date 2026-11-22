import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number in English digits (e.g. 1,234,567)
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined || isNaN(Number(num))) return "0";
  return new Intl.NumberFormat("en-US").format(Number(num));
}

// Format Toman currency in English digits
export function formatToman(amount: number | string | null | undefined): string {
  return `${formatNumber(amount)} تومان`;
}

// Format phone number cleanly
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  return phone;
}
