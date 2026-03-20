"use client";

import { useState } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimer } from "@/hooks/useTimer";
import { useTimetable } from "@/hooks/useTimetable";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import {
  getScheduledMinutesForDate,
  getTotalMinutesAtSchool,
  formatMinutes,
  formatDuration,
} from "@/lib/calculations";
import { formatElapsedTime, getGreeting, todayISO, formatWeekday, formatDateShort } from "@/lib/date-utils";
import { Play, Square, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import { BreakSheet } from "@/components/BreakSheet";
import Link from "next/link";

export default function DashboardPage() {
  const [breakRecordId, setBreakRecordId] = useState<string | null>(null);
  const [timerError, setTimerError] = useState<string | null>(null);
  const { activeSemester, loading: semesterLoading } = useSemesters();
  const { state, elapsedSeconds, startTimer, stopTimer, loading: timerLoading } = useTimer(
    activeSemester?.id ?? null
  );
  const { entries } = useTimetable(activeSemester?.id ?? null);
  const { records, updateRecord } = useTimeRecords(activeSemester?.id ?? null);

  const today = todayISO();
  const todayRecords = records.filter((r) => r.date === today);
  const scheduledMinutes = todayRecords.length > 0
    ? getScheduledMinutesForDate(new Date(), entries)
    : 0;
  const totalMinutesAtSchool = getTotalMinutesAtSchool(todayRecords);
  const overtimeMinutes = totalMinutesAtSchool - scheduledMinutes;

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekRecords = records.filter((r) => new Date(r.date) >= monday);
  const weekTotalMinutes = getTotalMinutesAtSchool(weekRecords);
  const trackedDatesThisWeek = new Set(weekRecords.map((r) => r.date));
  const weekScheduledMinutes = Array.from(trackedDatesThisWeek).reduce((sum, dateStr) => {
    return sum + getScheduledMinutesForDate(new Date(dateStr), entries);
  }, 0);
  const weekOvertime = weekTotalMinutes - weekScheduledMinutes;

  async function handleTimerToggle() {
    setTimerError(null);
    try {
      if (state === "idle") {
        await startTimer();
      } else {
        const id = await stopTimer();
        if (id) setBreakRecordId(id);
      }
    } catch (err) {
      setTimerError(err instanceof Error ? err.message : "Timer-Fehler");
    }
  }

  if (semesterLoading || timerLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
    {breakRecordId && (
      <BreakSheet
        onSelect={async (minutes) => {
          await updateRecord(breakRecordId, { break_minutes: minutes });
          setBreakRecordId(null);
        }}
        onSkip={() => setBreakRecordId(null)}
      />
    )}
    <div className="px-5 py-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          {getGreeting()}
        </h1>
        <p className="text-[15px] text-muted-foreground">
          {formatWeekday(new Date())}, {formatDateShort(new Date())}
        </p>
      </div>

      {/* No semester warning */}
      {!activeSemester && (
        <Link
          href="/einstellungen"
          className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 shadow-sm"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-[15px] font-semibold text-amber-900">
              Kein aktives Semester
            </p>
            <p className="text-[13px] text-amber-700">
              Tippe hier, um ein Semester zu erstellen.
            </p>
          </div>
        </Link>
      )}

      {/* Timer Section */}
      <div className="flex flex-col items-center rounded-2xl bg-card py-8 shadow-sm">
        <p
          className={`text-[48px] font-light tabular-nums tracking-tight ${
            state === "running" ? "text-primary" : "text-muted-foreground/40"
          }`}
        >
          {formatElapsedTime(state === "running" ? elapsedSeconds : 0)}
        </p>
        <p className="mb-6 text-[13px] text-muted-foreground">
          {state === "running" ? "Timer läuft" : "Bereit"}
        </p>

        <button
          onClick={handleTimerToggle}
          disabled={!activeSemester}
          className={`flex h-[88px] w-[88px] items-center justify-center rounded-full shadow-lg disabled:opacity-30 ${
            state === "idle"
              ? "bg-primary text-white shadow-primary/25"
              : "bg-danger text-white shadow-danger/25"
          }`}
        >
          {state === "idle" ? (
            <Play className="ml-1 h-9 w-9" fill="currentColor" />
          ) : (
            <Square className="h-7 w-7" fill="currentColor" strokeWidth={0} />
          )}
        </button>
        <p className="mt-3 text-[13px] font-medium text-muted-foreground">
          {state === "idle" ? "Starten" : "Stoppen"}
        </p>
        {timerError && (
          <p className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {timerError}
          </p>
        )}
      </div>

      {/* Today's Summary */}
      <div className="space-y-3">
        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Heute
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            icon={<BookOpen className="h-[18px] w-[18px] text-primary" />}
            value={formatDuration(scheduledMinutes)}
            label="Lektionen"
          />
          <SummaryCard
            icon={<TrendingUp className="h-[18px] w-[18px] text-muted-foreground" />}
            value={formatDuration(totalMinutesAtSchool)}
            label="An Schule"
          />
          <SummaryCard
            icon={
              <TrendingUp
                className={`h-[18px] w-[18px] ${overtimeMinutes >= 0 ? "text-primary" : "text-danger"}`}
              />
            }
            value={formatMinutes(overtimeMinutes)}
            label="Überstunden"
            highlight={overtimeMinutes > 0}
          />
        </div>
      </div>

      {/* Week Summary */}
      <div className="space-y-3">
        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Diese Woche
        </h2>
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-muted-foreground">Überstunden</p>
              <p
                className={`text-[28px] font-bold tracking-tight ${
                  weekOvertime > 0 ? "text-primary" : weekOvertime < 0 ? "text-danger" : "text-foreground"
                }`}
              >
                {formatMinutes(weekOvertime)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-muted-foreground">An Schule</p>
              <p className="text-[22px] font-semibold tracking-tight">
                {formatDuration(weekTotalMinutes)}
              </p>
            </div>
          </div>
          {weekScheduledMinutes > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Lektionen: {formatDuration(weekScheduledMinutes)}</span>
                <span>Total: {formatDuration(weekTotalMinutes)}</span>
              </div>
              <div className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(
                      100,
                      (weekScheduledMinutes / Math.max(weekTotalMinutes, weekScheduledMinutes)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 text-center shadow-sm ${
        highlight ? "bg-primary/10" : "bg-card"
      }`}
    >
      <div className="mb-1 flex justify-center">{icon}</div>
      <p className="text-[17px] font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
