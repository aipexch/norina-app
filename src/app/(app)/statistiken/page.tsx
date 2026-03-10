"use client";

import { useSemesters } from "@/hooks/useSemester";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { useTimetable } from "@/hooks/useTimetable";
import { useStats } from "@/hooks/useStats";
import { formatMinutes, formatDuration } from "@/lib/calculations";
import { formatDateShort } from "@/lib/date-utils";
import TopBar from "@/components/layout/TopBar";
import {
  Clock,
  TrendingUp,
  Calendar,
  Sunrise,
  Sunset,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function StatistikenPage() {
  const { activeSemester } = useSemesters();
  const { records } = useTimeRecords(activeSemester?.id ?? null);
  const { entries } = useTimetable(activeSemester?.id ?? null);
  const stats = useStats(records, entries);

  if (!activeSemester) {
    return (
      <>
        <TopBar title="Statistiken" />
        <div className="px-4 py-12 text-center text-sm text-muted">
          Bitte erstelle zuerst ein Semester in den Einstellungen.
        </div>
      </>
    );
  }

  if (stats.totalDaysTracked === 0) {
    return (
      <>
        <TopBar title="Statistiken" />
        <div className="px-4 py-12 text-center text-sm text-muted">
          Noch keine Daten vorhanden. Starte den Timer, um Statistiken zu sehen.
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Statistiken" />
      <div className="px-4 py-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            icon={<TrendingUp className="h-5 w-5 text-accent" />}
            label="Total Überstunden"
            value={formatMinutes(stats.totalOvertimeMinutes)}
          />
          <KPICard
            icon={<Calendar className="h-5 w-5 text-primary" />}
            label="Ø pro Woche"
            value={formatMinutes(stats.avgOvertimePerWeek)}
          />
          <KPICard
            icon={<Sunrise className="h-5 w-5 text-amber-500" />}
            label="Ø Ankunft"
            value={stats.avgArrivalTime}
          />
          <KPICard
            icon={<Sunset className="h-5 w-5 text-orange-500" />}
            label="Ø Abgang"
            value={stats.avgDepartureTime}
          />
          <KPICard
            icon={<Clock className="h-5 w-5 text-muted" />}
            label="Tage erfasst"
            value={`${stats.totalDaysTracked}`}
          />
          {stats.longestDay && (
            <KPICard
              icon={<Award className="h-5 w-5 text-danger" />}
              label="Längster Tag"
              value={formatDuration(stats.longestDay.minutes)}
              subtitle={formatDateShort(stats.longestDay.date)}
            />
          )}
        </div>

        {/* Day of Week Chart */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Überstunden nach Wochentag
          </h2>
          <div className="rounded-xl border border-border p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats.dayOfWeekStats.map((d) => ({
                  name: d.label,
                  überstunden: Math.round(d.avgOvertimeMinutes),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${Math.round(v)}min`}
                />
                <Tooltip
                  formatter={(value) => [`${value}min`, "Ø Überstunden"]}
                />
                <Bar
                  dataKey="überstunden"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Weekly Overtime Chart */}
        {stats.weekStats.length > 1 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Überstunden pro Woche
            </h2>
            <div className="rounded-xl border border-border p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={stats.weekStats.map((w) => ({
                    name: w.label,
                    überstunden: Math.round(w.overtimeMinutes),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${Math.round(v / 60)}h`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatMinutes(Number(value)),
                      "Überstunden",
                    ]}
                  />
                  <Bar
                    dataKey="überstunden"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Monthly Trend */}
        {stats.monthStats.length > 1 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Monatlicher Trend
            </h2>
            <div className="rounded-xl border border-border p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={stats.monthStats.map((m) => ({
                    name: m.label,
                    überstunden: Math.round(m.overtimeMinutes),
                    total: Math.round(m.totalMinutes),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${Math.round(v / 60)}h`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatDuration(Number(value)),
                      name === "überstunden" ? "Überstunden" : "Total an Schule",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="überstunden"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function KPICard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-1">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
      {subtitle && <p className="text-[10px] text-muted">{subtitle}</p>}
    </div>
  );
}
