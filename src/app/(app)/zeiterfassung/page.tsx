"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { useTimetable } from "@/hooks/useTimetable";
import { buildDailySummary, formatMinutes, formatDuration } from "@/lib/calculations";
import { formatDateShort, formatTime, formatWeekdayShort } from "@/lib/date-utils";
import { BreakSheet } from "@/components/BreakSheet";
import { Plus, X, Clock, PenLine, Trash2, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import WheelTimePicker from "@/components/WheelTimePicker";
import WheelDatePicker from "@/components/WheelDatePicker";
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
      <header className="flex items-center justify-between pt-4 pb-2 px-5">
        <h1 className="text-[28px] font-bold tracking-tight">Zeiterfassung</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>
      <div className="px-5 py-4 space-y-4">

        {!activeSemester && (
          <Link
            href="/einstellungen"
            className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 shadow-sm"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-[15px] font-semibold text-amber-900 dark:text-amber-200">
                Kein aktives Semester
              </p>
              <p className="text-[13px] text-amber-700 dark:text-amber-400">
                Erstelle oder aktiviere ein Semester in den Einstellungen, um Zeiten zu erfassen.
              </p>
            </div>
          </Link>
        )}

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
          <RecordDetailPopover
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
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
      {/* Day Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-semibold">
            {formatWeekdayShort(summary.date)}, {formatDateShort(summary.date)}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {formatDuration(summary.totalMinutesAtSchool)} an Schule · {formatDuration(summary.scheduledMinutes)} Lektionen
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            summary.overtimeMinutes > 0
              ? "bg-primary/10 text-primary"
              : summary.overtimeMinutes < 0
                ? "bg-danger/10 text-danger"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {formatMinutes(summary.overtimeMinutes)}
        </div>
      </div>

      {/* Records */}
      <div className="divide-y divide-border/30">
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
                  <span className="font-medium text-primary">läuft</span>
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

function RecordDetailPopover({
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
  const [visible, setVisible] = useState(false);
  const [editingTime, setEditingTime] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose(), 250);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    const dateStr = record.clock_in.split("T")[0];
    await onSave(new Date(dateStr + "T" + inTime + ":00").toISOString(), new Date(dateStr + "T" + outTime + ":00").toISOString());
    setSaving(false);
  }

  return (
    <>
    {editingTime && (
      <WheelTimePicker
        value={editingTime === "in" ? inTime : outTime}
        onConfirm={(val) => {
          if (editingTime === "in") setInTime(val);
          else setOutTime(val);
          setEditingTime(null);
        }}
        onCancel={() => setEditingTime(null)}
      />
    )}
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-5 transition-colors duration-250 ease-out ${
        visible ? "bg-black/30" : "bg-black/0"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`w-full max-w-sm rounded-3xl bg-card p-5 shadow-xl transition-all duration-250 ease-out ${
          visible
            ? "scale-100 opacity-100"
            : "scale-90 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">
              {formatWeekdayShort(summary.date)}, {formatDateShort(summary.date)}
            </p>
            <p className="text-[15px] font-bold">
              {formatTime(record.clock_in)} – {record.clock_out ? formatTime(record.clock_out) : "läuft"}
            </p>
          </div>
          <button onClick={handleClose} className="rounded-full bg-muted p-1.5 -mt-0.5">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Day Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatPill
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Überstunden"
            value={formatMinutes(summary.overtimeMinutes)}
            accent={summary.overtimeMinutes > 0}
          />
          <StatPill
            icon={<Clock className="h-3.5 w-3.5" />}
            label="An Schule"
            value={formatDuration(summary.totalMinutesAtSchool)}
          />
          <StatPill
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Lektionen"
            value={formatDuration(summary.scheduledMinutes)}
          />
        </div>

        {/* Edit Times */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="mb-1 block text-[12px] text-muted-foreground">Ankunft</label>
            <button
              onClick={() => setEditingTime("in")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[15px] font-medium tabular-nums active:bg-muted/50 transition-colors"
            >
              {inTime}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-muted-foreground">Abgang</label>
            <button
              onClick={() => setEditingTime("out")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[15px] font-medium tabular-nums active:bg-muted/50 transition-colors"
            >
              {outTime || "–"}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-primary py-3 text-[15px] font-medium text-white shadow-sm disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>

        {confirming ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-2xl border border-border py-2.5 text-[13px] text-muted-foreground"
            >
              Abbrechen
            </button>
            <button
              onClick={onDelete}
              className="flex-1 rounded-2xl bg-danger py-2.5 text-[13px] font-medium text-white"
            >
              Löschen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eintrag löschen
          </button>
        )}
      </div>
    </div>
    </>
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
    <div className={`rounded-2xl p-3 text-center ${accent ? "bg-primary/10" : "bg-background"}`}>
      <div className={`mb-1 flex justify-center ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
      </div>
      <p className={`text-[15px] font-semibold ${accent ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
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
  const [editingPicker, setEditingPicker] = useState<"date" | "in" | "out" | null>(null);

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
    <>
      {editingPicker === "date" && (
        <WheelDatePicker
          value={date}
          onConfirm={(val) => { setDate(val); setEditingPicker(null); }}
          onCancel={() => setEditingPicker(null)}
        />
      )}
      {editingPicker === "in" && (
        <WheelTimePicker
          value={clockIn}
          onConfirm={(val) => { setClockIn(val); setEditingPicker(null); }}
          onCancel={() => setEditingPicker(null)}
        />
      )}
      {editingPicker === "out" && (
        <WheelTimePicker
          value={clockOut}
          onConfirm={(val) => { setClockOut(val); setEditingPicker(null); }}
          onCancel={() => setEditingPicker(null)}
        />
      )}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-card p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Manueller Eintrag</h3>
          <button type="button" onClick={onCancel} className="rounded-full bg-muted p-1.5">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Datum</label>
          <button
            type="button"
            onClick={() => setEditingPicker("date")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[15px] font-medium active:bg-muted/50 transition-colors"
          >
            {formatDateLabel(date)}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Ankunft</label>
            <button
              type="button"
              onClick={() => setEditingPicker("in")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[15px] font-medium tabular-nums active:bg-muted/50 transition-colors"
            >
              {clockIn}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Abgang</label>
            <button
              type="button"
              onClick={() => setEditingPicker("out")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[15px] font-medium tabular-nums active:bg-muted/50 transition-colors"
            >
              {clockOut}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-muted-foreground">
            Notiz <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. Elternabend"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
      </form>
    </>
  );
}
