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
import dynamic from "next/dynamic";

const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-foreground/90 px-3 py-2 text-[12px] text-white shadow-lg backdrop-blur">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-semibold">{typeof p.value === "number" ? (Math.abs(p.value) >= 60 ? formatDuration(Math.abs(p.value)) : `${Math.round(p.value)}min`) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function StatistikenPage() {
  const { activeSemester, loading: semesterLoading } = useSemesters();
  const { records, loading: recordsLoading } = useTimeRecords(activeSemester?.id ?? null);
  const { entries, loading: timetableLoading } = useTimetable(activeSemester?.id ?? null);
  const stats = useStats(records, entries);

  if (semesterLoading || recordsLoading || timetableLoading) {
    return (
      <>
        <TopBar title="Statistiken" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (!activeSemester) {
    return (
      <>
        <TopBar title="Statistiken" />
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          Bitte erstelle zuerst ein Semester in den Einstellungen.
        </div>
      </>
    );
  }

  if (stats.totalDaysTracked === 0) {
    return (
      <>
        <TopBar title="Statistiken" />
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          Noch keine Daten vorhanden. Starte den Timer, um Statistiken zu sehen.
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Statistiken" />
      <div className="px-5 py-4 space-y-6">

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-2">
          <KPIMini
            icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
            label="Überstunden"
            value={formatMinutes(stats.totalOvertimeMinutes)}
          />
          <KPIMini
            icon={<Calendar className="h-3.5 w-3.5 text-primary" />}
            label="Ø / Woche"
            value={formatMinutes(stats.avgOvertimePerWeek)}
          />
          <KPIMini
            icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Tage"
            value={`${stats.totalDaysTracked}`}
          />
          <KPIMini
            icon={<Sunrise className="h-3.5 w-3.5 text-amber-500" />}
            label="Ø Ankunft"
            value={stats.avgArrivalTime}
          />
          <KPIMini
            icon={<Sunset className="h-3.5 w-3.5 text-orange-500" />}
            label="Ø Abgang"
            value={stats.avgDepartureTime}
          />
          {stats.longestDay ? (
            <KPIMini
              icon={<Award className="h-3.5 w-3.5 text-danger" />}
              label="Max Tag"
              value={formatDuration(stats.longestDay.minutes)}
            />
          ) : (
            <div />
          )}
        </div>

        {/* Day of Week Chart — Overtime + Total */}
        <section>
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wochentag-Vergleich
          </h2>
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.dayOfWeekStats.map((d) => ({
                  name: d.label,
                  überstunden: Math.round(d.avgOvertimeMinutes),
                  tage: d.totalDays,
                }))}
                barGap={2}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}min`}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)", radius: 8 }} />
                <Bar
                  dataKey="überstunden"
                  name="Ø Überstunden"
                  fill="#15803D"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Daily Overview Chart */}
        <section>
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tagesübersicht
          </h2>
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(stats.dailyStats ?? []).map((d) => ({
                  name: d.label,
                  überstunden: Math.round(d.overtimeMinutes),
                  lektionen: Math.round(d.scheduledMinutes),
                  total: Math.round(d.totalMinutes),
                }))}
                barGap={2}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v) => `${Math.round(v / 60)}h`}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)", radius: 8 }} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-[11px] text-muted-foreground">{value}</span>}
                />
                <Bar
                  dataKey="lektionen"
                  name="Lektionen"
                  fill="#BBF7D0"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="überstunden"
                  name="Überstunden"
                  fill="#15803D"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Cumulative Overtime Trend */}
        {stats.weekStats.length > 1 && (
          <section>
            <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kumulierte Überstunden
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={(() => {
                    let cumulative = 0;
                    return stats.weekStats.map((w) => {
                      cumulative += w.overtimeMinutes;
                      return {
                        name: w.label,
                        kumuliert: Math.round(cumulative),
                      };
                    });
                  })()}
                >
                  <defs>
                    <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15803D" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#15803D" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickFormatter={(v) => v >= 60 || v <= -60 ? `${Math.round(v / 60)}h` : `${v}min`}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="kumuliert"
                    name="Total"
                    stroke="#15803D"
                    strokeWidth={2.5}
                    fill="url(#gradientGreen)"
                    dot={{ r: 4, fill: "#15803D", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#15803D", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Monthly Trend */}
        {stats.monthStats.length > 1 && (
          <section>
            <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Monatlicher Trend
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats.monthStats.map((m) => ({
                    name: m.label,
                    überstunden: Math.round(m.overtimeMinutes),
                    total: Math.round(m.totalMinutes),
                    lektionen: Math.round(m.scheduledMinutes),
                  }))}
                  barGap={2}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickFormatter={(v) => `${Math.round(v / 60)}h`}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)", radius: 8 }} />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-[11px] text-muted-foreground">{value}</span>}
                  />
                  <Bar
                    dataKey="total"
                    name="Total an Schule"
                    fill="#BBF7D0"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="überstunden"
                    name="Überstunden"
                    fill="#15803D"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function KPIMini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-card px-3 py-2.5 shadow-sm">
      <div className="mb-1">{icon}</div>
      <p className="text-[15px] font-bold tracking-tight leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
