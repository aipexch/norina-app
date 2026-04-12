import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  if (!date) return "–";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "–";
  return format(d, "dd. MMMM yyyy", { locale: de });
}

export function formatDateShort(date: Date | string): string {
  if (!date) return "–";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "–";
  return format(d, "dd.MM.yyyy", { locale: de });
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "HH:mm", { locale: de });
}

export function formatWeekday(date: Date | string): string {
  return format(new Date(date), "EEEE", { locale: de });
}

export function formatWeekdayShort(date: Date | string): string {
  return format(new Date(date), "EE", { locale: de });
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { locale: de, addSuffix: true });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Guten Morgen";
  if (hour < 17) return "Guten Nachmittag";
  return "Guten Abend";
}

export function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}
