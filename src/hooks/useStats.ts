"use client";

import { useMemo } from "react";
import { getISODay, getISOWeek, format, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import type { TimeRecord, TimetableEntry, DayOfWeek } from "@/types";
import {
  getScheduledMinutesForDate,
  getTotalMinutesAtSchool,
} from "@/lib/calculations";
import { DAY_SHORT } from "@/types";

export interface DayOfWeekStat {
  day: DayOfWeek;
  label: string;
  avgOvertimeMinutes: number;
  totalDays: number;
}

export interface DailyStat {
  date: string;
  label: string; // "Mo 7.4."
  overtimeMinutes: number;
  totalMinutes: number;
  scheduledMinutes: number;
}

export interface WeekStat {
  week: number;
  year: number;
  label: string;
  overtimeMinutes: number;
  totalMinutes: number;
  scheduledMinutes: number;
}

export interface MonthStat {
  month: string; // "2026-03"
  label: string; // "März 2026"
  overtimeMinutes: number;
  totalMinutes: number;
  scheduledMinutes: number;
}

export function useStats(records: TimeRecord[], timetableEntries: TimetableEntry[]) {
  return useMemo(() => {
    if (records.length === 0) {
      return {
        totalOvertimeMinutes: 0,
        avgOvertimePerWeek: 0,
        longestDay: null as null | { date: string; minutes: number },
        avgArrivalTime: "",
        avgDepartureTime: "",
        dayOfWeekStats: [] as DayOfWeekStat[],
        dailyStats: [] as DailyStat[],
        weekStats: [] as WeekStat[],
        monthStats: [] as MonthStat[],
        totalDaysTracked: 0,
      };
    }

    // Group records by date
    const byDate = new Map<string, TimeRecord[]>();
    for (const r of records) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date)!.push(r);
    }

    let totalOvertime = 0;
    let longestDay: { date: string; minutes: number } | null = null;
    const arrivalMinutes: number[] = [];
    const departureMinutes: number[] = [];
    const dailyStats: DailyStat[] = [];
    const dayOfWeekOvertimes: Map<DayOfWeek, number[]> = new Map();
    const weekOvertimes: Map<string, { overtime: number; total: number; scheduled: number; week: number; year: number }> = new Map();
    const monthOvertimes: Map<string, { overtime: number; total: number; scheduled: number }> = new Map();

    for (const [date, dateRecords] of byDate) {
      const dateObj = new Date(date);
      const dow = getISODay(dateObj);
      const isWeekday = dow <= 5;

      const scheduled = isWeekday ? getScheduledMinutesForDate(dateObj, timetableEntries as TimetableEntry[]) : 0;
      const totalAtSchool = getTotalMinutesAtSchool(dateRecords);
      const overtime = totalAtSchool - scheduled;
      totalOvertime += overtime;

      // Daily stat
      const dayLabel = format(dateObj, "EE d.M.", { locale: de });
      dailyStats.push({
        date,
        label: dayLabel,
        overtimeMinutes: overtime,
        totalMinutes: totalAtSchool,
        scheduledMinutes: scheduled,
      });

      // Longest day
      if (!longestDay || totalAtSchool > longestDay.minutes) {
        longestDay = { date, minutes: totalAtSchool };
      }

      // Arrival / departure
      const sorted = [...dateRecords].sort(
        (a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime()
      );
      const firstIn = new Date(sorted[0].clock_in);
      arrivalMinutes.push(firstIn.getHours() * 60 + firstIn.getMinutes());

      const lastOut = sorted.findLast((r) => r.clock_out);
      if (lastOut?.clock_out) {
        const out = new Date(lastOut.clock_out);
        departureMinutes.push(out.getHours() * 60 + out.getMinutes());
      }

      // Day of week (only weekdays for the chart)
      if (isWeekday) {
        const weekday = dow as DayOfWeek;
        if (!dayOfWeekOvertimes.has(weekday)) dayOfWeekOvertimes.set(weekday, []);
        dayOfWeekOvertimes.get(weekday)!.push(overtime);
      }

      // Week
      const weekNum = getISOWeek(dateObj);
      const yearNum = dateObj.getFullYear();
      const weekKey = `${yearNum}-W${weekNum}`;
      if (!weekOvertimes.has(weekKey)) {
        weekOvertimes.set(weekKey, { overtime: 0, total: 0, scheduled: 0, week: weekNum, year: yearNum });
      }
      const wk = weekOvertimes.get(weekKey)!;
      wk.overtime += overtime;
      wk.total += totalAtSchool;
      wk.scheduled += scheduled;

      // Month
      const monthKey = format(dateObj, "yyyy-MM");
      if (!monthOvertimes.has(monthKey)) {
        monthOvertimes.set(monthKey, { overtime: 0, total: 0, scheduled: 0 });
      }
      const mo = monthOvertimes.get(monthKey)!;
      mo.overtime += overtime;
      mo.total += totalAtSchool;
      mo.scheduled += scheduled;
    }

    const totalDaysTracked = byDate.size;
    const weeks = weekOvertimes.size;

    // Day of week stats
    const dayOfWeekStats: DayOfWeekStat[] = ([1, 2, 3, 4, 5] as DayOfWeek[]).map((day) => {
      const overtimes = dayOfWeekOvertimes.get(day) ?? [];
      const avg = overtimes.length > 0
        ? overtimes.reduce((a, b) => a + b, 0) / overtimes.length
        : 0;
      return { day, label: DAY_SHORT[day], avgOvertimeMinutes: avg, totalDays: overtimes.length };
    });

    // Week stats (sorted by week)
    const weekStats: WeekStat[] = Array.from(weekOvertimes.entries())
      .map(([key, val]) => {
        // Build a date from ISO week to get the Monday
        const monday = startOfWeek(new Date(val.year, 0, 4 + (val.week - 1) * 7), { weekStartsOn: 1 });
        const sunday = endOfWeek(monday, { weekStartsOn: 1 });
        const monDay = format(monday, "d.", { locale: de });
        const sunDay = format(sunday, "d. MMM", { locale: de });
        return {
          week: val.week,
          year: val.year,
          label: `${monDay}–${sunDay}`,
          overtimeMinutes: val.overtime,
          totalMinutes: val.total,
          scheduledMinutes: val.scheduled,
        };
      })
      .sort((a, b) => a.year - b.year || a.week - b.week);

    // Month stats (sorted)
    const monthStats: MonthStat[] = Array.from(monthOvertimes.entries())
      .map(([key, val]) => ({
        month: key,
        label: format(new Date(key + "-01"), "MMM yyyy", { locale: de }),
        overtimeMinutes: val.overtime,
        totalMinutes: val.total,
        scheduledMinutes: val.scheduled,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Average arrival/departure
    const avgArr = arrivalMinutes.length > 0
      ? Math.round(arrivalMinutes.reduce((a, b) => a + b, 0) / arrivalMinutes.length)
      : 0;
    const avgDep = departureMinutes.length > 0
      ? Math.round(departureMinutes.reduce((a, b) => a + b, 0) / departureMinutes.length)
      : 0;

    const formatMinOfDay = (min: number) =>
      `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`;

    // Sort daily stats by date
    dailyStats.sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalOvertimeMinutes: totalOvertime,
      avgOvertimePerWeek: weeks > 0 ? totalOvertime / weeks : 0,
      longestDay,
      avgArrivalTime: avgArr > 0 ? formatMinOfDay(avgArr) : "–",
      avgDepartureTime: avgDep > 0 ? formatMinOfDay(avgDep) : "–",
      dayOfWeekStats,
      dailyStats,
      weekStats,
      monthStats,
      totalDaysTracked,
    };
  }, [records, timetableEntries]);
}
