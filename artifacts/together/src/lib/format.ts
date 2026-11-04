import { differenceInCalendarDays, differenceInMonths, differenceInMinutes, formatDistanceToNowStrict } from "date-fns";

export function fmtTime(iso?: string | null, tz?: string | null) {
  if (!iso) return "No time recorded";
  const d = new Date(iso);
  if (isNaN(+d)) return "No time recorded";
  try {
    return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz || undefined });
  } catch {
    return d.toLocaleString();
  }
}
export function fmtClock(iso?: string | null, tz?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz || undefined });
  } catch {
    return new Date(iso).toLocaleTimeString();
  }
}
export function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
export function ago(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  const m = differenceInMinutes(new Date(), d);
  if (m < 1 && m > -1) return "just now";
  return m >= 0 ? `${formatDistanceToNowStrict(d)} ago` : `in ${formatDistanceToNowStrict(d)}`;
}
export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fromLocalInput(v: string) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(+d) ? undefined : d.toISOString();
}
export function pregnancyWeek(dueDate?: string | null) {
  if (!dueDate) return null;
  const days = differenceInCalendarDays(new Date(dueDate + (dueDate.length === 10 ? "T12:00:00" : "")), new Date());
  const w = Math.floor((280 - days) / 7);
  return w >= 1 && w <= 43 ? w : null;
}
export function babyAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate + (birthDate.length === 10 ? "T12:00:00" : ""));
  if (!Number.isFinite(birth.getTime())) return null;
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = differenceInCalendarDays(now, birth);
  if (days < 0) return null;
  const weeks = Math.floor(days / 7);
  const months = differenceInMonths(now, birth);
  return { days, weeks, months, label: days < 14 ? `${days} days old` : weeks < 13 ? `${weeks} weeks old` : `${months} months old` };
}
export function minutesLabel(min?: number | string | null) {
  const n = Number(min);
  if (!n || isNaN(n)) return "";
  if (n < 60) return `${Math.round(n)} min`;
  return `${Math.floor(n / 60)} h ${Math.round(n % 60)} min`;
}
export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
