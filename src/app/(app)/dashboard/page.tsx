"use client";

import { useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function DashboardPage() {
  const { activeSemester, loading: semesterLoading } = useSemesters();
  const { state, elapsedSeconds, startTimer, stopTimer, loading: timerLoading } = useTimer(
    activeSemester?.id ?? null
  );
  const { entries } = useTimetable(activeSemester?.id ?? null);
  const { records, refetch: refetchRecords } = useTimeRecords(activeSemester?.id ?? null);
  const [userName, setUserName] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.display_name) {
        setUserName(user.user_metadata.display_name);
      }
    }
    fetchUser();
  }, [supabase]);

  const today = todayISO();
  const todayRecords = records.filter((r) => r.date === today);
  const scheduledMinutes = getScheduledMinutesForDate(new Date(), entries);
  const totalMinutesAtSchool = getTotalMinutesAtSchool(todayRecords);
  const overtimeMinutes = totalMinutesAtSchool - scheduledMinutes;

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekRecords = records.filter((r) => new Date(r.date) >= monday);
  const weekTotalMinutes = getTotalMinutesAtSchool(weekRecords);
  const weekScheduledMinutes = Array.from({ length: 5 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day <= now ? getScheduledMinutesForDate(day, entries) : 0;
  }).reduce((a, b) => a + b, 0);
  const weekOvertime = weekTotalMinutes - weekScheduledMinutes;

  async function handleTimerToggle() {
    if (state === "idle") {
      await startTimer();
    } else {
      await stopTimer();
    }
    setTimeout(() => refetchRecords(), 500);
  }

  if (semesterLoading || timerLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          {getGreeting()}
          {userName ? `, ${userName}` : ""}
        </h1>
        <p className="text-[15px] text-muted">
          {formatWeekday(new Date())}, {formatDateShort(new Date())}
        </p>
      </div>

      {/* No semester warning */}
      {!activeSemester && (
        <Link
          href="/einstellungen"
          className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4"
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
      <div className="flex flex-col items-center rounded-2xl bg-card py-8">
        {/* Elapsed Time */}
        <p
          className={`text-[48px] font-light tabular-nums tracking-tight ${
            state === "running" ? "text-accent" : "text-muted/40"
          }`}
        >
          {formatElapsedTime(state === "running" ? elapsedSeconds : 0)}
        </p>
        <p className="mb-6 text-[13px] text-muted">
          {state === "running" ? "Timer läuft" : "Bereit"}
        </p>

        {/* Big Timer Button */}
        <button
          onClick={handleTimerToggle}
          disabled={!activeSemester}
          className={`flex h-[88px] w-[88px] items-center justify-center rounded-full shadow-xl disabled:opacity-30 ${
            state === "idle"
              ? "bg-accent text-white shadow-accent/30"
              : "bg-danger text-white shadow-danger/30"
          }`}
        >
          {state === "idle" ? (
            <Play className="ml-1 h-9 w-9" fill="currentColor" />
          ) : (
            <Square className="h-7 w-7" fill="currentColor" strokeWidth={0} />
          )}
        </button>
        <p className="mt-3 text-[13px] font-medium text-muted">
          {state === "idle" ? "Starten" : "Stoppen"}
        </p>
      </div>

      {/* Today's Summary */}
      <div className="space-y-2">
        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wider text-muted">
          Heute
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard
            icon={<BookOpen className="h-[18px] w-[18px] text-primary" />}
            value={formatDuration(scheduledMinutes)}
            label="Lektionen"
          />
          <SummaryCard
            icon={<TrendingUp className="h-[18px] w-[18px] text-muted" />}
            value={formatDuration(totalMinutesAtSchool)}
            label="An Schule"
          />
          <SummaryCard
            icon={
              <TrendingUp
                className={`h-[18px] w-[18px] ${overtimeMinutes >= 0 ? "text-accent" : "text-primary"}`}
              />
            }
            value={formatMinutes(overtimeMinutes)}
            label="Überstunden"
            highlight={overtimeMinutes > 0 ? "accent" : undefined}
          />
        </div>
      </div>

      {/* Week Summary */}
      <div className="space-y-2">
        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wider text-muted">
          Diese Woche
        </h2>
        <div className="rounded-2xl bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-muted">Überstunden</p>
              <p
                className={`text-[28px] font-bold tracking-tight ${
                  weekOvertime > 0 ? "text-accent" : weekOvertime < 0 ? "text-primary" : "text-foreground"
                }`}
              >
                {formatMinutes(weekOvertime)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-muted">An Schule</p>
              <p className="text-[22px] font-semibold tracking-tight">
                {formatDuration(weekTotalMinutes)}
              </p>
            </div>
          </div>
          {weekScheduledMinutes > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-muted">
                <span>Lektionen: {formatDuration(weekScheduledMinutes)}</span>
                <span>Total: {formatDuration(weekTotalMinutes)}</span>
              </div>
              <div className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-secondary-bg">
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
  highlight?: "accent" | "primary";
}) {
  return (
    <div
      className={`rounded-2xl p-3 text-center ${
        highlight === "accent"
          ? "bg-accent/8"
          : "bg-card"
      }`}
    >
      <div className="mb-1 flex justify-center">{icon}</div>
      <p className="text-[17px] font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
