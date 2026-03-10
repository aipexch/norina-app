"use client";

import { useState, useMemo } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { useTimetable } from "@/hooks/useTimetable";
import { buildDailySummary, formatMinutes, formatDuration } from "@/lib/calculations";
import { formatDateShort, formatTime, formatWeekdayShort } from "@/lib/date-utils";
import TopBar from "@/components/layout/TopBar";
import { Plus, Trash2, Edit2, X, Clock, PenLine } from "lucide-react";
import type { DailySummary } from "@/types";

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

  // Group records by date into daily summaries
  const dailySummaries = useMemo(() => {
    const dateMap = new Map<string, typeof records>();
    for (const record of records) {
      if (!dateMap.has(record.date)) {
        dateMap.set(record.date, []);
      }
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
              await addManualRecord(data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Daily Summaries */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : dailySummaries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            Noch keine Zeiteinträge vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {dailySummaries.map((summary) => (
              <DaySummaryCard
                key={summary.date}
                summary={summary}
                onDelete={deleteRecord}
                onUpdate={updateRecord}
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
  onDelete,
  onUpdate,
}: {
  summary: DailySummary;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: { clock_in?: string; clock_out?: string }) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border">
      {/* Day Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-medium">
            {formatWeekdayShort(summary.date)}, {formatDateShort(summary.date)}
          </p>
          <p className="text-xs text-muted">
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
                : "bg-gray-100 text-muted"
          }`}
        >
          {formatMinutes(summary.overtimeMinutes)}
        </div>
      </div>

      {/* Records */}
      <div className="divide-y divide-border/50">
        {summary.records.map((record) => (
          <div key={record.id} className="flex items-center justify-between px-4 py-2.5">
            {editingId === record.id ? (
              <EditRecordInline
                clockIn={record.clock_in}
                clockOut={record.clock_out}
                onSave={async (clockIn, clockOut) => {
                  await onUpdate(record.id, { clock_in: clockIn, clock_out: clockOut });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted" />
                  <span className="text-sm">
                    {formatTime(record.clock_in)} –{" "}
                    {record.clock_out ? formatTime(record.clock_out) : (
                      <span className="font-medium text-accent">läuft</span>
                    )}
                  </span>
                  {record.is_manual && (
                    <span title="Manuell eingegeben"><PenLine className="h-3 w-3 text-muted" /></span>
                  )}
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => setEditingId(record.id)}
                    className="rounded p-1.5 text-muted hover:text-primary"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Eintrag löschen?")) onDelete(record.id);
                    }}
                    className="rounded p-1.5 text-muted hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditRecordInline({
  clockIn,
  clockOut,
  onSave,
  onCancel,
}: {
  clockIn: string;
  clockOut: string | null;
  onSave: (clockIn: string, clockOut: string) => Promise<void>;
  onCancel: () => void;
}) {
  const toTimeStr = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const [inTime, setInTime] = useState(toTimeStr(clockIn));
  const [outTime, setOutTime] = useState(clockOut ? toTimeStr(clockOut) : "");

  async function handleSave() {
    const dateStr = clockIn.split("T")[0];
    const newClockIn = `${dateStr}T${inTime}:00`;
    const newClockOut = `${dateStr}T${outTime}:00`;
    await onSave(newClockIn, newClockOut);
  }

  return (
    <div className="flex w-full items-center gap-2">
      <input
        type="time"
        value={inTime}
        onChange={(e) => setInTime(e.target.value)}
        className="w-24 rounded border border-border px-2 py-1 text-sm"
      />
      <span className="text-muted">–</span>
      <input
        type="time"
        value={outTime}
        onChange={(e) => setOutTime(e.target.value)}
        className="w-24 rounded border border-border px-2 py-1 text-sm"
      />
      <button
        onClick={handleSave}
        className="rounded bg-primary px-2 py-1 text-xs text-white"
      >
        OK
      </button>
      <button onClick={onCancel} className="text-muted">
        <X className="h-4 w-4" />
      </button>
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
        <button type="button" onClick={onCancel} className="text-muted">
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
          Notiz <span className="text-muted">(optional)</span>
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
