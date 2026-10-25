import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "YYYY-MM" for the viewer's current local month, the value format of <input type="month">.
export function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// "YYYY-MM-DD" for the viewer's local today, the value format of <input type="date">.
// (toISOString() is UTC, which gives yesterday's date in India before 5:30 am.)
export function todayValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// A month from a URL param, or the current month if it's missing or not 1-12 (e.g. ?month=13).
export function monthParam(value: string | null | undefined) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : new Date().getMonth() + 1
}
