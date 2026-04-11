import { getISODay } from "date-fns";
import type { TimetableEntry, TimeRecord, DailySummary, DayOfWeek } from "@/types";

/**
 * Berechnet die geplanten Lektionsminuten für ein bestimmtes Datum
 */
export function getScheduledMinutesForDate(
  date: Date,
  timetableEntries: TimetableEntry[]
): number {
  const dayOfWeek = getISODay(date) as DayOfWeek;
  if (dayOfWeek > 5) return 0; // Wochenende

  const entries = timetableEntries.filter((e) => e.day_of_week === dayOfWeek);
  return entries.reduce((sum, entry) => {
    const [startH, startM] = entry.start_time.split(":").map(Number);
    const [endH, endM] = entry.end_time.split(":").map(Number);
    return sum + (endH * 60 + endM) - (startH * 60 + startM);
  }, 0);
}

/**
 * Berechnet die totalen Minuten an der Schule aus Time Records
 */
export function getTotalMinutesAtSchool(
  records: TimeRecord[],
  now?: Date
): number {
  return records.reduce((sum, record) => {
    const clockIn = new Date(record.clock_in);
    const clockOut = record.clock_out
      ? new Date(record.clock_out)
      : (now ?? new Date());
    const gross = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
    return sum + gross - (record.break_minutes ?? 0);
  }, 0);
}

/**
 * Berechnet die Überstunden für einen Tag
 */
export function calculateDailyOvertime(
  records: TimeRecord[],
  scheduledMinutes: number,
  now?: Date
): number {
  const totalMinutes = getTotalMinutesAtSchool(records, now);
  return totalMinutes - scheduledMinutes;
}

/**
 * Erstellt eine Tageszusammenfassung
 */
export function buildDailySummary(
  date: string,
  records: TimeRecord[],
  timetableEntries: TimetableEntry[],
  now?: Date
): DailySummary {
  const dateObj = new Date(date + "T00:00:00");
  const scheduledMinutes = getScheduledMinutesForDate(dateObj, timetableEntries);
  const totalMinutesAtSchool = getTotalMinutesAtSchool(records, now);
  const isRunning = records.some((r) => r.clock_out === null);

  return {
    date,
    totalMinutesAtSchool,
    scheduledMinutes,
    overtimeMinutes: totalMinutesAtSchool - scheduledMinutes,
    records,
    isRunning,
  };
}

/**
 * Formatiert Minuten als "Xh Ymin"
 */
export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;

  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

/**
 * Formatiert Minuten als "Xh Ymin" ohne Vorzeichen
 */
export function formatDuration(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;

  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
