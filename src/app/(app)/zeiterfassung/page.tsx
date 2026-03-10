"use client";

import { useState, useMemo } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { useTimetable } from "@/hooks/useTimetable";
import { buildDailySummary, formatMinutes, formatDuration } from "@/lib/calculations";
import { formatDateShort, formatTime, formatWeekdayShort } from "@/lib/date-utils";
import TopBar from "@/components/layout/TopBar";
import { BreakSheet } from "@/components/BreakSheet";
import { Plus, X, Clock, PenLine, Trash2, BookOpen, TrendingUp } from "lucide-react";
import type { DailySummary, TimeRecord } from "@/types";

export default function ZeiterfassungPage() {
  const { activeSemester } = useSemesters();
  const {
    records,
    loading,
    addManualRecord,
    updateRecord,
    deleteRecord,
  } = useTimeRecords(activeSemester?.id ?? null);
  const { entries } = useTimetable(activeSemester?.id ?? null);
  const [showForm, setShowForm] = useState(false);
  const [breakRecordId, setBreakRecordId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{
    record: TimeRecord;
    summary: DailySummary;
  } | null>(null);

  const dailySummaries = useMemo(() => {
    const dateMap = new Map<string, typeof records>();
    for (const record of records) {
      if (!dateMap.has(record.date)) dateMap.set(record.date, []);
      dateMap.get(record.date)!.push(record);
    }
    const summaries: DailySummary[] = [];
    for (const [date, dateRecords] of dateMap) {
      summaries.push(buildDailySummary(date, dateRecords, entries));
    }
    return summaries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [records, entries]);

  return (
    <>
      <TopBar title="Zeiterfassung" />
      <div className="px-4 py-4 space-y-4">
        {/* Add Manual Entry */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Manueller Eintrag
          </button>
        </div>

        {showForm && (
          <ManualEntryForm
            onSave={async (data) => {
              const record = await addManualRecord(data);
              setShowForm(false);
              setBreakRecordId(record.id);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {breakRecordId && (
          <BreakSheet
            onSelect={async (minutes) => {
              await updateRecord(breakRecordId, { break_minutes: minutes });
              setBreakRecordId(null);
            }}
            onSkip={() => setBreakRecordId(null)}
          />
        )}

        {selectedDetail && (
          <RecordDetailSheet
            record={selectedDetail.record}
            summary={selectedDetail.summary}
            onSave={async (clockIn, clockOut) => {
              await updateRecord(selectedDetail.record.id, {
                clock_in: clockIn,
                clock_out: clockOut,
              });
              setSelectedDetail(null);
            }}
            onDelete={async () => {
              await deleteRecord(selectedDetail.record.id);
              setSelectedDetail(null);
            }}
            onClose={() => setSelectedDetail(null)}
          />
        )}

        {/* Daily Summaries */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : dailySummaries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Noch keine Zeiteinträge vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {dailySummaries.map((summary) => (
              <DaySummaryCard
                key={summary.date}
                summary={summary}
                onRecordSelect={(record) => setSelectedDetail({ record, summary })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DaySummaryCard({
  summary,
  onRecordSelect,
}: {
  summary: DailySummary;
  onRecordSelect: (record: TimeRecord) => void;
}) {
  return (
    <div className="rounded-xl border border-border">
      {/* Day Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-medium">
            {formatWeekdayShort(summary.date)}, {formatDateShort(summary.date)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(summary.totalMinutesAtSchool)} an Schule ·{" "}
            {formatDuration(summary.scheduledMinutes)} Lektionen
          </p>
        </div>
        <div
          className={`rounded-lg px-2.5 py-1 text-sm font-bold ${
            summary.overtimeMinutes > 0
              ? "bg-accent/10 text-accent"
              : summary.overtimeMinutes < 0
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-muted-foreground"
          }`}
        >
          {formatMinutes(summary.overtimeMinutes)}
        </div>
      </div>

      {/* Records */}
      <div className="divide-y divide-border/50">
        {summary.records.map((record) => (
          <button
            key={record.id}
            onClick={() => onRecordSelect(record)}
            className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">
                {formatTime(record.clock_in)} –{" "}
                {record.clock_out ? formatTime(record.clock_out) : (
                  <span className="font-medium text-accent">läuft</span>
                )}
              </span>
              {record.is_manual && (
                <span title="Manuell eingegeben">
                  <PenLine className="h-3 w-3 text-muted-foreground" />
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecordDetailSheet({
  record,
  summary,
  onSave,
  onDelete,
  onClose,
}: {
  record: TimeRecord;
  summary: DailySummary;
  onSave: (clockIn: string, clockOut: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const toTimeStr = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const [inTime, setInTime] = useState(toTimeStr(record.clock_in));
  const [outTime, setOutTime] = useState(record.clock_out ? toTimeStr(record.clock_out) : "");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleSave() {
    setSaving(true);
    const dateStr = record.clock_in.split("T")[0];
    await onSave(`${dateStr}T${inTime}:00`, `${dateStr}T${outTime}:00`);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full rounded-t-2xl bg-background px-4 pb-10 pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">
            {formatWeekdayShort(summary.date)}, {formatDateShort(summary.date)}
          </h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Day Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatPill
            icon={<TrendingUp className="h-4 w-4" />}
            label="Überstunden"
            value={formatMinutes(summary.overtimeMinutes)}
            accent={summary.overtimeMinutes > 0}
          />
          <StatPill
            icon={<Clock className="h-4 w-4" />}
            label="An Schule"
            value={formatDuration(summary.totalMinutesAtSchool)}
          />
          <StatPill
            icon={<BookOpen className="h-4 w-4" />}
            label="Lektionen"
            value={formatDuration(summary.scheduledMinutes)}
          />
        </div>

        {/* Edit Times */}
        <div className="rounded-xl bg-card p-4 space-y-3">
          <p className="text-[13px] font-medium text-muted-foreground">Zeiten bearbeiten</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] text-muted-foreground">Ankunft</label>
              <input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-muted-foreground">Abgang</label>
              <input
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 w-full rounded-xl bg-primary py-3 text-[15px] font-medium text-white disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>

        {/* Delete */}
        {confirming ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border border-border py-3 text-[14px] text-muted-foreground"
            >
              Abbrechen
            </button>
            <button
              onClick={onDelete}
              className="flex-1 rounded-xl bg-danger py-3 text-[14px] font-medium text-white"
            >
              Löschen bestätigen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-3 text-[14px] text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Eintrag löschen
          </button>
        )}
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 text-center ${accent ? "bg-accent/8" : "bg-card"}`}>
      <div className={`mb-1 flex justify-center ${accent ? "text-accent" : "text-muted-foreground"}`}>
        {icon}
      </div>
      <p className={`text-[15px] font-semibold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ManualEntryForm({
  onSave,
  onCancel,
}: {
  onSave: (data: { date: string; clock_in: string; clock_out: string; notes?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [clockIn, setClockIn] = useState("07:30");
  const [clockOut, setClockOut] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      date,
      clock_in: `${date}T${clockIn}:00`,
      clock_out: `${date}T${clockOut}:00`,
      notes: notes || undefined,
    });
    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Manueller Eintrag</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Datum</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Ankunft</label>
          <input
            type="time"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Abgang</label>
          <input
            type="time"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Notiz <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="z.B. Elternabend"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Speichern..." : "Speichern"}
      </button>
    </form>
  );
}
